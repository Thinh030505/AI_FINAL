import unicodedata
import re
import logging
from typing import List
from app.models.ocr_model import TextLine

logger = logging.getLogger("ai-service")

# Comprehensive Vietnamese UI and document vocabulary mapping for OCR diacritic restoration
VIETNAMESE_UI_CORRECTIONS = {
    # Hiển thị
    "hin th": "hiển thị",
    "hien th": "hiển thị",
    "hin thi": "hiển thị",
    "hien thi": "hiển thị",
    
    # Thông tin
    "thng tin": "thông tin",
    "thong tin": "thông tin",
    "thông tin": "thông tin",

    # Hồ sơ
    "h so": "hồ sơ",
    "h sô": "hồ sơ",
    "ho so": "hồ sơ",
    "ho sô": "hồ sơ",
    "hồ so": "hồ sơ",

    # Phiếu tiếp nhận & Lưu hồ sơ
    "lp phiu tip nhn": "Lập phiếu tiếp nhận",
    "lap phieu tiep nhan": "Lập phiếu tiếp nhận",
    "luu h so": "Lưu hồ sơ",
    "luu ho so": "Lưu hồ sơ",

    # Các từ phổ biến khác
    "tai khoan": "tài khoản",
    "dang nhap": "đăng nhập",
    "dang ky": "đăng ký",
    "mat khau": "mật khẩu",
    "he thong": "hệ thống",
    "doanh nghiep": "doanh nghiệp",
    "nguoi dung": "người dùng",
    "danh sach": "danh sách",
    "trang thai": "trạng thái",
    "bao cao": "báo cáo",
    "quan ly": "quản lý",
    "thuc hien": "thực hiện",
    "tim kiem": "tìm kiếm",
    "xac nhan": "xác nhận",
    "huy bo": "hủy bỏ",
    "cai dat": "cài đặt",
    "trang chu": "trang chủ",
    "thanh cong": "thành công",
    "that bai": "thất bại",
    "chi tiet": "chi tiết",
    "thoi gian": "thời gian",
    "ngay tao": "ngày tạo",
    "du lieu": "dữ liệu",
    "hinh anh": "hình ảnh",
}

class PostprocessingService:
    @staticmethod
    def normalize_unicode(text: str) -> str:
        """
        Ensures strict UTF-8 NFC Unicode normalization for Vietnamese text.
        """
        if not text:
            return ""
        # Convert NFD (decomposed) or mixed diacritics to NFC (composed)
        normalized = unicodedata.normalize("NFC", text)
        # Clean replacement characters \ufffd if present
        normalized = normalized.replace("\ufffd", "").replace("", "")
        return normalized

    @staticmethod
    def postprocess_text(text: str) -> str:
        """
        Applies Vietnamese diacritic restoration and character cleanup.
        """
        if not text:
            return ""

        # Step 1: NFC Normalization
        text = PostprocessingService.normalize_unicode(text)

        # Step 2: Phrase & N-gram matching for common Vietnamese terms
        text_lower = text.lower()
        for phrase_raw, phrase_fix in VIETNAMESE_UI_CORRECTIONS.items():
            if phrase_raw in text_lower:
                pattern = re.compile(re.escape(phrase_raw), re.IGNORECASE)
                
                def match_replace(match):
                    word_match = match.group(0)
                    if word_match.isupper():
                        return phrase_fix.upper()
                    elif word_match.istitle():
                        return phrase_fix.title()
                    else:
                        return phrase_fix

                text = pattern.sub(match_replace, text)

        # Step 3: Single word replacements
        words = text.split(" ")
        corrected_words = []
        for word in words:
            word_clean = word.strip(".,;:!?()[]{}'\"")
            word_lower = word_clean.lower()
            if word_lower in VIETNAMESE_UI_CORRECTIONS:
                fix = VIETNAMESE_UI_CORRECTIONS[word_lower]
                if word_clean.isupper():
                    fix = fix.upper()
                elif word_clean.istitle():
                    fix = fix.title()
                word = word.replace(word_clean, fix)
            corrected_words.append(word)

        return " ".join(corrected_words)

    @staticmethod
    def postprocess_lines(lines: List[TextLine]) -> List[TextLine]:
        """
        Processes a list of TextLine objects, normalizing text and upgrading confidence.
        """
        processed_lines: List[TextLine] = []
        for line in lines:
            cleaned_text = PostprocessingService.postprocess_text(line.text)
            
            # Count Vietnamese tone marks to adjust confidence score
            diacritic_count = sum(1 for c in cleaned_text if ord(c) > 127)
            adjusted_confidence = line.confidence
            if diacritic_count > 0 and line.confidence > 0.7:
                adjusted_confidence = min(0.9999, line.confidence * 1.02)

            processed_lines.append(TextLine(
                text=cleaned_text,
                confidence=round(adjusted_confidence, 4),
                box=line.box
            ))
        return processed_lines
