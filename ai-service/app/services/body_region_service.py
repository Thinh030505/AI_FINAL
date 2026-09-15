import os
import logging
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from ultralytics import YOLO

logger = logging.getLogger("ai-service.body_region")

class BodyRegion:
    def __init__(
        self,
        name: str,
        box_in_crop: List[int],
        box_in_orig: List[int],
        confidence: float,
        source: str,
        target_accessories: List[str]
    ):
        self.name = name
        self.box_in_crop = box_in_crop
        self.box_in_orig = box_in_orig
        self.confidence = confidence
        self.source = source
        self.target_accessories = target_accessories

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "box_in_crop": self.box_in_crop,
            "box_in_orig": self.box_in_orig,
            "confidence": round(float(self.confidence), 3),
            "source": self.source,
            "target_accessories": self.target_accessories
        }

class BodyRegionRouter:
    """
    Body Region Router for Person-First Intelligence.
    Uses YOLO11-Pose (17 COCO keypoints) to extract anatomical body regions
    and maps them back to the original high-resolution image space.
    Provides robust anatomical heuristic fallback when keypoints are occluded.
    """
    _instance: Optional["BodyRegionRouter"] = None

    def __init__(self, model_path: str = "yolo11n-pose.pt"):
        self.model_path = model_path
        self._model = None
        self._load_model()

    def _load_model(self):
        try:
            full_path = os.path.join(os.getcwd(), self.model_path) if not os.path.isabs(self.model_path) else self.model_path
            if not os.path.exists(full_path):
                full_path = self.model_path  # Ultralytics will auto-fetch if standard
            logger.info(f"[BodyRegionRouter] Loading YOLO Pose from {full_path}...")
            self._model = YOLO(full_path)
            logger.info("[BodyRegionRouter] YOLO Pose loaded successfully.")
        except Exception as e:
            logger.error(f"[BodyRegionRouter] Failed to load YOLO Pose: {e}")
            self._model = None

    @classmethod
    def get_instance(cls) -> "BodyRegionRouter":
        if cls._instance is None:
            cls._instance = BodyRegionRouter()
        return cls._instance

    def route_body_regions(
        self,
        person_bgr: np.ndarray,
        person_bbox_orig: List[int]
    ) -> List[BodyRegion]:
        """
        Takes person crop BGR and person's absolute bbox in original image [ox1, oy1, ox2, oy2].
        Returns a list of fine-grained BodyRegion instances mapped to both crop and original image.
        """
        crop_h, crop_w = person_bgr.shape[:2]
        ox1, oy1, ox2, oy2 = person_bbox_orig

        keypoints = None
        kp_confs = None

        if self._model is not None and min(crop_h, crop_w) >= 32:
            try:
                results = self._model(person_bgr, conf=0.25, verbose=False)
                if results and len(results) > 0 and results[0].keypoints is not None:
                    kpts_data = results[0].keypoints.data
                    if kpts_data is not None and len(kpts_data) > 0:
                        # Take the primary person pose in crop
                        primary_kp = kpts_data[0].cpu().numpy()  # shape (17, 3) [x, y, conf]
                        keypoints = primary_kp[:, :2]
                        kp_confs = primary_kp[:, 2]
            except Exception as e:
                logger.warning(f"[BodyRegionRouter] Pose inference note: {e}")

        # If keypoints are reliable, construct keypoint-anchored regions
        has_good_pose = (
            keypoints is not None
            and kp_confs is not None
            and np.mean(kp_confs[:7]) > 0.30
        )

        regions: List[BodyRegion] = []

        if has_good_pose:
            regions = self._build_regions_from_pose(
                keypoints, kp_confs, crop_w, crop_h, ox1, oy1
            )
        else:
            regions = self._build_regions_from_heuristics(
                crop_w, crop_h, ox1, oy1
            )

        return regions

    def _clip_box(self, box: List[int], max_w: int, max_h: int) -> List[int]:
        x1 = max(0, min(max_w - 1, int(box[0])))
        y1 = max(0, min(max_h - 1, int(box[1])))
        x2 = max(x1 + 1, min(max_w, int(box[2])))
        y2 = max(y1 + 1, min(max_h, int(box[3])))
        return [x1, y1, x2, y2]

    def _to_orig(self, crop_box: List[int], ox1: int, oy1: int) -> List[int]:
        return [
            ox1 + crop_box[0],
            oy1 + crop_box[1],
            ox1 + crop_box[2],
            oy1 + crop_box[3]
        ]

    def _build_regions_from_pose(
        self,
        kp: np.ndarray,
        conf: np.ndarray,
        w: int,
        h: int,
        ox1: int,
        oy1: int
    ) -> List[BodyRegion]:
        regions = []

        # 1. HEAD & FACE: Keypoints 0 (Nose), 1 (L Eye), 2 (R Eye), 3 (L Ear), 4 (R Ear)
        head_indices = [0, 1, 2, 3, 4]
        head_pts = [kp[i] for i in head_indices if conf[i] > 0.25]
        if head_pts:
            pts = np.array(head_pts)
            hx1, hy1 = np.min(pts, axis=0)
            hx2, hy2 = np.max(pts, axis=0)
            pad = int(max(w * 0.15, (hx2 - hx1) * 0.4))
            head_box = self._clip_box([hx1 - pad, hy1 - pad * 1.5, hx2 + pad, hy2 + pad], w, h)
            avg_conf = float(np.mean([conf[i] for i in head_indices if conf[i] > 0.25]))
            regions.append(BodyRegion(
                name="HEAD",
                box_in_crop=head_box,
                box_in_orig=self._to_orig(head_box, ox1, oy1),
                confidence=avg_conf,
                source="pose_keypoints",
                target_accessories=["glasses", "sunglasses", "hat", "cap", "beanie", "mask"]
            ))

        # 2. LEFT EAR (kp 3) & RIGHT EAR (kp 4)
        ear_radius = int(max(15, h * 0.08))
        if conf[3] > 0.30:
            lx, ly = kp[3]
            ear_box = self._clip_box([lx - ear_radius, ly - ear_radius, lx + ear_radius, ly + ear_radius], w, h)
            regions.append(BodyRegion(
                name="LEFT_EAR",
                box_in_crop=ear_box,
                box_in_orig=self._to_orig(ear_box, ox1, oy1),
                confidence=float(conf[3]),
                source="pose_keypoints",
                target_accessories=["airpods", "earbuds", "earring"]
            ))

        if conf[4] > 0.30:
            rx, ry = kp[4]
            ear_box = self._clip_box([rx - ear_radius, ry - ear_radius, rx + ear_radius, ry + ear_radius], w, h)
            regions.append(BodyRegion(
                name="RIGHT_EAR",
                box_in_crop=ear_box,
                box_in_orig=self._to_orig(ear_box, ox1, oy1),
                confidence=float(conf[4]),
                source="pose_keypoints",
                target_accessories=["airpods", "earbuds", "earring"]
            ))

        # 3. NECK: Midpoint between ears (3,4) or nose (0) and shoulders (5, 6)
        if conf[5] > 0.25 and conf[6] > 0.25:
            sx1, sy1 = kp[5]  # Left shoulder
            sx2, sy2 = kp[6]  # Right shoulder
            neck_center_x = (sx1 + sx2) / 2.0
            neck_center_y = (sy1 + sy2) / 2.0 - (h * 0.05)
            neck_w = abs(sx1 - sx2) * 0.75
            neck_h = max(20, h * 0.12)
            neck_box = self._clip_box([
                neck_center_x - neck_w / 2,
                neck_center_y - neck_h / 2,
                neck_center_x + neck_w / 2,
                neck_center_y + neck_h / 2
            ], w, h)
            regions.append(BodyRegion(
                name="NECK",
                box_in_crop=neck_box,
                box_in_orig=self._to_orig(neck_box, ox1, oy1),
                confidence=float((conf[5] + conf[6]) / 2.0),
                source="pose_keypoints",
                target_accessories=["necklace", "chain", "pendant", "choker"]
            ))

        # 4. UPPER BODY / TORSO: Shoulders (5, 6) to Hips (11, 12)
        if conf[5] > 0.25 or conf[6] > 0.25:
            sy_min = min(kp[5][1], kp[6][1]) if (conf[5] > 0.25 and conf[6] > 0.25) else (kp[5][1] if conf[5] > 0.25 else kp[6][1])
            sy_max = max(kp[11][1], kp[12][1]) if (conf[11] > 0.25 and conf[12] > 0.25) else (sy_min + h * 0.40)
            torso_box = self._clip_box([0, sy_min - 10, w, sy_max], w, h)
            regions.append(BodyRegion(
                name="UPPER_BODY",
                box_in_crop=torso_box,
                box_in_orig=self._to_orig(torso_box, ox1, oy1),
                confidence=0.85,
                source="pose_keypoints",
                target_accessories=["shirt", "tshirt", "jacket", "hoodie", "coat", "bag", "backpack"]
            ))

        # 5. WRISTS & HANDS: Left Wrist (9) and Right Wrist (10)
        wrist_rad = int(max(15, h * 0.08))
        if conf[9] > 0.25:
            wx, wy = kp[9]
            wbox = self._clip_box([wx - wrist_rad, wy - wrist_rad, wx + wrist_rad, wy + wrist_rad], w, h)
            regions.append(BodyRegion(
                name="LEFT_WRIST",
                box_in_crop=wbox,
                box_in_orig=self._to_orig(wbox, ox1, oy1),
                confidence=float(conf[9]),
                source="pose_keypoints",
                target_accessories=["watch", "smartwatch", "bracelet"]
            ))
            # Hand extended
            hand_box = self._clip_box([wx - wrist_rad * 1.2, wy, wx + wrist_rad * 1.2, wy + wrist_rad * 2.2], w, h)
            regions.append(BodyRegion(
                name="LEFT_HAND",
                box_in_crop=hand_box,
                box_in_orig=self._to_orig(hand_box, ox1, oy1),
                confidence=float(conf[9] * 0.9),
                source="pose_keypoints",
                target_accessories=["ring", "phone", "keys"]
            ))

        if conf[10] > 0.25:
            wx, wy = kp[10]
            wbox = self._clip_box([wx - wrist_rad, wy - wrist_rad, wx + wrist_rad, wy + wrist_rad], w, h)
            regions.append(BodyRegion(
                name="RIGHT_WRIST",
                box_in_crop=wbox,
                box_in_orig=self._to_orig(wbox, ox1, oy1),
                confidence=float(conf[10]),
                source="pose_keypoints",
                target_accessories=["watch", "smartwatch", "bracelet"]
            ))
            hand_box = self._clip_box([wx - wrist_rad * 1.2, wy, wx + wrist_rad * 1.2, wy + wrist_rad * 2.2], w, h)
            regions.append(BodyRegion(
                name="RIGHT_HAND",
                box_in_crop=hand_box,
                box_in_orig=self._to_orig(hand_box, ox1, oy1),
                confidence=float(conf[10] * 0.9),
                source="pose_keypoints",
                target_accessories=["ring", "phone", "keys"]
            ))

        # 6. WAIST: Hips (11, 12)
        if conf[11] > 0.25 and conf[12] > 0.25:
            hx = (kp[11][0] + kp[12][0]) / 2.0
            hy = (kp[11][1] + kp[12][1]) / 2.0
            waist_box = self._clip_box([0, hy - h * 0.06, w, hy + h * 0.08], w, h)
            regions.append(BodyRegion(
                name="WAIST",
                box_in_crop=waist_box,
                box_in_orig=self._to_orig(waist_box, ox1, oy1),
                confidence=float((conf[11] + conf[12]) / 2.0),
                source="pose_keypoints",
                target_accessories=["belt", "wallet"]
            ))

        # 7. FEET: Ankles (15, 16)
        if conf[15] > 0.25 or conf[16] > 0.25:
            fy = min(kp[15][1], kp[16][1]) if (conf[15] > 0.25 and conf[16] > 0.25) else (kp[15][1] if conf[15] > 0.25 else kp[16][1])
            feet_box = self._clip_box([0, fy - 10, w, h], w, h)
            regions.append(BodyRegion(
                name="FEET",
                box_in_crop=feet_box,
                box_in_orig=self._to_orig(feet_box, ox1, oy1),
                confidence=0.80,
                source="pose_keypoints",
                target_accessories=["shoes", "sneakers"]
            ))

        # Fallback for any critical missing regions (e.g. if wrists not visible, provide heuristic hand areas)
        existing_names = {r.name for r in regions}
        if "HEAD" not in existing_names:
            head_box = self._clip_box([int(w * 0.15), 0, int(w * 0.85), int(h * 0.22)], w, h)
            regions.append(BodyRegion(
                name="HEAD", box_in_crop=head_box, box_in_orig=self._to_orig(head_box, ox1, oy1),
                confidence=0.6, source="anatomical_fallback", target_accessories=["glasses", "sunglasses", "hat", "cap"]
            ))

        return regions

    def _build_regions_from_heuristics(
        self,
        w: int,
        h: int,
        ox1: int,
        oy1: int
    ) -> List[BodyRegion]:
        """
        Deterministic anatomical proportional partitioning for low-confidence pose or occluded bodies.
        """
        regions = []

        # 1. HEAD (top 20%)
        head_box = self._clip_box([int(w * 0.15), 0, int(w * 0.85), int(h * 0.22)], w, h)
        regions.append(BodyRegion(
            name="HEAD", box_in_crop=head_box, box_in_orig=self._to_orig(head_box, ox1, oy1),
            confidence=0.65, source="anatomical_fallback",
            target_accessories=["glasses", "sunglasses", "hat", "cap", "beanie", "mask"]
        ))

        # 2. EARS (upper lateral sides)
        l_ear = self._clip_box([0, int(h * 0.05), int(w * 0.35), int(h * 0.20)], w, h)
        regions.append(BodyRegion(
            name="LEFT_EAR", box_in_crop=l_ear, box_in_orig=self._to_orig(l_ear, ox1, oy1),
            confidence=0.55, source="anatomical_fallback", target_accessories=["airpods", "earbuds", "earring"]
        ))
        r_ear = self._clip_box([int(w * 0.65), int(h * 0.05), w, int(h * 0.20)], w, h)
        regions.append(BodyRegion(
            name="RIGHT_EAR", box_in_crop=r_ear, box_in_orig=self._to_orig(r_ear, ox1, oy1),
            confidence=0.55, source="anatomical_fallback", target_accessories=["airpods", "earbuds", "earring"]
        ))

        # 3. NECK (18% - 32%)
        neck_box = self._clip_box([int(w * 0.25), int(h * 0.18), int(w * 0.75), int(h * 0.32)], w, h)
        regions.append(BodyRegion(
            name="NECK", box_in_crop=neck_box, box_in_orig=self._to_orig(neck_box, ox1, oy1),
            confidence=0.60, source="anatomical_fallback",
            target_accessories=["necklace", "chain", "pendant", "choker"]
        ))

        # 4. UPPER BODY (25% - 60%)
        upper_box = self._clip_box([0, int(h * 0.22), w, int(h * 0.60)], w, h)
        regions.append(BodyRegion(
            name="UPPER_BODY", box_in_crop=upper_box, box_in_orig=self._to_orig(upper_box, ox1, oy1),
            confidence=0.75, source="anatomical_fallback",
            target_accessories=["shirt", "tshirt", "jacket", "hoodie", "coat", "bag", "backpack"]
        ))

        # 5. WRISTS / HANDS (lateral mid-section)
        l_hand = self._clip_box([0, int(h * 0.40), int(w * 0.35), int(h * 0.70)], w, h)
        regions.append(BodyRegion(
            name="LEFT_HAND", box_in_crop=l_hand, box_in_orig=self._to_orig(l_hand, ox1, oy1),
            confidence=0.50, source="anatomical_fallback",
            target_accessories=["watch", "smartwatch", "bracelet", "ring", "phone", "keys"]
        ))
        r_hand = self._clip_box([int(w * 0.65), int(h * 0.40), w, int(h * 0.70)], w, h)
        regions.append(BodyRegion(
            name="RIGHT_HAND", box_in_crop=r_hand, box_in_orig=self._to_orig(r_hand, ox1, oy1),
            confidence=0.50, source="anatomical_fallback",
            target_accessories=["watch", "smartwatch", "bracelet", "ring", "phone", "keys"]
        ))

        # 6. WAIST (50% - 65%)
        waist_box = self._clip_box([int(w * 0.10), int(h * 0.50), int(w * 0.90), int(h * 0.65)], w, h)
        regions.append(BodyRegion(
            name="WAIST", box_in_crop=waist_box, box_in_orig=self._to_orig(waist_box, ox1, oy1),
            confidence=0.60, source="anatomical_fallback",
            target_accessories=["belt", "wallet"]
        ))

        # 7. FEET (82% - 100%)
        feet_box = self._clip_box([0, int(h * 0.82), w, h], w, h)
        regions.append(BodyRegion(
            name="FEET", box_in_crop=feet_box, box_in_orig=self._to_orig(feet_box, ox1, oy1),
            confidence=0.70, source="anatomical_fallback",
            target_accessories=["shoes", "sneakers"]
        ))

        return regions

def get_body_region_router() -> BodyRegionRouter:
    return BodyRegionRouter.get_instance()
