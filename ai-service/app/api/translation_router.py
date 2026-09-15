from fastapi import APIRouter, HTTPException, status
from app.models.translation_model import TranslationRequest, TranslationResponse, TranslationData
from app.services.translation_service import TranslationService
import logging

logger = logging.getLogger("ai-service")

router = APIRouter(prefix="/translate", tags=["Translation Engine"])

@router.post("", response_model=TranslationResponse, status_code=status.HTTP_200_OK)
async def translate_text_endpoint(request: TranslationRequest):
    if not request.text or not request.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text for translation cannot be empty"
        )

    logger.info(f"[Translation] Request received: src={request.sourceLanguage}, target={request.targetLanguage}, text_len={len(request.text)}")

    try:
        data: TranslationData = TranslationService.translate_text(
            text=request.text,
            source_lang=request.sourceLanguage,
            target_lang=request.targetLanguage
        )
        return TranslationResponse(success=True, data=data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Translation] Failed to translate text: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Translation engine failure: {str(e)}"
        )
