import time
import logging
from typing import List, Tuple, Dict, Any
import numpy as np
from app.models.ocr_model import OCRData, TextLine
from app.services.postprocessing_service import PostprocessingService

logger = logging.getLogger("ai-service")

class OCRService:
    _instance = None
    _ocr_engine = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(OCRService, cls).__new__(cls)
            cls._instance._init_paddleocr()
        return cls._instance

    def _init_paddleocr(self):
        try:
            from paddleocr import PaddleOCR
            logger.info("[OCR] Initializing PaddleOCR engine with lang='vi'...")
            self._ocr_engine = PaddleOCR(
                lang='vi'
            )
            logger.info("[OCR] PaddleOCR engine initialized successfully.")
        except Exception as e:
            logger.error(f"[OCR] CRITICAL: Failed to initialize PaddleOCR engine: {e}", exc_info=True)
            self._ocr_engine = None
            raise RuntimeError(f"PaddleOCR Engine initialization failed: {str(e)}")

    @staticmethod
    def _sort_lines_spatially(lines: List[TextLine]) -> List[TextLine]:
        """
        Robust 2D Spatial Box Line Ordering Algorithm:
        - Groups bounding boxes vertically by line height overlap tolerance.
        - Sorts line groups top-to-bottom by Y-center, then left-to-right by X-start.
        """
        if not lines or len(lines) <= 1:
            return lines

        # Calculate bounding box info: (y_center, x_start, height, line_obj)
        box_items = []
        for line in lines:
            if line.box and len(line.box) >= 4:
                pts = line.box
                ys = [p[1] for p in pts]
                xs = [p[0] for p in pts]
                y_min, y_max = min(ys), max(ys)
                x_min = min(xs)
                h = max(1, y_max - y_min)
                y_center = (y_min + y_max) / 2.0
                box_items.append({
                    'y_center': y_center,
                    'x_min': x_min,
                    'h': h,
                    'line': line
                })
            else:
                box_items.append({
                    'y_center': 0,
                    'x_min': 0,
                    'h': 20,
                    'line': line
                })

        # Sort primary by y_center
        box_items.sort(key=lambda b: b['y_center'])

        # Group lines that have vertical overlap
        line_groups = []
        current_group = [box_items[0]]

        for item in box_items[1:]:
            prev_center = current_group[-1]['y_center']
            prev_h = current_group[-1]['h']
            # If current item's center is within half the height of previous, group together
            if abs(item['y_center'] - prev_center) < (prev_h * 0.5):
                current_group.append(item)
            else:
                line_groups.append(current_group)
                current_group = [item]
        if current_group:
            line_groups.append(current_group)

        # Sort each line group from left to right (x_min)
        sorted_lines = []
        for group in line_groups:
            group.sort(key=lambda b: b['x_min'])
            for b in group:
                sorted_lines.append(b['line'])

        return sorted_lines

    def _parse_paddle_result(
        self,
        raw_result: Any
    ) -> Tuple[List[TextLine], float, float]:
        """
        Parses raw PaddleOCR result into TextLine list and computes average & minimum confidence.
        """
        lines: List[TextLine] = []

        if not raw_result or len(raw_result) == 0 or raw_result[0] is None:
            return [], 0.0, 0.0

        first_res = raw_result[0]

        # Case A: PaddleOCR 3.7+ dictionary output format
        if isinstance(first_res, dict):
            rec_texts = first_res.get('rec_texts', [])
            rec_scores = first_res.get('rec_scores', [])
            rec_polys = first_res.get('rec_polys', first_res.get('dt_polys', []))

            for idx, text in enumerate(rec_texts):
                text_str = str(text).strip()
                if not text_str:
                    continue
                confidence = float(rec_scores[idx]) if idx < len(rec_scores) else 1.0
                box_poly = rec_polys[idx] if idx < len(rec_polys) else []
                box = [[int(pt[0]), int(pt[1])] for pt in box_poly] if len(box_poly) >= 4 else [[0,0],[0,0],[0,0],[0,0]]

                lines.append(TextLine(
                    text=text_str,
                    confidence=round(confidence, 4),
                    box=box
                ))

        # Case B: Standard list/tuple format [[box, (text, confidence)], ...]
        elif isinstance(first_res, (list, tuple)):
            for res in first_res:
                if isinstance(res, (list, tuple)) and len(res) >= 2:
                    box_raw = res[0]
                    text_tuple = res[1]
                    text_str = str(text_tuple[0]).strip()
                    if not text_str:
                        continue
                    confidence = float(text_tuple[1])
                    box = [[int(pt[0]), int(pt[1])] for pt in box_raw]

                    lines.append(TextLine(
                        text=text_str,
                        confidence=round(confidence, 4),
                        box=box
                    ))

        if not lines:
            return [], 0.0, 0.0

        # Sort lines using 2D Spatial Box Ordering
        lines = OCRService._sort_lines_spatially(lines)

        avg_conf = sum(line.confidence for line in lines) / len(lines)
        min_conf = min(line.confidence for line in lines)
        return lines, round(avg_conf, 4), round(min_conf, 4)

    def run_smart_ocr(
        self,
        img_pass1: np.ndarray,
        img_pass2_func=None
    ) -> OCRData:
        start_time = time.time()

        if self._ocr_engine is None:
            self._init_paddleocr()

        # PASS 1: High-precision adaptive image inference
        logger.info("[OCR] Starting Pass 1 (Adaptive Preprocessing)...")
        raw_res1 = self._ocr_engine.ocr(img_pass1)
        lines1, avg_conf1, min_conf1 = self._parse_paddle_result(raw_res1)
        logger.info(f"[OCR] Pass 1 complete: lines={len(lines1)}, avg_conf={avg_conf1}, min_conf={min_conf1}")

        selected_lines = lines1
        selected_pass = 1
        is_uncertain = False

        # Evaluate if Pass 2 (Stability check) is needed
        # Only run Pass 2 if text lines were detected but have borderline confidence (<0.90 or min <0.75)
        needs_pass2 = (len(lines1) > 0 and (avg_conf1 < 0.90 or min_conf1 < 0.75)) and img_pass2_func is not None

        if needs_pass2:
            try:
                logger.info("[OCR] Triggering Pass 2 (Contrast Boost Stability Check)...")
                img_pass2 = img_pass2_func()
                raw_res2 = self._ocr_engine.ocr(img_pass2)
                lines2, avg_conf2, min_conf2 = self._parse_paddle_result(raw_res2)
                logger.info(f"[OCR] Pass 2 complete: lines={len(lines2)}, avg_conf={avg_conf2}, min_conf={min_conf2}")

                # Compare Pass 1 vs Pass 2
                diacritics1 = sum(sum(1 for c in line.text if ord(c) > 127) for line in lines1)
                diacritics2 = sum(sum(1 for c in line.text if ord(c) > 127) for line in lines2)

                if abs(len(lines1) - len(lines2)) > 2:
                    is_uncertain = True

                if (diacritics2 > diacritics1 and avg_conf2 >= avg_conf1 - 0.05) or (avg_conf2 > avg_conf1 + 0.05):
                    selected_lines = lines2
                    selected_pass = 2
                    logger.info("[OCR] Selected Pass 2 result based on higher accuracy / diacritic count.")
            except Exception as p2_err:
                logger.warning(f"[OCR] Pass 2 execution note: {p2_err}. Falling back to Pass 1.")

        # Post-process winning lines (Unicode NFC normalization & Vietnamese diacritic restoration)
        raw_full_text = "\n".join([line.text for line in selected_lines])
        final_lines = PostprocessingService.postprocess_lines(selected_lines)
        processed_full_text = "\n".join([line.text for line in final_lines])

        elapsed_ms = max(1, int((time.time() - start_time) * 1000))
        final_avg_conf = round(sum(l.confidence for l in final_lines) / max(1, len(final_lines)), 4)
        final_min_conf = round(min((l.confidence for l in final_lines), default=0.0), 4)

        return OCRData(
            fullText=processed_full_text,
            lines=final_lines,
            processingTimeMs=elapsed_ms,
            rawFullText=raw_full_text,
            avgConfidence=final_avg_conf,
            minConfidence=final_min_conf,
            isUncertain=is_uncertain,
            debug={
                "selectedPass": selected_pass,
                "avgConfidence": final_avg_conf,
                "minConfidence": final_min_conf,
                "detectedLines": len(final_lines),
                "processingTimeMs": elapsed_ms
            }
        )

# Global singleton getter
def get_ocr_service() -> OCRService:
    return OCRService()
