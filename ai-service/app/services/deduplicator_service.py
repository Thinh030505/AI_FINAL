from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger("ai-service.deduplicator")

# Semantic synonym clusters for merging cross-model detections
SYNONYM_GROUPS = [
    {"glasses", "sunglasses", "eyewear", "spectacles"},
    {"airpods", "earbuds", "wireless earbuds", "headphones", "earphones"},
    {"necklace", "chain", "chain necklace", "pendant", "choker"},
    {"watch", "smartwatch", "wristwatch", "wrist watch"},
    {"bracelet", "bangle", "wristband"},
    {"ring", "finger ring"},
    {"cell phone", "phone", "smartphone", "mobile phone"},
    {"handbag", "bag", "backpack", "shoulder bag", "purse"},
    {"shoes", "sneakers", "footwear", "boots"},
    {"shirt", "t-shirt", "tshirt", "top"},
    {"jacket", "hoodie", "coat", "outerwear"},
    {"pants", "jeans", "trousers"},
]

class DetectionDeduplicator:
    """
    Detection Deduplicator.
    Merges overlapping detections across standard YOLO, Custom YOLO, YOLO-World, and Grounding DINO
    using Intersection-over-Union (IoU), semantic synonym resolution, and confidence fusion.
    """
    _instance: Optional["DetectionDeduplicator"] = None

    @classmethod
    def get_instance(cls) -> "DetectionDeduplicator":
        if cls._instance is None:
            cls._instance = DetectionDeduplicator()
        return cls._instance

    @staticmethod
    def _compute_iou(boxA: List[int], boxB: List[int]) -> float:
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])

        interW = max(0, xB - xA)
        interH = max(0, yB - yA)
        interArea = interW * interH

        areaA = max(1, (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]))
        areaB = max(1, (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]))

        return interArea / float(areaA + areaB - interArea)

    def _are_synonyms(self, labelA: str, labelB: str) -> bool:
        la = labelA.lower().strip()
        lb = labelB.lower().strip()
        if la == lb:
            return True

        for group in SYNONYM_GROUPS:
            if la in group and lb in group:
                return True
        return False

    def deduplicate(
        self,
        detections: List[Dict[str, Any]],
        iou_threshold: float = 0.45
    ) -> List[Dict[str, Any]]:
        """
        Takes raw list of detections from multiple models:
        [
          {"label": "watch", "confidence": 0.81, "bbox": [...], "source_model": "yolo"},
          {"label": "smartwatch", "confidence": 0.86, "bbox": [...], "source_model": "yolo_world"}
        ]
        Merges duplicates and returns unified list.
        """
        if not detections:
            return []

        # Sort by confidence descending
        sorted_dets = sorted(detections, key=lambda d: d.get("confidence", 0.0), reverse=True)
        merged_results: List[Dict[str, Any]] = []

        for det in sorted_dets:
            box = det.get("bbox", [])
            label = det.get("label", "")
            source = det.get("source_model", "detector")

            matched = False
            for existing in merged_results:
                ex_box = existing.get("bbox", [])
                ex_label = existing.get("label", "")

                # Check IoU and semantic compatibility
                iou = self._compute_iou(box, ex_box)
                same_label = self._are_synonyms(label, ex_label)
                same_region = (
                    det.get("body_region") is not None
                    and det.get("body_region") == existing.get("body_region")
                )

                if (iou >= iou_threshold and same_label) or (iou >= 0.65 and same_region):
                    matched = True
                    # Merge source models
                    sources = existing.setdefault("source_models", [existing.get("source_model", "detector")])
                    if source not in sources:
                        sources.append(source)

                    # Multi-model confidence reinforcement
                    c_old = existing.get("confidence", 0.7)
                    c_new = det.get("confidence", 0.7)
                    fused_conf = min(0.99, max(c_old, c_new) + (0.05 * min(c_old, c_new)))
                    existing["confidence"] = round(float(fused_conf), 3)

                    # Keep more descriptive/fine-grained label if available
                    if len(label) > len(ex_label) and label in ["smartwatch", "sunglasses", "wireless earbuds", "airpods"]:
                        existing["label"] = label
                        existing["display_name"] = det.get("display_name", label)

                    break

            if not matched:
                item = dict(det)
                item["source_models"] = [source]
                merged_results.append(item)

        return merged_results

def get_detection_deduplicator() -> DetectionDeduplicator:
    return DetectionDeduplicator.get_instance()
