import time
import logging
import asyncio
from typing import Dict, Any, Optional, List, Tuple
import cv2
import numpy as np
from app.models.visual_intelligence_model import (
    BBox,
    ObjectItem,
    TextItem,
    VisualIntelligenceAnalysis,
    VisualIntelligenceResponse,
)
from app.services.object_detection_service import get_object_detection_service
from app.services.ocr_service import get_ocr_service
from app.services.postprocessing_service import PostprocessingService

logger = logging.getLogger("ai-service.visual_intelligence")

class VisualIntelligenceService:
    _instance: Optional["VisualIntelligenceService"] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(VisualIntelligenceService, cls).__new__(cls)
        return cls._instance

    @staticmethod
    def _enhance_for_ocr(bgr_image: np.ndarray) -> np.ndarray:
        """
        Enhances image contrast and clarity for OCR WITHOUT resizing or padding,
        ensuring 100% pixel-perfect coordinate parity with the original image.
        """
        try:
            lab = cv2.cvtColor(bgr_image, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            cl = clahe.apply(l)
            merged = cv2.merge((cl, a, b))
            enhanced = cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)
            return enhanced
        except Exception as e:
            logger.warning(f"[VisualIntelligence] CLAHE enhancement fallback: {e}")
            return bgr_image

    def _execute_yolo(
        self,
        bgr_image: np.ndarray,
        confidence_threshold: float = 0.25
    ) -> Tuple[List[ObjectItem], Dict[str, Any]]:
        t0 = time.perf_counter()
        detector = get_object_detection_service()
        data = detector.detect_objects(bgr_image, confidence_threshold=confidence_threshold)
        elapsed_ms = max(1, int((time.perf_counter() - t0) * 1000))

        objects: List[ObjectItem] = []
        for idx, det in enumerate(data.detections):
            objects.append(
                ObjectItem(
                    id=f"object_{idx + 1}",
                    class_id=det.classId,
                    label=det.label,
                    confidence=round(det.confidence, 4),
                    bbox=BBox(
                        x1=det.box.x1,
                        y1=det.box.y1,
                        x2=det.box.x2,
                        y2=det.box.y2,
                    ),
                )
            )

        status = "success" if len(objects) > 0 else "no_results"
        meta = {
            "status": status,
            "model": data.model,
            "count": len(objects),
            "processing_time_ms": elapsed_ms,
        }
        return objects, meta

    def _execute_ocr(
        self,
        bgr_image: np.ndarray,
        width: int,
        height: int
    ) -> Tuple[List[TextItem], str, Dict[str, Any]]:
        t0 = time.perf_counter()
        ocr_service = get_ocr_service()
        enhanced_bgr = self._enhance_for_ocr(bgr_image)

        # Run Pass 1 on enhanced image without dimension changes
        ocr_data = ocr_service.run_smart_ocr(enhanced_bgr)
        elapsed_ms = max(1, int((time.perf_counter() - t0) * 1000))

        texts: List[TextItem] = []
        for idx, line in enumerate(ocr_data.lines):
            pts = line.box
            if pts and len(pts) >= 4:
                xs = [p[0] for p in pts]
                ys = [p[1] for p in pts]
                x1 = max(0.0, min(float(width), float(min(xs))))
                y1 = max(0.0, min(float(height), float(min(ys))))
                x2 = max(x1 + 1.0, min(float(width), float(max(xs))))
                y2 = max(y1 + 1.0, min(float(height), float(max(ys))))
            else:
                x1, y1, x2, y2 = 0.0, 0.0, 0.0, 0.0

            texts.append(
                TextItem(
                    id=f"text_{idx + 1}",
                    content=line.text,
                    confidence=round(line.confidence, 4),
                    bbox=BBox(x1=x1, y1=y1, x2=x2, y2=y2),
                    polygon=[[int(p[0]), int(p[1])] for p in pts] if pts else None,
                )
            )

        status = "success" if len(texts) > 0 else "no_results"
        meta = {
            "status": status,
            "engine": "PaddleOCR",
            "line_count": len(texts),
            "full_text": ocr_data.fullText,
            "processing_time_ms": elapsed_ms,
        }
        return texts, ocr_data.fullText, meta

    async def analyze_image_bytes(
        self,
        image_bytes: bytes,
        confidence_threshold: float = 0.25
    ) -> VisualIntelligenceResponse:
        total_start = time.perf_counter()

        # 1. Single decode: Decode image bytes once
        np_arr = np.frombuffer(image_bytes, np.uint8)
        bgr_image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if bgr_image is None or bgr_image.size == 0:
            raise ValueError("Failed to decode image bytes into valid image.")

        height, width = bgr_image.shape[:2]

        # 2. Parallel Dual-Engine execution with isolated exception handling
        yolo_future = asyncio.to_thread(self._execute_yolo, bgr_image, confidence_threshold)
        ocr_future = asyncio.to_thread(self._execute_ocr, bgr_image, width, height)

        yolo_result, ocr_result = await asyncio.gather(
            yolo_future,
            ocr_future,
            return_exceptions=True
        )

        objects: List[ObjectItem] = []
        texts: List[TextItem] = []
        full_text: str = ""
        engines: Dict[str, Any] = {}
        timings: Dict[str, Any] = {}

        # 3. Handle YOLO result
        if isinstance(yolo_result, Exception):
            logger.error(f"[VisualIntelligence] YOLO Engine error: {yolo_result}", exc_info=True)
            engines["object_detection"] = {
                "status": "error",
                "count": 0,
                "message": str(yolo_result),
                "processing_time_ms": 0,
            }
            timings["yolo_ms"] = 0
        else:
            objs, meta = yolo_result
            objects = objs
            engines["object_detection"] = meta
            timings["yolo_ms"] = meta.get("processing_time_ms", 0)

        # 4. Handle OCR result
        if isinstance(ocr_result, Exception):
            logger.error(f"[VisualIntelligence] PaddleOCR Engine error: {ocr_result}", exc_info=True)
            engines["ocr"] = {
                "status": "error",
                "line_count": 0,
                "full_text": "",
                "message": str(ocr_result),
                "processing_time_ms": 0,
            }
            timings["ocr_ms"] = 0
        else:
            txts, f_txt, meta = ocr_result
            texts = txts
            full_text = f_txt
            engines["ocr"] = meta
            timings["ocr_ms"] = meta.get("processing_time_ms", 0)

        total_elapsed_ms = max(1, int((time.perf_counter() - total_start) * 1000))
        timings["total_ms"] = total_elapsed_ms

        logger.info(
            f"[VisualIntelligence] Completed in {total_elapsed_ms}ms: "
            f"Objects={len(objects)} (status={engines['object_detection']['status']}), "
            f"Texts={len(texts)} (status={engines['ocr']['status']})"
        )

        return VisualIntelligenceResponse(
            success=True,
            image={"width": width, "height": height},
            analysis=VisualIntelligenceAnalysis(
                objects=objects,
                texts=texts,
                full_text=full_text,
            ),
            engines=engines,
            timings=timings,
            message="Visual intelligence dual-engine analysis completed successfully"
        )

def get_visual_intelligence_service() -> VisualIntelligenceService:
    return VisualIntelligenceService()
