import logging
from typing import List, Optional
from app.models.smart_camera_model import RealtimeDetection

logger = logging.getLogger("ai-service.fusion")

SYNONYM_GROUPS = [
    {"person", "human", "man", "woman", "person_crop"},
    {"cell phone", "phone", "mobile phone", "smartphone"},
    {"headphones", "headphone", "earphones", "headset"},
    {"glasses", "eyeglasses", "spectacles", "sunglasses"},
    {"potted plant", "houseplant", "plant"},
    {"laptop", "notebook", "computer"},
]

def are_labels_equivalent(l1: str, l2: str) -> bool:
    s1 = l1.lower().strip()
    s2 = l2.lower().strip()
    if s1 == s2:
        return True
    for group in SYNONYM_GROUPS:
        if s1 in group and s2 in group:
            return True
    return False

class DetectionFusionEngine:
    """
    Fuses multiple heterogeneous detection sources without naive cross-model NMS.
    Preserves fine-grained and nested parent-child boxes (e.g. eye within face within head within person).
    Deduplicates only genuine duplicate detections representing the same semantic entity.
    """
    _instance: Optional["DetectionFusionEngine"] = None

    @classmethod
    def get_instance(cls) -> "DetectionFusionEngine":
        if cls._instance is None:
            cls._instance = DetectionFusionEngine()
        return cls._instance

    def fuse_detections(
        self,
        general_detections: List[RealtimeDetection],
        specialist_detections: List[RealtimeDetection],
        open_vocab_detections: List[RealtimeDetection],
        ocr_detections: List[RealtimeDetection],
        iou_dedup_threshold: float = 0.45
    ) -> List[RealtimeDetection]:
        # Merge all candidates into a list
        all_candidates = (
            general_detections +
            specialist_detections +
            open_vocab_detections +
            ocr_detections
        )

        # Sort by confidence descending
        all_candidates.sort(key=lambda d: d.confidence, reverse=True)

        kept: List[RealtimeDetection] = []

        for candidate in all_candidates:
            is_duplicate = False

            for existing in kept:
                # Deduplication condition:
                # Must be at the SAME semantic level and represent EQUIVALENT labels with high IoU
                if existing.level == candidate.level and are_labels_equivalent(existing.label, candidate.label):
                    iou = existing.bbox.iou(candidate.bbox)
                    if iou > iou_dedup_threshold:
                        # Genuine duplicate detected: keep existing (higher confidence)
                        is_duplicate = True
                        break

            if not is_duplicate:
                kept.append(candidate)

        return kept
