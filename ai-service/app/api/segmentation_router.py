import logging
from fastapi import APIRouter, HTTPException, status
from app.models.segmentation_model import (
    SegmentationRequest,
    SegmentationResponse,
    SegmentationData,
)
from app.services.segmentation_service import get_segmentation_service

logger = logging.getLogger("ai-service.api.segmentation")

router = APIRouter(tags=["Semantic Segmentation"])


@router.post(
    "/semantic-segmentation",
    response_model=SegmentationResponse,
    status_code=status.HTTP_200_OK,
    summary="Perform SegFormer Semantic Segmentation on an image"
)
async def perform_segmentation(request: SegmentationRequest):
    image_url = request.imageUrl.strip()
    if not image_url.startswith("http://") and not image_url.startswith("https://"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image URL. Must begin with http:// or https://"
        )

    try:
        segmentation_service = get_segmentation_service()
        data: SegmentationData = await segmentation_service.segment_image(image_url)
        return SegmentationResponse(
            success=True,
            message="Semantic segmentation completed successfully",
            data=data
        )
    except ValueError as ve:
        logger.warning(f"[Segmentation] Bad request error: {ve}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"[Segmentation] Internal inference error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Semantic segmentation processing failed: {str(e)}"
        )
