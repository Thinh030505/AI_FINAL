import time
import logging
import unicodedata
from typing import Dict, Tuple
from deep_translator import MyMemoryTranslator, GoogleTranslator
from app.models.translation_model import TranslationData

logger = logging.getLogger("ai-service")

# Map standard ISO 639-1 language codes to MyMemory locale format
MYMEMORY_LANG_MAP: Dict[str, str] = {
    "vi": "vi-VN",
    "en": "en-US",
    "ja": "ja-JP",
    "zh": "zh-CN",
    "zh-cn": "zh-CN",
    "zh-tw": "zh-TW",
    "ko": "ko-KR",
    "fr": "fr-FR",
    "de": "de-DE",
    "es": "es-ES",
    "pt": "pt-PT",
    "th": "th-TH",
    "id": "id-ID",
    "ar": "ar-SA",
    "ru": "ru-RU",
    "it": "it-IT",
}

# Map standard language codes for GoogleTranslator
GOOGLE_LANG_MAP: Dict[str, str] = {
    "vi": "vi",
    "en": "en",
    "ja": "ja",
    "zh": "zh-CN",
    "zh-cn": "zh-CN",
    "zh-tw": "zh-TW",
    "ko": "ko",
    "fr": "fr",
    "de": "de",
    "es": "es",
    "pt": "pt",
    "th": "th",
    "id": "id",
    "ar": "ar",
    "ru": "ru",
    "it": "it",
}

# Pre-populated & Runtime Translation Cache: (text.lower(), src_lang, target_lang) -> translated_text
_TRANSLATION_CACHE: Dict[Tuple[str, str, str], str] = {
    # Common COCO vocabulary instant translations
    ("apple", "en", "vi"): "Quả táo",
    ("apple", "en", "ja"): "リンゴ",
    ("apple", "en", "zh"): "苹果",
    ("apple", "en", "fr"): "Pomme",
    ("apple", "en", "es"): "Manzana",
    ("apple", "en", "de"): "Apfel",
    ("apple", "en", "ko"): "사과",
    ("person", "en", "vi"): "Người",
    ("person", "en", "ja"): "人",
    ("person", "en", "zh"): "人",
    ("person", "en", "fr"): "Personne",
    ("person", "en", "es"): "Persona",
    ("person", "en", "de"): "Person",
    ("person", "en", "ko"): "사람",
    ("car", "en", "vi"): "Xe ô tô",
    ("car", "en", "ja"): "車",
    ("car", "en", "zh"): "汽车",
    ("car", "en", "fr"): "Voiture",
    ("car", "en", "es"): "Coche",
    ("car", "en", "de"): "Auto",
    ("car", "en", "ko"): "자동차",
    ("bicycle", "en", "vi"): "Xe đạp",
    ("bicycle", "en", "ja"): "自転車",
    ("bicycle", "en", "zh"): "自行车",
    ("bicycle", "en", "fr"): "Vélo",
    ("bicycle", "en", "es"): "Bicicleta",
    ("bicycle", "en", "de"): "Fahrrad",
    ("bicycle", "en", "ko"): "자전거",
    ("dog", "en", "vi"): "Con chó",
    ("dog", "en", "ja"): "犬",
    ("dog", "en", "zh"): "狗",
    ("dog", "en", "fr"): "Chien",
    ("dog", "en", "es"): "Perro",
    ("dog", "en", "de"): "Hund",
    ("dog", "en", "ko"): "개",
    ("cat", "en", "vi"): "Con mèo",
    ("cat", "en", "ja"): "猫",
    ("cat", "en", "zh"): "猫",
    ("cat", "en", "fr"): "Chat",
    ("cat", "en", "es"): "Gato",
    ("cat", "en", "de"): "Katze",
    ("cat", "en", "ko"): "고양이",
    ("book", "en", "vi"): "Cuốn sách",
    ("book", "en", "ja"): "本",
    ("book", "en", "zh"): "书",
    ("book", "en", "fr"): "Livre",
    ("book", "en", "es"): "Libro",
    ("book", "en", "de"): "Buch",
    ("book", "en", "ko"): "책",
    ("laptop", "en", "vi"): "Máy tính xách tay",
    ("laptop", "en", "ja"): "ノートパソコン",
    ("laptop", "en", "zh"): "笔记本电脑",
    ("laptop", "en", "fr"): "Ordinateur portable",
    ("laptop", "en", "es"): "Portátil",
    ("laptop", "en", "de"): "Laptop",
    ("laptop", "en", "ko"): "노트북",
    ("cell phone", "en", "vi"): "Điện thoại di động",
    ("cell phone", "en", "ja"): "携帯電話",
    ("cell phone", "en", "zh"): "手机",
    ("cell phone", "en", "fr"): "Téléphone portable",
    ("cell phone", "en", "es"): "Teléfono móvil",
    ("cell phone", "en", "de"): "Handy",
    ("cell phone", "en", "ko"): "휴대전화",
    ("cup", "en", "vi"): "Chiếc cốc",
    ("cup", "en", "ja"): "カップ",
    ("cup", "en", "zh"): "杯子",
    ("cup", "en", "fr"): "Tasse",
    ("cup", "en", "es"): "Taza",
    ("cup", "en", "de"): "Tasse",
    ("cup", "en", "ko"): "컵",
    ("bottle", "en", "vi"): "Chai lọ",
    ("bottle", "en", "ja"): "ボトル",
    ("bottle", "en", "zh"): "瓶子",
    ("bottle", "en", "fr"): "Bouteille",
    ("bottle", "en", "es"): "Botella",
    ("bottle", "en", "de"): "Flasche",
    ("bottle", "en", "ko"): "병",
    ("chair", "en", "vi"): "Cái ghế",
    ("chair", "en", "ja"): "椅子",
    ("chair", "en", "zh"): "椅子",
    ("chair", "en", "fr"): "Chaise",
    ("chair", "en", "es"): "Silla",
    ("chair", "en", "de"): "Stuhl",
    ("chair", "en", "ko"): "의자",
}

class TranslationService:
    @staticmethod
    def _detect_simple_language(text: str) -> str:
        """
        Simple heuristic language detection for Vietnamese vs other scripts if sourceLanguage='auto'.
        """
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
        resolved_src = source_lang.lower().strip()
        if resolved_src == "auto":
            resolved_src = TranslationService._detect_simple_language(normalized_text)
            logger.info(f"[Translation] Auto-detected source language: {resolved_src}")

        resolved_target = target_lang.lower().strip()

        # Short-circuit if source and target languages are identical
        if resolved_src == resolved_target:
            return TranslationData(
                sourceText=normalized_text,
                translatedText=normalized_text,
                sourceLanguage=resolved_src,
                targetLanguage=resolved_target,
                processingTimeMs=max(1, int((time.time() - start_time) * 1000))
            )

        # Check full text cache
        cache_key = (normalized_text.lower(), resolved_src, resolved_target)
        if cache_key in _TRANSLATION_CACHE:
            cached_res = _TRANSLATION_CACHE[cache_key]
            return TranslationData(
                sourceText=normalized_text,
                translatedText=cached_res,
                sourceLanguage=resolved_src,
                targetLanguage=resolved_target,
                processingTimeMs=1
            )

        # Perform translation line by line preserving formatting
        lines = normalized_text.split("\n")
        translated_lines = []

        for line in lines:
            line_stripped = line.strip()
            if not line_stripped:
                translated_lines.append("")
                continue

            line_cache_key = (line_stripped.lower(), resolved_src, resolved_target)
            if line_cache_key in _TRANSLATION_CACHE:
                translated_lines.append(_TRANSLATION_CACHE[line_cache_key])
                continue

            line_trans = None

            # Attempt 1: MyMemoryTranslator with mapped locales
            src_mm = MYMEMORY_LANG_MAP.get(resolved_src, "en-US")
            target_mm = MYMEMORY_LANG_MAP.get(resolved_target, "vi-VN")

            try:
                mm_translator = MyMemoryTranslator(source=src_mm, target=target_mm)
                res = mm_translator.translate(line_stripped)
                if res and "MYMEMORY WARNING" not in str(res).upper() and str(res).strip():
                    line_trans = str(res).strip()
            except Exception as e:
                logger.warning(f"[Translation] MyMemoryTranslator note: {e}")

            # Attempt 2: GoogleTranslator fallback
            if not line_trans:
                try:
                    src_g = GOOGLE_LANG_MAP.get(resolved_src, resolved_src)
                    target_g = GOOGLE_LANG_MAP.get(resolved_target, resolved_target)
                    translator = GoogleTranslator(source=src_g, target=target_g)
                    res = translator.translate(line_stripped)
                    if res and "Error" not in str(res):
                        line_trans = str(res).strip()
                except Exception as e:
                    logger.warning(f"[Translation] GoogleTranslator note: {e}")

            # Final fallback: retain original text
            if not line_trans:
                line_trans = line_stripped

            # Cache line result
            _TRANSLATION_CACHE[line_cache_key] = line_trans
            translated_lines.append(line_trans)

        full_translated_text = "\n".join(translated_lines)
        _TRANSLATION_CACHE[cache_key] = full_translated_text
        elapsed_ms = max(1, int((time.time() - start_time) * 1000))

        logger.info(f"[Translation] Translated {len(lines)} lines ({resolved_src} -> {resolved_target}) in {elapsed_ms}ms")

        return TranslationData(
            sourceText=normalized_text,
            translatedText=full_translated_text,
            sourceLanguage=resolved_src,
            targetLanguage=resolved_target,
            processingTimeMs=elapsed_ms
        )
