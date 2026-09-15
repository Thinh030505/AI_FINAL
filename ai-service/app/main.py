import os
import logging
from dotenv import load_dotenv

# Load environment variables before importing app modules
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
if os.path.exists(env_path):
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.ocr_router import router as ocr_router
from app.api.translation_router import router as translation_router
from app.api.object_detection_router import router as object_detection_router
from app.api.segmentation_router import router as segmentation_router
from app.api.image_analysis_router import router as image_analysis_router
from app.api.feedback_router import router as feedback_router

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("ai-service")

PORT = int(os.getenv("PORT", os.getenv("AI_SERVICE_PORT", "8000")))

app = FastAPI(
    title="AI OCR & Image Understanding Hub",
    description="Python FastAPI service for PaddleOCR, AI Translation, YOLO11 Detection, SegFormer Semantic Segmentation, and Multimodal Fusion",
    version="2.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(ocr_router)
app.include_router(translation_router)
app.include_router(object_detection_router)
app.include_router(segmentation_router)
app.include_router(image_analysis_router)
app.include_router(feedback_router)

@app.on_event("startup")
async def startup_event():
    logger.info(f"AI Service started successfully on port {PORT}")
    try:
        from app.services.ocr_service import get_ocr_service
        get_ocr_service()
        logger.info("[OCR] PaddleOCR initialized and pre-loaded on startup.")
    except Exception as e:
        logger.warning(f"PaddleOCR Engine startup preload note: {e}")

    try:
        from app.services.object_detection_service import get_object_detection_service
        get_object_detection_service()
        logger.info("[ObjectDetection] YOLO model initialized and pre-loaded on startup.")
    except Exception as e:
        logger.warning(f"YOLO Engine startup preload note: {e}")

    try:
        from app.services.segmentation_service import get_segmentation_service
        get_segmentation_service()
        logger.info("[Segmentation] SegFormer model initialized and pre-loaded on startup.")
    except Exception as e:
        logger.warning(f"SegFormer Engine startup preload note: {e}")

    try:
        from app.services.vision_language_service import get_vision_language_service
        vl = get_vision_language_service()
        key_status = "SET" if vl.api_key else "MISSING"
        logger.info(f"[Vision] GEMINI KEY: {key_status}")
        logger.info(f"[Vision] VISION SERVICE: {'READY' if vl.is_available else 'FALLBACK_MODE'}")
    except Exception as e:
        logger.warning(f"Vision Engine startup preload note: {e}")

    # Phase 15: Model Warmup Forward Pass
    try:
        import numpy as np
        from PIL import Image
        dummy_arr = np.zeros((224, 224, 3), dtype=np.uint8)
        dummy_pil = Image.fromarray(dummy_arr)

        yolo_s = get_object_detection_service()
        yolo_s.detect_objects(dummy_arr)

        seg_s = get_segmentation_service()
        await seg_s.segment_image(dummy_pil)

        logger.info("[WARMUP] YOLO and SegFormer forward-pass warmup complete.")
    except Exception as warmup_err:
        logger.warning(f"[WARMUP] Warmup note: {warmup_err}")

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "ai-service",
        "ocr": True,
        "objectDetection": True,
        "semanticSegmentation": True,
        "vision": True
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=PORT, reload=True)
