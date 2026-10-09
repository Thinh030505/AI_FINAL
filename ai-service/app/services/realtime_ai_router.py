import os
import time
import logging
import cv2
import numpy as np
import torch
from typing import List, Dict, Any, Optional, Tuple

from app.models.smart_camera_model import (
    RealtimeDetection,
    SmartBBox,
    SmartCameraTiming,
    DeviceInfo,
    SmartCameraAnalysisResponse,
    ImageDimensions,
    FrameTransformMetadata,
)
from app.services.smart_camera_tracker import SmartCameraTracker
from app.services.detection_hierarchy_engine import DetectionHierarchyEngine
from app.services.detection_fusion_engine import DetectionFusionEngine
from ultralytics import YOLO

logger = logging.getLogger("ai-service.smart_camera_router")

# Category mapping lookup for consistent semantic coloring
CATEGORY_MAP = {
    "person": "person",
    "human": "person",
    "human head": "human_part",
    "human face": "human_part",
    "human eye": "human_part",
    "human mouth": "human_part",
    "human nose": "human_part",
    "human ear": "human_part",
    "human hand": "human_part",
    "human wrist": "human_part",
    "headphones": "accessory",
    "airpods": "accessory",
    "earbuds": "accessory",
    "glasses": "accessory",
    "sunglasses": "accessory",
    "watch": "accessory",
    "necklace": "accessory",
    "ring": "accessory",
    "backpack": "accessory",
    "handbag": "accessory",
    "potted plant": "natural_object",
    "plant": "natural_object",
    "houseplant": "natural_object",
    "flower": "natural_object",
    "flowerpot": "natural_object",
    "laptop": "device",
    "cell phone": "device",
    "tv": "device",
    "keyboard": "device",
    "mouse": "device",
    "chair": "furniture",
    "couch": "furniture",
    "bed": "furniture",
    "dining table": "furniture",
    "desk": "furniture",
    "window": "general_object",
    "door": "general_object",
    "car": "vehicle",
    "bus": "vehicle",
    "truck": "vehicle",
    "bicycle": "vehicle",
    "motorcycle": "vehicle",
    "guitar": "general_object",
    "bottle": "general_object",
    "cup": "general_object",
    "book": "general_object",
}

class RealTimeAIRouter:
    _instance: Optional["RealTimeAIRouter"] = None

    def __init__(self):
        self.device_name = "cuda:0" if torch.cuda.is_available() else "cpu"
        self.cuda_available = torch.cuda.is_available()
        self.gpu_name = torch.cuda.get_device_name(0) if self.cuda_available else None
        self.vram_mb = (
            int(torch.cuda.get_device_properties(0).total_memory / (1024 * 1024))
            if self.cuda_available
            else None
        )

        logger.info(
            f"[RealTimeAIRouter] Initializing on device={self.device_name} (CUDA={self.cuda_available})"
        )

        # Singletons for models
        self._yolo_det: Optional[YOLO] = None
        self._yolo_pose: Optional[YOLO] = None
        self._yolo_world: Optional[YOLO] = None
        self._ocr_engine = None

        self._init_models()

        self.tracker = SmartCameraTracker.get_instance()
        self.hierarchy_engine = DetectionHierarchyEngine.get_instance()
        self.fusion_engine = DetectionFusionEngine.get_instance()

        # In-memory translation & OCR cache to prevent network / compute stalls
        self._translation_cache: Dict[str, str] = {}
        self._last_ocr_time: float = 0.0
        self._cached_ocr_detections: List[RealtimeDetection] = []

    def _init_models(self):
        try:
            det_path = "ai-service/yolo11n.pt" if os.path.exists("ai-service/yolo11n.pt") else "yolo11n.pt"
            logger.info(f"[RealTimeAIRouter] Preloading YOLO11n ({det_path})...")
            self._yolo_det = YOLO(det_path)
        except Exception as e:
            logger.error(f"[RealTimeAIRouter] Failed to load YOLO11n: {e}")

        try:
            pose_path = "ai-service/yolo11n-pose.pt" if os.path.exists("ai-service/yolo11n-pose.pt") else "yolo11n-pose.pt"
            logger.info(f"[RealTimeAIRouter] Preloading YOLO11n-pose ({pose_path})...")
            self._yolo_pose = YOLO(pose_path)
        except Exception as e:
            logger.error(f"[RealTimeAIRouter] Failed to load YOLO11n-pose: {e}")

        try:
            world_path = "ai-service/yolov8s-worldv2.pt" if os.path.exists("ai-service/yolov8s-worldv2.pt") else "yolov8s-worldv2.pt"
            if os.path.exists(world_path):
                logger.info(f"[RealTimeAIRouter] Preloading YOLO-World ({world_path})...")
                self._yolo_world = YOLO(world_path)
                self._yolo_world.set_classes([
                    "headphones", "airpods", "earbuds", "glasses", "sunglasses",
                    "watch", "necklace", "flower", "flowerpot", "window", "backpack"
                ])
        except Exception as e:
            logger.warning(f"[RealTimeAIRouter] YOLO-World preload note: {e}")

    @classmethod
    def get_instance(cls) -> "RealTimeAIRouter":
        if cls._instance is None:
            cls._instance = RealTimeAIRouter()
        return cls._instance

    def _get_category(self, label: str) -> str:
        clean = label.lower().strip()
        if clean in CATEGORY_MAP:
            return CATEGORY_MAP[clean]
        for key, cat in CATEGORY_MAP.items():
            if key in clean:
                return cat
        return "general_object"

    def _translate_cached(self, text: str, target_lang: str) -> str:
        clean = text.strip()
        if not clean or len(clean) < 2:
            return clean

        cache_key = f"{clean}::{target_lang}"
        if cache_key in self._translation_cache:
            return self._translation_cache[cache_key]

        try:
            from app.services.translation_service import TranslationService
            res = TranslationService.translate_text(clean, source_lang="auto", target_lang=target_lang)
            translated = res.translatedText if res and res.translatedText else clean
            self._translation_cache[cache_key] = translated
            if len(self._translation_cache) > 200:
                self._translation_cache.pop(next(iter(self._translation_cache)))
            return translated
        except Exception as e:
            logger.warning(f"[RealTimeAIRouter] Translation fallback note: {e}")
            self._translation_cache[cache_key] = clean
            return clean

    def analyze_frame(
        self,
        frame_bgr: np.ndarray,
        frame_id: int = 1,
        mode: str = "everything",  # "simple", "detailed", "everything"
        confidence_threshold: float = 0.25,
        enable_ocr: bool = False,
        target_lang: str = "vi",
        original_width: Optional[int] = None,
        original_height: Optional[int] = None,
    ) -> SmartCameraAnalysisResponse:
        t_start = time.time()
        timing = SmartCameraTiming()
        status = "success"

        upload_h, upload_w = frame_bgr.shape[:2]
        canon_w = int(original_width) if (original_width is not None and original_width > 0) else upload_w
        canon_h = int(original_height) if (original_height is not None and original_height > 0) else upload_h

        scale_x = canon_w / float(upload_w)
        scale_y = canon_h / float(upload_h)

        transform_meta = FrameTransformMetadata(
            uploadWidth=upload_w,
            uploadHeight=upload_h,
            originalWidth=canon_w,
            originalHeight=canon_h,
            scaleX=round(scale_x, 4),
            scaleY=round(scale_y, 4),
        )

        # Stage 1: Preprocess
        t_pre0 = time.time()
        target_max_dim = 640
        infer_scale = 1.0
        if max(upload_h, upload_w) > target_max_dim:
            infer_scale = target_max_dim / float(max(upload_h, upload_w))
            infer_bgr = cv2.resize(
                frame_bgr,
                (int(upload_w * infer_scale), int(upload_h * infer_scale)),
                interpolation=cv2.INTER_AREA
            )
        else:
            infer_bgr = frame_bgr
        timing.preprocessMs = round((time.time() - t_pre0) * 1000, 2)

        def to_canonical_box(xyxy_infer) -> Tuple[SmartBBox, SmartBBox]:
            """Converts detector infer_bgr coords -> upload coords -> Canonical Camera space"""
            up_x1 = float(xyxy_infer[0]) / infer_scale
            up_y1 = float(xyxy_infer[1]) / infer_scale
            up_x2 = float(xyxy_infer[2]) / infer_scale
            up_y2 = float(xyxy_infer[3]) / infer_scale

            raw_box = SmartBBox(
                x1=round(up_x1, 1),
                y1=round(up_y1, 1),
                x2=round(up_x2, 1),
                y2=round(up_y2, 1)
            )

            canon_x1 = max(0.0, min(float(canon_w), up_x1 * scale_x))
            canon_y1 = max(0.0, min(float(canon_h), up_y1 * scale_y))
            canon_x2 = max(0.0, min(float(canon_w), up_x2 * scale_x))
            canon_y2 = max(0.0, min(float(canon_h), up_y2 * scale_y))

            canon_box = SmartBBox(
                x1=round(canon_x1, 1),
                y1=round(canon_y1, 1),
                x2=round(canon_x2, 1),
                y2=round(canon_y2, 1)
            )
            return raw_box, canon_box

        general_detections: List[RealtimeDetection] = []
        specialist_detections: List[RealtimeDetection] = []
        open_vocab_detections: List[RealtimeDetection] = []
        ocr_detections: List[RealtimeDetection] = []

        person_entries: List[Tuple[SmartBBox, SmartBBox, float]] = []  # (raw_box, canon_box, conf)
        plant_boxes: List[SmartBBox] = []

        HIGH_RISK_APPLIANCES = {"refrigerator", "toilet", "microwave", "oven", "sink"}
        SMALL_OBJECTS = {"bottle", "cup", "cell phone", "remote", "banana", "apple", "sandwich"}
        frame_area = float(canon_w * canon_h)
        base_conf = max(0.32, confidence_threshold)

        # Stage 2: Fast General YOLO Detection (LEVEL 1)
        t_gen0 = time.time()
        try:
            if self._yolo_det is not None:
                results = self._yolo_det(
                    infer_bgr,
                    conf=0.25,
                    imgsz=480,
                    verbose=False
                )
                if results and len(results) > 0 and results[0].boxes is not None:
                    res = results[0]
                    names = res.names or {}
                    for i, box in enumerate(res.boxes):
                        cls_id = int(box.cls[0])
                        label = names.get(cls_id, f"obj_{cls_id}").lower()
                        conf = float(box.conf[0])
                        xyxy = box.xyxy[0].cpu().numpy()

                        raw_box, canon_box = to_canonical_box(xyxy)

                        box_area = (canon_box.x2 - canon_box.x1) * (canon_box.y2 - canon_box.y1)
                        area_ratio = box_area / frame_area

                        # Calibrated False Positive Filtering
                        if label in HIGH_RISK_APPLIANCES:
                            if conf < 0.55 or area_ratio < 0.04 or area_ratio > 0.85:
                                continue

                        if label in SMALL_OBJECTS:
                            if conf < 0.45 or area_ratio > 0.35:
                                continue

                        if conf < base_conf:
                            continue

                        category = self._get_category(label)
                        det_item = RealtimeDetection(
                            id=f"gen_{i+1}",
                            label=label,
                            confidence=round(conf, 2),
                            bbox=canon_box,
                            rawBbox=raw_box,
                            canonicalBbox=canon_box,
                            level="object",
                            category=category,
                            source="general_yolo"
                        )
                        general_detections.append(det_item)

                        if label == "person":
                            person_entries.append((raw_box, canon_box, conf))
                        elif any(k in label for k in ["plant", "potted plant", "vase"]):
                            plant_boxes.append(canon_box)
        except Exception as e:
            logger.error(f"[RealTimeAIRouter] General YOLO error: {e}")
            status = "partial_success"
        timing.generalDetectionMs = round((time.time() - t_gen0) * 1000, 2)

        # Stage 3: Person / Body Specialists (LEVEL 3 - Object Parts)
        t_spec0 = time.time()
        if mode in ["detailed", "everything"] and len(person_entries) > 0:
            try:
                part_idx = 1
                for raw_pbox, canon_pbox, p_conf in person_entries:
                    px1 = max(0, int(raw_pbox.x1))
                    py1 = max(0, int(raw_pbox.y1))
                    px2 = min(upload_w, int(raw_pbox.x2))
                    py2 = min(upload_h, int(raw_pbox.y2))
                    pw = px2 - px1
                    ph = py2 - py1

                    if pw < 35 or ph < 45:
                        continue

                    # Crop person ROI from upload frame
                    person_crop = frame_bgr[py1:py2, px1:px2]
                    crop_h, crop_w = person_crop.shape[:2]

                    if self._yolo_pose is not None:
                        pose_res = self._yolo_pose(person_crop, conf=0.30, imgsz=256, verbose=False)
                        if pose_res and len(pose_res) > 0 and pose_res[0].keypoints is not None:
                            kp_data = pose_res[0].keypoints.data
                            if kp_data is not None and len(kp_data) > 0:
                                kpts = kp_data[0].cpu().numpy()  # (17, 3) [crop_x, crop_y, conf]
                                nose = kpts[0]
                                l_eye = kpts[1]
                                r_eye = kpts[2]
                                l_ear = kpts[3]
                                r_ear = kpts[4]
                                l_wrist = kpts[9]
                                r_wrist = kpts[10]

                                # 1. Grounded Human Head & Face (Nose + at least one eye/ear >= 0.40)
                                facial_pts = [kpts[i] for i in [0, 1, 2, 3, 4] if kpts[i][2] >= 0.38]
                                if len(facial_pts) >= 2 and nose[2] >= 0.35:
                                    # Convert facial keypoints directly to Canonical Camera space
                                    canon_pts = np.array([
                                        [(px1 + pt[0]) * scale_x, (py1 + pt[1]) * scale_y, pt[2]]
                                        for pt in facial_pts
                                    ])
                                    min_x, min_y = np.min(canon_pts[:, :2], axis=0)
                                    max_x, max_y = np.max(canon_pts[:, :2], axis=0)

                                    pad_x = max(14.0, (max_x - min_x) * 0.35)
                                    pad_y = max(18.0, (max_y - min_y) * 0.50)

                                    # Clamp tightly to canonical person box
                                    hx1 = round(max(canon_pbox.x1, min_x - pad_x), 1)
                                    hy1 = round(max(canon_pbox.y1, min_y - pad_y * 1.3), 1)
                                    hx2 = round(min(canon_pbox.x2, max_x + pad_x), 1)
                                    hy2 = round(min(canon_pbox.y2, max_y + pad_y * 0.7), 1)

                                    head_conf = float(np.mean(canon_pts[:, 2]))
                                    head_box = SmartBBox(x1=hx1, y1=hy1, x2=hx2, y2=hy2)

                                    specialist_detections.append(RealtimeDetection(
                                        id=f"head_{part_idx}",
                                        label="human head",
                                        confidence=round(head_conf, 2),
                                        bbox=head_box,
                                        canonicalBbox=head_box,
                                        level="part",
                                        category="human_part",
                                        source="person_specialist"
                                    ))

                                    # Human Face (strictly within head)
                                    fx1 = round(max(hx1, min_x - pad_x * 0.4), 1)
                                    fy1 = round(max(hy1, min_y - pad_y * 0.4), 1)
                                    fx2 = round(min(hx2, max_x + pad_x * 0.4), 1)
                                    fy2 = round(min(hy2, max_y + pad_y * 0.5), 1)
                                    face_box = SmartBBox(x1=fx1, y1=fy1, x2=fx2, y2=fy2)

                                    specialist_detections.append(RealtimeDetection(
                                        id=f"face_{part_idx}",
                                        label="human face",
                                        confidence=round(head_conf * 0.95, 2),
                                        bbox=face_box,
                                        canonicalBbox=face_box,
                                        level="part",
                                        category="human_part",
                                        source="person_specialist"
                                    ))

                                # 2. Grounded Eyes (in EVERYTHING mode, strictly within face)
                                if mode == "everything":
                                    eye_rad = max(8.0, (canon_pbox.x2 - canon_pbox.x1) * 0.035)
                                    if l_eye[2] >= 0.45:
                                        ex = (px1 + l_eye[0]) * scale_x
                                        ey = (py1 + l_eye[1]) * scale_y
                                        eye_box = SmartBBox(
                                            x1=round(ex - eye_rad, 1),
                                            y1=round(ey - eye_rad, 1),
                                            x2=round(ex + eye_rad, 1),
                                            y2=round(ey + eye_rad, 1)
                                        )
                                        specialist_detections.append(RealtimeDetection(
                                            id=f"eye_l_{part_idx}",
                                            label="human eye",
                                            confidence=round(float(l_eye[2]), 2),
                                            bbox=eye_box,
                                            canonicalBbox=eye_box,
                                            level="part",
                                            category="human_part",
                                            source="person_specialist"
                                        ))
                                    if r_eye[2] >= 0.45:
                                        ex = (px1 + r_eye[0]) * scale_x
                                        ey = (py1 + r_eye[1]) * scale_y
                                        eye_box = SmartBBox(
                                            x1=round(ex - eye_rad, 1),
                                            y1=round(ey - eye_rad, 1),
                                            x2=round(ex + eye_rad, 1),
                                            y2=round(ey + eye_rad, 1)
                                        )
                                        specialist_detections.append(RealtimeDetection(
                                            id=f"eye_r_{part_idx}",
                                            label="human eye",
                                            confidence=round(float(r_eye[2]), 2),
                                            bbox=eye_box,
                                            canonicalBbox=eye_box,
                                            level="part",
                                            category="human_part",
                                            source="person_specialist"
                                        ))

                                # 3. Grounded Hands
                                hand_rad = max(16.0, (canon_pbox.x2 - canon_pbox.x1) * 0.08)
                                if l_wrist[2] >= 0.45:
                                    wx = (px1 + l_wrist[0]) * scale_x
                                    wy = (py1 + l_wrist[1]) * scale_y
                                    hand_box = SmartBBox(
                                        x1=round(wx - hand_rad, 1),
                                        y1=round(wy - hand_rad, 1),
                                        x2=round(wx + hand_rad, 1),
                                        y2=round(wy + hand_rad * 1.4, 1)
                                    )
                                    specialist_detections.append(RealtimeDetection(
                                        id=f"hand_l_{part_idx}",
                                        label="human hand",
                                        confidence=round(float(l_wrist[2] * 0.9), 2),
                                        bbox=hand_box,
                                        canonicalBbox=hand_box,
                                        level="part",
                                        category="human_part",
                                        source="person_specialist"
                                    ))
                                if r_wrist[2] >= 0.45:
                                    wx = (px1 + r_wrist[0]) * scale_x
                                    wy = (py1 + r_wrist[1]) * scale_y
                                    hand_box = SmartBBox(
                                        x1=round(wx - hand_rad, 1),
                                        y1=round(wy - hand_rad, 1),
                                        x2=round(wx + hand_rad, 1),
                                        y2=round(wy + hand_rad * 1.4, 1)
                                    )
                                    specialist_detections.append(RealtimeDetection(
                                        id=f"hand_r_{part_idx}",
                                        label="human hand",
                                        confidence=round(float(r_wrist[2] * 0.9), 2),
                                        bbox=hand_box,
                                        canonicalBbox=hand_box,
                                        level="part",
                                        category="human_part",
                                        source="person_specialist"
                                    ))

                    part_idx += 1
            except Exception as e:
                logger.warning(f"[RealTimeAIRouter] Person specialist error: {e}")
                status = "partial_success"
        timing.specialistMs = round((time.time() - t_spec0) * 1000, 2)

        # Stage 4: Open-Vocabulary / Fine-grained Detector (LEVEL 2 & 4)
        t_open0 = time.time()
        if mode in ["detailed", "everything"] and self._yolo_world is not None:
            try:
                world_res = self._yolo_world(infer_bgr, conf=0.45, imgsz=480, verbose=False)
                if world_res and len(world_res) > 0 and world_res[0].boxes is not None:
                    res = world_res[0]
                    names = res.names or {}
                    for i, box in enumerate(res.boxes):
                        cls_id = int(box.cls[0])
                        label = names.get(cls_id, f"ov_{cls_id}").lower()
                        conf = float(box.conf[0])
                        xyxy = box.xyxy[0].cpu().numpy()

                        raw_box, canon_box = to_canonical_box(xyxy)

                        # Strict Spatial Grounding for Accessories:
                        # Wearable accessories MUST intersect or be inside a detected person box!
                        WEARABLE_ACCESSORIES = {"headphones", "airpods", "earbuds", "glasses", "sunglasses", "watch", "necklace"}
                        if label in WEARABLE_ACCESSORIES:
                            is_on_person = any(
                                p_canon.contains(canon_box, tolerance=0.25) or p_canon.iou(canon_box) > 0.05
                                for _, p_canon, _ in person_entries
                            )
                            if not is_on_person:
                                # Reject accessory floating on an empty wall with no person
                                continue

                        category = self._get_category(label)
                        level = "fine_grained" if label in ["headphones", "watch", "glasses", "sunglasses", "flowerpot", "flower", "backpack"] else "open_vocab"
                        open_vocab_detections.append(RealtimeDetection(
                            id=f"ov_{i+1}",
                            label=label,
                            confidence=round(conf, 2),
                            bbox=canon_box,
                            rawBbox=raw_box,
                            canonicalBbox=canon_box,
                            level=level,
                            category=category,
                            source="open_vocab"
                        ))
            except Exception as e:
                logger.warning(f"[RealTimeAIRouter] Open-Vocabulary error: {e}")
                status = "partial_success"
        timing.openVocabMs = round((time.time() - t_open0) * 1000, 2)

        # Stage 5: Gated OCR & Translation (LEVEL 5)
        t_ocr0 = time.time()
        now = time.time()
        should_run_ocr = enable_ocr
        if should_run_ocr:
            try:
                gray = cv2.cvtColor(infer_bgr, cv2.COLOR_BGR2GRAY)
                edges = cv2.Sobel(gray, cv2.CV_16S, 1, 0, ksize=3)
                edge_val = np.mean(np.abs(edges))
                if edge_val > 12.0 or enable_ocr:
                    self._last_ocr_time = now
                    from app.services.ocr_service import get_ocr_service
                    ocr_service = get_ocr_service()
                    if ocr_service and ocr_service._ocr_engine:
                        ocr_data = ocr_service.run_smart_ocr(infer_bgr)
                        if ocr_data and ocr_data.lines:
                            self._cached_ocr_detections = []
                            for idx, line in enumerate(ocr_data.lines[:8]):
                                if line.confidence > 0.40 and line.text.strip():
                                    pts = np.array(line.box)
                                    ox1 = (float(np.min(pts[:, 0])) / infer_scale) * scale_x
                                    oy1 = (float(np.min(pts[:, 1])) / infer_scale) * scale_y
                                    ox2 = (float(np.max(pts[:, 0])) / infer_scale) * scale_x
                                    oy2 = (float(np.max(pts[:, 1])) / infer_scale) * scale_y

                                    if idx < 2:
                                        trans = self._translate_cached(line.text.strip(), target_lang)
                                    else:
                                        trans = line.text.strip()

                                    canon_box = SmartBBox(
                                        x1=round(ox1, 1),
                                        y1=round(oy1, 1),
                                        x2=round(ox2, 1),
                                        y2=round(oy2, 1)
                                    )
                                    self._cached_ocr_detections.append(RealtimeDetection(
                                        id=f"ocr_{idx+1}",
                                        label=f"Text: \"{line.text[:18]}\"",
                                        confidence=round(float(line.confidence), 2),
                                        bbox=canon_box,
                                        canonicalBbox=canon_box,
                                        level="ocr",
                                        category="ocr_text",
                                        source="ocr_engine",
                                        ocrText=line.text.strip(),
                                        translatedText=trans
                                    ))
            except Exception as e:
                logger.warning(f"[RealTimeAIRouter] OCR processing note: {e}")
                status = "partial_success"

        if (now - self._last_ocr_time) < 2.0 and self._cached_ocr_detections:
            ocr_detections = list(self._cached_ocr_detections)
        timing.ocrMs = round((time.time() - t_ocr0) * 1000, 2)

        # Stage 6: Fusion & Smart Deduplication
        t_fuse0 = time.time()
        fused = self.fusion_engine.fuse_detections(
            general_detections=general_detections,
            specialist_detections=specialist_detections,
            open_vocab_detections=open_vocab_detections,
            ocr_detections=ocr_detections
        )
        timing.fusionMs = round((time.time() - t_fuse0) * 1000, 2)

        # Stage 7: Hierarchy Tree Construction with Sanity Filter
        hierarchical = self.hierarchy_engine.build_hierarchy(fused)

        # Stage 8: Object Tracking & Coordinate Smoothing
        t_trk0 = time.time()
        tracked_detections = self.tracker.update_tracks(hierarchical, timestamp=now)
        timing.trackingMs = round((time.time() - t_trk0) * 1000, 2)

        timing.totalMs = round((time.time() - t_start) * 1000, 2)

        final_detections = []
        for d in tracked_detections:
            if mode == "simple":
                if d.level == "object":
                    final_detections.append(d)
            elif mode == "detailed":
                if d.level in ["object", "fine_grained"] or (d.level == "part" and d.label in ["human head", "human hand"]):
                    final_detections.append(d)
            else:  # "everything"
                final_detections.append(d)

        active_tracks = len(self.tracker.tracks)

        return SmartCameraAnalysisResponse(
            frameId=frame_id,
            timestamp=now,
            image=ImageDimensions(width=canon_w, height=canon_h),
            mode=mode,
            detections=final_detections,
            timings=timing,
            device=DeviceInfo(
                cuda=self.cuda_available,
                device=self.device_name,
                gpuName=self.gpu_name,
                vramMb=self.vram_mb,
                torchVersion=torch.__version__
            ),
            activeTrackCount=active_tracks,
            transform=transform_meta,
            status="empty" if len(final_detections) == 0 else status
        )
