import os
import cv2
import numpy as np
from typing import List, Dict, Any, Optional
import logging
from ultralytics import YOLO

logger = logging.getLogger("ai-service.open_vocab")

DEFAULT_ACCESSORY_CLASSES = [
    "glasses", "sunglasses", "airpods", "earbuds", "wireless earbuds",
    "earrings", "necklace", "chain", "pendant", "choker",
    "watch", "smartwatch", "bracelet", "ring",
    "belt", "wallet", "bag", "backpack", "handbag", "keys",
    "cell phone", "shoes", "sneakers"
]

class OpenVocabularyDetectionService:
    """
    Open-Vocabulary Visual Detection Service.
    Wraps YOLO-World (yolov8s-worldv2.pt) with dynamic vocabulary setting.
    Provides robust fallback handling so the pipeline never fails if the model
    is initializing or operating on limited resources.
    """
    _instance: Optional["OpenVocabularyDetectionService"] = None

    def __init__(self, model_path: str = "yolov8s-worldv2.pt"):
        self.model_path = model_path
        self._model: Optional[YOLO] = None
        self._is_ready = False
        self._current_classes: List[str] = []
        self._load_model()

    def _load_model(self):
        try:
            full_path = os.path.join(os.getcwd(), self.model_path) if not os.path.isabs(self.model_path) else self.model_path
            if os.path.exists(full_path):
                logger.info(f"[OpenVocab] Loading YOLO-World model from {full_path}...")
                self._model = YOLO(full_path)
                self._is_ready = True
                self.set_vocabulary(DEFAULT_ACCESSORY_CLASSES)
                logger.info("[OpenVocab] YOLO-World model instance created with full accessory vocabulary.")
            else:
                logger.warning(f"[OpenVocab] Weights not found at {full_path}. Will use fallback.")
        except Exception as e:
            logger.warning(f"[OpenVocab] Failed to initialize YOLO-World: {e}")
            self._model = None
            self._is_ready = False

    @classmethod
    def get_instance(cls) -> "OpenVocabularyDetectionService":
        if cls._instance is None:
            cls._instance = OpenVocabularyDetectionService()
        return cls._instance

    def set_vocabulary(self, classes: List[str]):
        """Sets custom class vocabulary on YOLO-World"""
        if self._model is not None and self._is_ready:
            try:
                self._model.set_classes(classes)
                self._current_classes = list(classes)
                logger.info(f"[OpenVocab] Custom vocabulary set: {len(classes)} classes")
            except Exception as e:
                logger.warning(f"[OpenVocab] set_classes error (will use default classes): {e}")

    def detect_open_vocabulary(
        self,
        bgr_image: np.ndarray,
        classes: Optional[List[str]] = None,
        conf_threshold: float = 0.25,
        imgsz: int = 960
    ) -> List[Dict[str, Any]]:
        """
        Runs open-vocabulary detection on image canvas (full image or person crop).
        Returns list of detections with [x1, y1, x2, y2] bounding boxes and confidence.
        """
        if not self._is_ready or self._model is None:
            return []

        target_classes = classes or DEFAULT_ACCESSORY_CLASSES

        # Ensure vocabulary is configured
        if not self._current_classes or (classes is not None and classes != self._current_classes):
            self.set_vocabulary(target_classes)

        detections: List[Dict[str, Any]] = []
        try:
            results = self._model.predict(
                bgr_image,
                conf=conf_threshold,
                imgsz=imgsz,
                verbose=False
            )

            if results and len(results) > 0:
                res = results[0]
                names = res.names or {}
                boxes = res.boxes

                if boxes is not None and len(boxes) > 0:
                    for i in range(len(boxes)):
                        xyxy = boxes.xyxy[i].cpu().numpy()
                        c = float(boxes.conf[i].cpu().numpy())
                        cls_idx = int(boxes.cls[i].cpu().numpy())

                        if isinstance(names, dict):
                            label = names.get(cls_idx, target_classes[cls_idx] if cls_idx < len(target_classes) else f"item_{cls_idx}")
                        elif isinstance(names, (list, tuple)):
                            label = names[cls_idx] if 0 <= cls_idx < len(names) else (target_classes[cls_idx] if cls_idx < len(target_classes) else f"item_{cls_idx}")
                        else:
                            label = target_classes[cls_idx] if cls_idx < len(target_classes) else f"item_{cls_idx}"

                        x1, y1, x2, y2 = [int(round(coord)) for coord in xyxy]
                        detections.append({
                            "label": str(label).lower(),
                            "display_name": str(label).lower(),
                            "confidence": round(c, 3),
                            "bbox": [x1, y1, x2, y2],
                            "source_model": "yolo_world"
                        })
        except Exception as e:
            logger.warning(f"[OpenVocab] Inference note: {e}")

        return detections

def get_open_vocab_service() -> OpenVocabularyDetectionService:
    return OpenVocabularyDetectionService.get_instance()
