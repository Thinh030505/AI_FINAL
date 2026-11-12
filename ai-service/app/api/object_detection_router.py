from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form, Request
from typing import Optional
from app.models.object_detection_model import (
    ObjectDetectionRequest,
    ObjectDetectionResponse,
    ObjectDetectionData
)
from app.services.object_detection_service import get_object_detection_service, ObjectDetectionService
import logging

logger = logging.getLogger("ai-service")

router = APIRouter(prefix="/object-detection", tags=["Object Detection Engine"])

MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB limit

@router.post("", response_model=ObjectDetectionResponse, status_code=status.HTTP_200_OK)
async def detect_objects_endpoint(request: ObjectDetectionRequest):
    if not request.imageUrl or not request.imageUrl.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image URL (imageUrl) is required for object detection"
        )

    logger.info(f"[ObjectDetection] Request received for imageUrl = {request.imageUrl}")

    try:
        # Step 1: Download image bytes
        image_bytes = await ObjectDetectionService.fetch_image_from_url(request.imageUrl)

        # Step 2: Run YOLO inference
        service = get_object_detection_service()
        data: ObjectDetectionData = service.detect_objects(image_bytes)

        return ObjectDetectionResponse(
            success=True,
            message="Object detection completed successfully",
            data=data
        )

    except ValueError as ve:
        logger.warning(f"[ObjectDetection] Client error: {ve}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ObjectDetection] Server error during inference: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Object detection inference failed: {str(e)}"
        )

@router.post("/direct", response_model=ObjectDetectionResponse, status_code=status.HTTP_200_OK)
async def detect_objects_direct_endpoint(
    request: Request,
    file: Optional[UploadFile] = File(None),
    confidence_threshold: float = Form(0.25)
):
    """
    Phase 6.1: Direct bytes endpoint eliminating redundant Cloudinary downloads.
    Accepts multipart/form-data with a file field or direct binary stream in body.
    """
    image_bytes = None
    filename = "unknown"

    if file is not None:
        filename = file.filename or "uploaded_image"
        image_bytes = await file.read()
    else:
        content_type = request.headers.get("content-type", "")
        if "image/" in content_type or "octet-stream" in content_type:
            image_bytes = await request.body()
            filename = "raw_stream"

    if not image_bytes or len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No image data provided. Please provide a file via multipart form or raw bytes body."
        )

    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image size exceeds maximum limit of {MAX_IMAGE_SIZE_BYTES // (1024 * 1024)}MB."
        )

    if len(image_bytes) < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image data is too small or corrupted."
        )

    logger.info(
        f"[ObjectDetection] Direct byte request received: filename='{filename}', size={len(image_bytes)} bytes"
    )

    try:
        service = get_object_detection_service()
        data: ObjectDetectionData = service.detect_objects(
            image_bytes,
            confidence_threshold=confidence_threshold
        )

        return ObjectDetectionResponse(
            success=True,
            message="Object detection completed successfully via direct bytes",
            data=data
        )
    except ValueError as ve:
        logger.warning(f"[ObjectDetection] Client error: {ve}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ObjectDetection] Server error during direct inference: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Object detection inference failed: {str(e)}"
        )
