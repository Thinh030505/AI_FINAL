import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form, Request

from app.models.visual_intelligence_model import (
    VisualIntelligenceRequest,
    VisualIntelligenceResponse,
)
from app.services.visual_intelligence_service import get_visual_intelligence_service
from app.services.preprocessing_service import PreprocessingService

logger = logging.getLogger("ai-service.api.visual_intelligence")

router = APIRouter(prefix="/visual-intelligence", tags=["AI Visual Intelligence Studio (Dual-Engine)"])

MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB

@router.post(
    "/analyze",
    response_model=VisualIntelligenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Unified YOLO11 COCO + PaddleOCR Analysis via Image URL"
)
async def analyze_visual_intelligence_url(request: VisualIntelligenceRequest):
    if not request.imageUrl or not request.imageUrl.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image URL (imageUrl) is required for visual intelligence analysis"
        )

    logger.info(f"[VisualIntelligence] Request received for imageUrl: {request.imageUrl}")

    try:
        # Step 1: Download image bytes
        image_bytes = await PreprocessingService.fetch_image_from_url(request.imageUrl.strip())
        if not image_bytes or len(image_bytes) < 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Downloaded image file is empty or corrupted"
            )

        # Step 2: Run Unified Dual-Engine Pipeline
        service = get_visual_intelligence_service()
        threshold = request.confidence_threshold if request.confidence_threshold is not None else 0.25
        result = await service.analyze_image_bytes(image_bytes, confidence_threshold=threshold)
        return result

    except HTTPException:
        raise
    except ValueError as ve:
        logger.warning(f"[VisualIntelligence] Validation error: {ve}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"[VisualIntelligence] Unexpected error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Visual intelligence processing encountered an error: {str(e)}"
        )

@router.post(
    "/direct",
    response_model=VisualIntelligenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Unified YOLO11 COCO + PaddleOCR Analysis via Direct Bytes / Multipart Upload"
)
async def analyze_visual_intelligence_direct(
    request: Request,
    file: Optional[UploadFile] = File(None),
    confidence_threshold: float = Form(0.25)
):
    image_bytes = None
    if file is not None:
        image_bytes = await file.read()
    else:
        content_type = request.headers.get("content-type", "")
        if "image/" in content_type or "octet-stream" in content_type:
            image_bytes = await request.body()

    if not image_bytes or len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No image data provided. Please send a file or raw image stream."
        )

    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image exceeds maximum limit of {MAX_IMAGE_SIZE_BYTES // (1024 * 1024)}MB"
        )

    if len(image_bytes) < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image data is too small or corrupted."
        )

    try:
        service = get_visual_intelligence_service()
        result = await service.analyze_image_bytes(image_bytes, confidence_threshold=confidence_threshold)
        return result
    except HTTPException:
        raise
    except ValueError as ve:
        logger.warning(f"[VisualIntelligence] Direct validation error: {ve}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"[VisualIntelligence] Direct processing error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Direct visual intelligence processing failed: {str(e)}"
        )
