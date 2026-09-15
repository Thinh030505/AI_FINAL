from fastapi import APIRouter, HTTPException, status
from app.models.ocr_model import OCRRequest, OCRResponse, OCRData
from app.services.preprocessing_service import PreprocessingService
from app.services.ocr_service import get_ocr_service
import logging

logger = logging.getLogger("ai-service")

router = APIRouter(prefix="/ocr", tags=["OCR Engine"])

@router.post("", response_model=OCRResponse, status_code=status.HTTP_200_OK)
async def process_ocr(request: OCRRequest):
    if not request.imageUrl:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image URL (imageUrl) is required for OCR processing"
        )

    logger.info(f"[OCR] AI Smart OCR started for imageUrl = {request.imageUrl}")

    try:
        # Step 1: Download image bytes from Cloudinary URL
        image_bytes = await PreprocessingService.fetch_image_from_url(request.imageUrl)
        logger.info(f"[OCR] Image downloaded ({len(image_bytes)} bytes)")

        # Step 2: Adaptive Pass 1 preprocessing (Upscaling + CLAHE + Sharpening)
        img_pass1 = PreprocessingService.preprocess_image_bytes(image_bytes, mode="adaptive")

        # Pass 2 generator function (triggered conditionally if Pass 1 confidence < 0.92)
        def pass2_func():
            return PreprocessingService.preprocess_image_bytes(image_bytes, mode="contrast")

        # Step 3: Run Smart Multi-Pass PaddleOCR text recognition & NFC post-processing
        ocr_service = get_ocr_service()
        ocr_data: OCRData = ocr_service.run_smart_ocr(img_pass1, pass2_func)

        logger.info(f"[OCR] Smart PaddleOCR inference completed in {ocr_data.processingTimeMs}ms")
        logger.info(f"[OCR] Parsed lines = {len(ocr_data.lines)}")
        logger.info(f"[OCR] Full text =\n{ocr_data.fullText}")

        return OCRResponse(success=True, data=ocr_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process OCR request for URL {request.imageUrl}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR inference engine failure: {str(e)}"
        )
