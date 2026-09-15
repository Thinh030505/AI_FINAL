from fastapi import APIRouter, HTTPException, status
from app.models.object_detection_model import (
    ObjectDetectionRequest,
    ObjectDetectionResponse,
    ObjectDetectionData
)
from app.services.object_detection_service import get_object_detection_service, ObjectDetectionService
import logging

logger = logging.getLogger("ai-service")

router = APIRouter(prefix="/object-detection", tags=["Object Detection Engine"])

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
