from typing import List, Dict, Any, Optional, Tuple
import logging
from app.services.body_region_service import BodyRegion

logger = logging.getLogger("ai-service.false_positive_guard")

class FalsePositiveGuard:
    """
    Biological and Spatial Plausibility Guard for Accessory Detection.
    Guards against hallucination by verifying that micro-objects and accessories
    strictly conform to human anatomy (e.g. rejecting watches on heads, necklaces on feet).
    """
    _instance: Optional["FalsePositiveGuard"] = None

    @classmethod
    def get_instance(cls) -> "FalsePositiveGuard":
        if cls._instance is None:
            cls._instance = FalsePositiveGuard()
        return cls._instance

    @staticmethod
    def _box_intersection_ratio(boxA: List[int], boxB: List[int]) -> float:
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])

        interW = max(0, xB - xA)
        interH = max(0, yB - yA)
        interArea = interW * interH

        areaA = max(1, (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]))
        return interArea / float(areaA)

    def filter_accessories(
        self,
        candidate_accessories: List[Dict[str, Any]],
        regions: List[BodyRegion],
        person_bbox_orig: List[int]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Filters candidate accessory detections for a person against their anatomical body regions.
        Returns:
            (validated_accessories, rejected_accessories)
        """
        validated = []
        rejected = []

        region_map = {r.name: r for r in regions}
        ox1, oy1, ox2, oy2 = person_bbox_orig
        person_h = max(1, oy2 - oy1)

        for item in candidate_accessories:
            label = item.get("label", "").lower()
            box = item.get("bbox", [])
            if len(box) != 4:
                continue

            # Calculate relative vertical height inside person bounding box
            center_y = (box[1] + box[3]) / 2.0
            rel_y = (center_y - oy1) / float(person_h)

            is_valid = True
            rejection_reason = ""
            matched_region = "unknown"

            # 1. Ear accessories (airpods, earbuds, earrings)
            if any(e in label for e in ["airpod", "earbud", "earring"]):
                l_ear = region_map.get("LEFT_EAR")
                r_ear = region_map.get("RIGHT_EAR")
                head = region_map.get("HEAD")

                inter_l = self._box_intersection_ratio(box, l_ear.box_in_orig) if l_ear else 0.0
                inter_r = self._box_intersection_ratio(box, r_ear.box_in_orig) if r_ear else 0.0
                inter_head = self._box_intersection_ratio(box, head.box_in_orig) if head else 0.0

                if inter_l > 0.15:
                    matched_region = "left_ear"
                elif inter_r > 0.15:
                    matched_region = "right_ear"
                elif inter_head > 0.20 or rel_y < 0.25:
                    matched_region = "head"
                else:
                    is_valid = False
                    rejection_reason = f"{label} detected outside ear/head region (rel_y={rel_y:.2f})"

            # 2. Eye / Head accessories (glasses, sunglasses, hat)
            elif any(g in label for g in ["glasses", "sunglass", "hat", "cap", "beanie"]):
                head = region_map.get("HEAD")
                inter_head = self._box_intersection_ratio(box, head.box_in_orig) if head else 0.0

                if inter_head > 0.20 or rel_y <= 0.28:
                    matched_region = "head"
                else:
                    is_valid = False
                    rejection_reason = f"{label} detected outside head region (rel_y={rel_y:.2f})"

            # 3. Neck accessories (necklace, chain, pendant, choker)
            elif any(n in label for n in ["necklace", "chain", "pendant", "choker"]):
                neck = region_map.get("NECK")
                inter_neck = self._box_intersection_ratio(box, neck.box_in_orig) if neck else 0.0

                if inter_neck > 0.15 or (0.15 <= rel_y <= 0.38):
                    matched_region = "neck"
                else:
                    is_valid = False
                    rejection_reason = f"{label} detected outside neck/chest region (rel_y={rel_y:.2f})"

            # 4. Wrist accessories (watch, smartwatch, bracelet)
            elif any(w in label for w in ["watch", "smartwatch", "bracelet"]):
                l_wrist = region_map.get("LEFT_WRIST")
                r_wrist = region_map.get("RIGHT_WRIST")

                inter_lw = self._box_intersection_ratio(box, l_wrist.box_in_orig) if l_wrist else 0.0
                inter_rw = self._box_intersection_ratio(box, r_wrist.box_in_orig) if r_wrist else 0.0

                # Reject watches on heads or feet!
                if rel_y < 0.15 or rel_y > 0.85:
                    is_valid = False
                    rejection_reason = f"{label} anatomically impossible at rel_y={rel_y:.2f}"
                elif inter_lw > 0.15:
                    matched_region = "left_wrist"
                elif inter_rw > 0.15:
                    matched_region = "right_wrist"
                else:
                    matched_region = "wrist"

            # 5. Hand accessories (ring, phone)
            elif any(h_acc in label for h_acc in ["ring", "phone", "keys"]):
                # Ring or phone cannot be on top of head or bottom of feet
                if rel_y < 0.18 or rel_y > 0.88:
                    is_valid = False
                    rejection_reason = f"{label} detected outside hand operating zone (rel_y={rel_y:.2f})"
                else:
                    matched_region = "hand"

            # 6. Waist accessories (belt, wallet)
            elif "belt" in label:
                if 0.38 <= rel_y <= 0.70:
                    matched_region = "waist"
                else:
                    is_valid = False
                    rejection_reason = f"belt detected outside waist boundary (rel_y={rel_y:.2f})"

            if is_valid:
                item_copy = dict(item)
                item_copy["body_region"] = matched_region
                validated.append(item_copy)
            else:
                rejected.append({
                    "item": item,
                    "reason": rejection_reason
                })
                logger.info(f"[FalsePositiveGuard] Rejected: {rejection_reason}")

        return validated, rejected

def get_false_positive_guard() -> FalsePositiveGuard:
    return FalsePositiveGuard.get_instance()
