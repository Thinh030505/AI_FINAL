import time
import logging
from typing import Optional, List, Any, Union
import numpy as np
import cv2
import httpx
from ultralytics import YOLO
from app.models.object_detection_model import (
    BoundingBox,
    DetectionItem,
    ObjectDetectionData
)

logger = logging.getLogger("ai-service")

class ObjectDetectionService:
    _instance: Optional["ObjectDetectionService"] = None
    _model: Optional[YOLO] = None
    _model_name: str = "yolo11n.pt"
    _device: str = "cpu"
    _runtime: str = "pytorch"

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ObjectDetectionService, cls).__new__(cls)
            cls._instance._init_model()
        return cls._instance

    def _init_model(self):
        try:
            import os
            import torch

            # Phase 9: Device auto-detection
            self._device = "cuda:0" if torch.cuda.is_available() else "cpu"
            env_runtime = os.getenv("YOLO_RUNTIME", "auto").strip().lower()

            target_model = self._model_name
            # Check for ONNX runtime if requested
            if env_runtime in ["onnx", "auto"]:
                onnx_path = self._model_name.replace(".pt", ".onnx")
                if os.path.exists(onnx_path):
                    try:
                        import onnxruntime
                        target_model = onnx_path
                        self._runtime = "onnx"
                        logger.info(f"[ObjectDetection] Using ONNX Runtime model: {onnx_path}")
                    except ImportError:
                        self._runtime = "pytorch"
                else:
                    self._runtime = "pytorch"
            else:
                self._runtime = "pytorch"

            logger.info(f"[ObjectDetection] Loading YOLO model from {target_model} on device {self._device} (runtime: {self._runtime})...")
            self._model = YOLO(target_model)
            logger.info(f"[ObjectDetection] YOLO model loaded successfully ({target_model}).")
        except Exception as e:
            logger.error(f"[ObjectDetection] Failed to load YOLO model: {e}", exc_info=True)
            self._model = None
            raise RuntimeError(f"Failed to initialize YOLO model: {str(e)}")

    @staticmethod
    async def fetch_image_from_url(url: str) -> bytes:
        if not url or not (url.startswith("http://") or url.startswith("https://")):
            raise ValueError("Invalid image URL. Must start with http:// or https://")

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            if response.status_code != 200:
                raise ValueError(f"Failed to download image from URL (HTTP {response.status_code})")
            content = response.content
            if not content or len(content) < 100:
                raise ValueError("Downloaded image file is empty or corrupted")
            return content

    def detect_objects(
        self,
        image_input: Any,
        confidence_threshold: float = 0.25
    ) -> ObjectDetectionData:
        start_time = time.time()

        if self._model is None:
            self._init_model()

        # Handle in-memory bundle, numpy array, PIL Image, or bytes directly
        img = None
        if isinstance(image_input, np.ndarray):
            img = image_input
        elif hasattr(image_input, "bgr"):
            img = image_input.bgr
        elif hasattr(image_input, "pil_image"):
            rgb_arr = np.array(image_input.pil_image.convert("RGB"))
            img = cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2BGR)
        elif isinstance(image_input, bytes):
            np_arr = np.frombuffer(image_input, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None or img.size == 0:
            raise ValueError("Failed to decode image. Ensure the image is valid PNG, JPEG, or WEBP.")

        height, width = img.shape[:2]

        # Run inference
        results = self._model(img, conf=confidence_threshold, verbose=False)
        elapsed_ms = max(1, int((time.time() - start_time) * 1000))

        detections: List[DetectionItem] = []

        if results and len(results) > 0 and results[0].boxes is not None:
            boxes = results[0].boxes
            for i in range(len(boxes)):
                xyxy = boxes.xyxy[i].cpu().numpy()
                conf = float(boxes.conf[i].cpu().numpy())
                cls_id = int(boxes.cls[i].cpu().numpy())

                x1 = float(round(xyxy[0], 1))
                y1 = float(round(xyxy[1], 1))
                x2 = float(round(xyxy[2], 1))
                y2 = float(round(xyxy[3], 1))

                # Ensure strict bounds
                x1 = max(0.0, min(float(width), x1))
                y1 = max(0.0, min(float(height), y1))
                x2 = max(0.0, min(float(width), x2))
                y2 = max(0.0, min(float(height), y2))

                if x2 <= x1 or y2 <= y1:
                    continue

                label_name = self._model.names.get(cls_id, f"class_{cls_id}")

                detections.append(
                    DetectionItem(
                        label=str(label_name),
                        classId=cls_id,
                        confidence=round(conf, 4),
                        box=BoundingBox(x1=x1, y1=y1, x2=x2, y2=y2)
                    )
                )

        logger.info(
            f"[ObjectDetection] Inference completed in {elapsed_ms}ms, "
            f"found {len(detections)} objects on {width}x{height} image"
        )

        return ObjectDetectionData(
            model="yolo11n",
            imageWidth=width,
            imageHeight=height,
            processingTimeMs=elapsed_ms,
            detections=detections,
            objectCount=len(detections)
        )

def get_object_detection_service() -> ObjectDetectionService:
    return ObjectDetectionService()
