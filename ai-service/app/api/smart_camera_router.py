import base64
import logging
import cv2
import numpy as np
from fastapi import APIRouter, UploadFile, File, Form, Body, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional

from app.models.smart_camera_model import SmartCameraAnalysisResponse
from app.services.realtime_ai_router import RealTimeAIRouter

logger = logging.getLogger("ai-service.smart_camera_api")

router = APIRouter(prefix="/smart-camera", tags=["Smart Camera Realtime Vision"])

class AnalyzeFrameJsonRequest(BaseModel):
    imageBase64: Optional[str] = None
    frameId: int = Field(default=1)
    mode: str = Field(default="everything")
    confidenceThreshold: float = Field(default=0.25)
    enableOcr: bool = Field(default=False)
    targetLang: str = Field(default="vi")
    originalWidth: Optional[int] = None
    originalHeight: Optional[int] = None

@router.post("/analyze-frame", response_model=SmartCameraAnalysisResponse)
async def analyze_frame_endpoint(
    request: Request,
    file: Optional[UploadFile] = File(None),
    frameId: int = Form(1),
    mode: str = Form("everything"),
    confidenceThreshold: float = Form(0.25),
    enableOcr: bool = Form(False),
    targetLang: str = Form("vi"),
    originalWidth: Optional[int] = Form(None),
    originalHeight: Optional[int] = Form(None),
    imageBase64: Optional[str] = Form(None)
):
    """
    Ultra-low latency frame analysis endpoint for live Smart Camera streams.
    Accepts raw JPEG/WebP multipart stream OR application/json Base64 payload.
    """
    router_service = RealTimeAIRouter.get_instance()
    img_bgr = None

    # Check if request is JSON
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
            json_req = AnalyzeFrameJsonRequest(**body)
            frameId = json_req.frameId
            mode = json_req.mode
            confidenceThreshold = json_req.confidenceThreshold
            enableOcr = json_req.enableOcr
            targetLang = json_req.targetLang
            originalWidth = json_req.originalWidth
            originalHeight = json_req.originalHeight
            imageBase64 = json_req.imageBase64
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON request: {str(e)}")

    if file is not None:
        contents = await file.read()
        if not contents or len(contents) < 50:
            raise HTTPException(status_code=400, detail="Empty frame received")
        np_arr = np.frombuffer(contents, np.uint8)
        img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    elif imageBase64:
        clean_b64 = imageBase64
        if "base64," in clean_b64:
            clean_b64 = clean_b64.split("base64,")[1]
        decoded = base64.b64decode(clean_b64)
        np_arr = np.frombuffer(decoded, np.uint8)
        img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if img_bgr is None or img_bgr.size == 0:
        raise HTTPException(status_code=400, detail="Could not decode frame image data")

    response = router_service.analyze_frame(
        frame_bgr=img_bgr,
        frame_id=frameId,
        mode=mode.lower().strip(),
        confidence_threshold=confidenceThreshold,
        enable_ocr=enableOcr,
        target_lang=targetLang,
        original_width=originalWidth,
        original_height=originalHeight
    )
    return response

@router.post("/reset-tracker")
async def reset_tracker_endpoint():
    """Resets the tracking state on camera stop or device switch"""
    router_service = RealTimeAIRouter.get_instance()
    router_service.tracker.reset()
    return {"success": True, "message": "Smart camera tracker reset successfully"}

@router.get("/status")
async def get_smart_camera_status():
    """Returns AI device provider, loaded models, and active track status"""
    router_service = RealTimeAIRouter.get_instance()
    return {
        "status": "ready",
        "device": {
            "cuda": router_service.cuda_available,
            "device": router_service.device_name,
            "gpuName": router_service.gpu_name,
            "vramMb": router_service.vram_mb,
        },
        "models": {
            "generalDetector": "YOLO11n",
            "poseSpecialist": "YOLO11n-pose",
            "openVocabulary": "YOLOv8s-worldv2" if router_service._yolo_world else "unavailable",
            "ocrEngine": "PaddleOCR-v4",
        },
        "activeTracks": len(router_service.tracker.tracks),
    }
