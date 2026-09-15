import time
import logging
import unicodedata
from deep_translator import MyMemoryTranslator, GoogleTranslator
from app.models.translation_model import TranslationData

logger = logging.getLogger("ai-service")

class TranslationService:
    @staticmethod
    def _detect_simple_language(text: str) -> str:
        """
        Simple heuristic language detection for Vietnamese vs English if sourceLanguage='auto'.
        """
        # Count Vietnamese specific diacritics
        vi_chars = "àáảãạăắằẳẵặâấầẩẫậđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ"
        count_vi = sum(1 for c in text.lower() if c in vi_chars)
        return "vi" if count_vi > 0 else "en"

    @staticmethod
    def translate_text(text: str, source_lang: str = "auto", target_lang: str = "en") -> TranslationData:
        start_time = time.time()
        
        if not text or not text.strip():
            return TranslationData(
                sourceText=text,
                translatedText="",
                sourceLanguage=source_lang,
                targetLanguage=target_lang,
                processingTimeMs=0
            )

        # Unicode NFC normalization
        normalized_text = unicodedata.normalize("NFC", text.strip())

        # Resolve auto source language
        resolved_src = source_lang.lower()
        if resolved_src == "auto":
            resolved_src = TranslationService._detect_simple_language(normalized_text)
            logger.info(f"[Translation] Auto-detected source language: {resolved_src}")

        resolved_target = target_lang.lower()

        # Short-circuit if source and target languages are identical
        if resolved_src == resolved_target:
            return TranslationData(
                sourceText=normalized_text,
                translatedText=normalized_text,
                sourceLanguage=resolved_src,
                targetLanguage=resolved_target,
                processingTimeMs=max(1, int((time.time() - start_time) * 1000))
            )

        # Perform translation preserving line breaks
        lines = normalized_text.split("\n")
        translated_lines = []

        for line in lines:
            if not line.strip():
                translated_lines.append("")
                continue

            line_trans = None

            # Attempt 1: GoogleTranslator via deep-translator
            try:
                translator = GoogleTranslator(source=resolved_src, target=resolved_target)
                res = translator.translate(line)
                if res and "Error" not in str(res):
                    line_trans = str(res)
            except Exception as e:
                logger.warning(f"[Translation] GoogleTranslator attempt note: {e}")

            # Attempt 2: MyMemoryTranslator fallback
            if not line_trans:
                try:
                    src_mm = "vi-VN" if resolved_src == "vi" else "en-US"
                    target_mm = "en-US" if resolved_target == "en" else "vi-VN"
                    mm_translator = MyMemoryTranslator(source=src_mm, target=target_mm)
                    res = mm_translator.translate(line)
                    if res:
                        line_trans = str(res)
                except Exception as e:
                    logger.warning(f"[Translation] MyMemoryTranslator attempt note: {e}")

            # Fallback if external engines are unavailable
            if not line_trans:
                logger.warning(f"[Translation] Using line fallback for line: '{line}'")
                line_trans = line

            translated_lines.append(line_trans)

        full_translated_text = "\n".join(translated_lines)
        elapsed_ms = max(1, int((time.time() - start_time) * 1000))

        logger.info(f"[Translation] Translated {len(lines)} lines ({resolved_src} -> {resolved_target}) in {elapsed_ms}ms")

        return TranslationData(
            sourceText=normalized_text,
            translatedText=full_translated_text,
            sourceLanguage=resolved_src,
            targetLanguage=resolved_target,
            processingTimeMs=elapsed_ms
        )
