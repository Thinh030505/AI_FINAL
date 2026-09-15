import cv2
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
import logging

from app.services.preprocessing_service import ProcessedImageBundle
from app.services.body_region_service import get_body_region_router, BodyRegion
from app.services.clothing_analysis_service import get_clothing_analysis_service
from app.services.false_positive_guard import get_false_positive_guard
from app.services.color_analysis_service import get_color_analysis_service

logger = logging.getLogger("ai-service.person_analysis")

class PersonAnalysisService:
    """
    Person-First Intelligence Pipeline.
    Orchestrates high-resolution original image cropping, body-region routing (YOLO Pose),
    targeted micro-object / accessory analysis, clothing classification, and color extraction.
    """
    _instance: Optional["PersonAnalysisService"] = None

    def __init__(self):
        self.body_router = get_body_region_router()
        self.clothing_svc = get_clothing_analysis_service()
        self.fp_guard = get_false_positive_guard()
        self.color_svc = get_color_analysis_service()

    @classmethod
    def get_instance(cls) -> "PersonAnalysisService":
        if cls._instance is None:
            cls._instance = PersonAnalysisService()
        return cls._instance

    def analyze_person(
        self,
        bundle: ProcessedImageBundle,
        person_bbox_orig: List[int],
        person_confidence: float = 0.90,
        person_idx: int = 1,
        open_vocab_detections: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Deep analysis of a single person directly from the pristine ORIGINAL HIGH-RESOLUTION image.
        """
        # Step 1: Crop person directly from ORIGINAL IMAGE with 8% context padding
        crop_bgr, crop_pil, crop_coords = bundle.crop_original(person_bbox_orig, padding_ratio=0.08)
        crop_ox1, crop_oy1, crop_ox2, crop_oy2 = crop_coords

        # Step 2: Route body regions via YOLO-Pose (or anatomical fallback)
        regions = self.body_router.route_body_regions(
            person_bgr=crop_bgr,
            person_bbox_orig=[crop_ox1, crop_oy1, crop_ox2, crop_oy2]
        )

        # Step 3: Analyze clothing types and color palette
        clothing_items = self.clothing_svc.analyze_person_clothing(
            person_bgr=crop_bgr,
            regions=regions,
            person_bbox_orig=[crop_ox1, crop_oy1, crop_ox2, crop_oy2]
        )

        # Step 4: Coarse-to-Fine Targeted Region Scanning (Zoom in on original high-res crops)
        candidate_accessories: List[Dict[str, Any]] = []
        carried_objects: List[Dict[str, Any]] = []

        from app.services.open_vocab_service import get_open_vocab_service
        ov_svc = get_open_vocab_service()

        # Run targeted micro-object scans on specific anatomical regions
        for reg in regions:
            rx1, ry1, rx2, ry2 = reg.box_in_crop
            rw = max(1, rx2 - rx1)
            rh = max(1, ry2 - ry1)

            # Only zoom in if region has meaningful dimensions
            if min(rw, rh) >= 24 and reg.target_accessories:
                sub_crop = crop_bgr[ry1:ry2, rx1:rx2]
                if sub_crop.size > 0:
                    try:
                        # Scan sub-crop using pre-compiled full accessory vocabulary
                        raw_sub_dets = ov_svc.detect_open_vocabulary(
                            bgr_image=sub_crop,
                            classes=None,
                            conf_threshold=0.15,
                            imgsz=384
                        )
                        # Filter to target accessories for this body region
                        sub_dets = [
                            d for d in raw_sub_dets
                            if any(t in d.get("label", "") for t in reg.target_accessories)
                        ]
                        for sd in sub_dets:
                            # Map sub-crop coordinates back to full original image coordinates
                            s_box = sd.get("bbox", [0, 0, 0, 0])
                            orig_x1 = crop_ox1 + rx1 + s_box[0]
                            orig_y1 = crop_oy1 + ry1 + s_box[1]
                            orig_x2 = crop_ox1 + rx1 + s_box[2]
                            orig_y2 = crop_oy1 + ry1 + s_box[3]

                            item = dict(sd)
                            item["bbox"] = [orig_x1, orig_y1, orig_x2, orig_y2]
                            item["body_region"] = reg.name.lower()
                            candidate_accessories.append(item)
                    except Exception as e:
                        logger.warning(f"[PersonAnalysis] Sub-region scan note on {reg.name}: {e}")

        # Also incorporate any global open_vocab_detections falling inside person
        if open_vocab_detections:
            for det in open_vocab_detections:
                dbox = det.get("bbox", [])
                if len(dbox) != 4:
                    continue

                cx = (dbox[0] + dbox[2]) / 2.0
                cy = (dbox[1] + dbox[3]) / 2.0

                if crop_ox1 <= cx <= crop_ox2 and crop_oy1 <= cy <= crop_oy2:
                    lbl = det.get("label", "").lower()
                    if any(c in lbl for c in ["bag", "backpack", "handbag", "suitcase"]):
                        carried_objects.append(det)
                    else:
                        candidate_accessories.append(det)

        # Step 5: Biological & Spatial plausibility filtering
        validated_accessories, rejected = self.fp_guard.filter_accessories(
            candidate_accessories=candidate_accessories,
            regions=regions,
            person_bbox_orig=[crop_ox1, crop_oy1, crop_ox2, crop_oy2]
        )

        # Step 6: Categorize accessories into anatomical groups
        head_acc = []
        ear_acc = []
        neck_acc = []
        wrist_acc = []
        hand_acc = []

        for acc in validated_accessories:
            reg = acc.get("body_region", "")
            lbl = acc.get("label", "")
            if reg == "head" or any(h in lbl for h in ["glasses", "sunglasses", "hat", "cap"]):
                head_acc.append(acc)
            elif "ear" in reg or any(e in lbl for e in ["airpod", "earbud", "earring"]):
                ear_acc.append(acc)
            elif reg == "neck" or any(n in lbl for n in ["necklace", "chain", "pendant"]):
                neck_acc.append(acc)
            elif "wrist" in reg or any(w in lbl for w in ["watch", "smartwatch", "bracelet"]):
                wrist_acc.append(acc)
            elif reg == "hand" or any(h in lbl for h in ["ring", "phone", "keys"]):
                hand_acc.append(acc)

        return {
            "personId": person_idx,
            "bbox": person_bbox_orig,
            "confidence": round(float(person_confidence), 3),
            "clothing": [c.to_dict() for c in clothing_items],
            "head_accessories": head_acc,
            "ear_accessories": ear_acc,
            "neck_accessories": neck_acc,
            "wrist_accessories": wrist_acc,
            "hand_accessories": hand_acc,
            "carried_objects": carried_objects,
            "body_regions": [r.to_dict() for r in regions]
        }

def get_person_analysis_service() -> PersonAnalysisService:
    return PersonAnalysisService.get_instance()
