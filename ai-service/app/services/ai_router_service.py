import time
import logging
from typing import Dict, Any, Optional, Union
import numpy as np
import cv2
from PIL import Image

logger = logging.getLogger("ai-service.ai_router")

class RoutingDecision:
    def __init__(
        self,
        mode: str,
        run_yolo: bool,
        run_segformer: bool,
        run_ocr: bool,
        run_vision: bool,
        text_likelihood_score: float,
        is_document_or_receipt: bool,
        reason: str,
        processing_time_ms: float,
        run_person_analysis: bool = True,
        run_open_vocab: bool = False,
        run_tiling: bool = False,
        imgsz: int = 960,
    ):
        self.mode = mode
        self.run_yolo = run_yolo
        self.run_segformer = run_segformer
        self.run_ocr = run_ocr
        self.run_vision = run_vision
        self.text_likelihood_score = text_likelihood_score
        self.is_document_or_receipt = is_document_or_receipt
        self.reason = reason
        self.processing_time_ms = processing_time_ms
        self.run_person_analysis = run_person_analysis
        self.run_open_vocab = run_open_vocab
        self.run_tiling = run_tiling
        self.imgsz = imgsz

    def to_dict(self) -> Dict[str, Any]:
        return {
            "mode": self.mode,
            "runYolo": self.run_yolo,
            "runSegFormer": self.run_segformer,
            "runOcr": self.run_ocr,
            "runVision": self.run_vision,
            "runPersonAnalysis": self.run_person_analysis,
            "runOpenVocab": self.run_open_vocab,
            "runTiling": self.run_tiling,
            "imgsz": self.imgsz,
            "textLikelihoodScore": round(self.text_likelihood_score, 3),
            "isDocumentOrReceipt": self.is_document_or_receipt,
            "reason": self.reason,
            "processingTimeMs": round(self.processing_time_ms, 2),
        }

class AIRouterService:
    """
    Lightweight, ultra-fast (<5ms) heuristic router for multimodal AI pipeline.
    Modes supported:
      - 'auto' / 'balanced' (Default): skips OCR on natural scenes, skips SegFormer on pure documents.
      - 'fast': skips OCR unless high text density or forced; skips SegFormer on documents.
      - 'accurate': full coverage across models.
    """

    @staticmethod
    def _compute_heuristics(img_bgr: np.ndarray) -> tuple[float, bool]:
        """
        Fast edge and stroke density heuristics in <3ms.
        Returns: (text_likelihood_score [0.0 - 1.0], is_document_or_receipt [bool])
        """
        h, w = img_bgr.shape[:2]
        # Resize to fixed small canvas for lightning fast uniform profiling
        target_size = 384
        scale = target_size / max(h, w) if max(h, w) > target_size else 1.0
        if scale < 1.0:
            small_bgr = cv2.resize(img_bgr, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        else:
            small_bgr = img_bgr

        sh, sw = small_bgr.shape[:2]
        gray = cv2.cvtColor(small_bgr, cv2.COLOR_BGR2GRAY)

        # 1. Background Luminance & Uniformity check (Documents/Receipts are >75% high luminance white/light paper)
        light_pixels = np.sum(gray > 200)
        light_ratio = light_pixels / float(sh * sw)
        is_high_luminance_bg = light_ratio > 0.65

        # Saturation check (Natural scenes have high saturation; documents/receipts have near-zero saturation)
        hsv = cv2.cvtColor(small_bgr, cv2.COLOR_BGR2HSV)
        sat_mean = np.mean(hsv[:, :, 1])  # 0 to 255
        is_desaturated = sat_mean < 35.0

        # 2. Horizontal vs Vertical Sobel Gradients (Text creates high horizontal gradient transitions)
        grad_x = cv2.Sobel(gray, cv2.CV_16S, 1, 0, ksize=3)
        abs_grad_x = cv2.convertScaleAbs(grad_x)
        edges = cv2.adaptiveThreshold(
            abs_grad_x, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 11, -2
        )
        edge_density = np.count_nonzero(edges) / float(sh * sw)

        # 3. Text likelihood score calculation (0.0 to 1.0)
        # Typical landscape edge_density is < 0.05. Receipts/text documents are 0.15 - 0.40.
        score = 0.0

        if edge_density > 0.10:
            score += min(0.5, (edge_density - 0.10) * 2.5)

        if is_high_luminance_bg and is_desaturated:
            score += 0.4
            is_doc = True
        elif is_desaturated and edge_density > 0.08:
            score += 0.25
            is_doc = True
        else:
            is_doc = False

        # Additional penalty for high color saturation landscapes (beach, sky, forest)
        if sat_mean > 60 and edge_density < 0.12:
            score = max(0.02, score - 0.3)

        score = max(0.0, min(1.0, score))
        return score, is_doc

    def route_analysis(
        self,
        image_input: Union[np.ndarray, Image.Image, bytes],
        mode: Optional[str] = "balanced",
        force_ocr: Optional[bool] = False,
    ) -> RoutingDecision:
        start_t = time.perf_counter()
        normalized_mode = (mode or "balanced").strip().lower()
        if normalized_mode not in ["auto", "fast", "balanced", "accurate", "everything"]:
            normalized_mode = "balanced"

        try:
            # Decode to ndarray if needed
            img_bgr = None
            if isinstance(image_input, np.ndarray):
                img_bgr = image_input
            elif isinstance(image_input, Image.Image):
                rgb_arr = np.array(image_input.convert("RGB"))
                img_bgr = cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2BGR)
            elif isinstance(image_input, bytes):
                np_arr = np.frombuffer(image_input, np.uint8)
                img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if img_bgr is None or img_bgr.size == 0:
                elapsed = (time.perf_counter() - start_t) * 1000
                return RoutingDecision(
                    mode=normalized_mode,
                    run_yolo=True,
                    run_segformer=True,
                    run_ocr=True,
                    run_vision=True,
                    text_likelihood_score=0.5,
                    is_document_or_receipt=False,
                    reason="Invalid image payload; fallback to full balanced analysis.",
                    processing_time_ms=elapsed,
                )

            h_in, w_in = img_bgr.shape[:2]
            text_score, is_doc = self._compute_heuristics(img_bgr)

            # Default decisions
            run_yolo = True
            run_segformer = True
            run_ocr = False
            run_vision = True
            run_person_analysis = True
            run_open_vocab = False
            run_tiling = False
            imgsz = 960
            reasons = []

            # 1. Force OCR Override
            if force_ocr:
                run_ocr = True
                reasons.append("OCR forced by user request.")

            # 2. Mode-specific decision matrix
            if normalized_mode == "fast":
                # Fast mode: aggressive latency reduction
                imgsz = 640
                run_person_analysis = False
                run_open_vocab = False
                run_tiling = False
                if not force_ocr:
                    run_ocr = text_score >= 0.45 or is_doc
                    if run_ocr:
                        reasons.append(f"Fast mode: OCR enabled due to high text likelihood ({text_score:.2f}).")
                    else:
                        reasons.append("Fast mode: OCR skipped to minimize latency.")

                # Skip SegFormer on documents / receipts
                if is_doc:
                    run_segformer = False
                    reasons.append("Document/receipt detected: SegFormer skipped.")

            elif normalized_mode in ["balanced", "auto"]:
                # Balanced mode: smart conditional OCR & SegFormer + person crop
                imgsz = 960
                run_person_analysis = True
                run_open_vocab = False
                run_tiling = False
                if not force_ocr:
                    if is_doc or text_score >= 0.28:
                        run_ocr = True
                        reasons.append(f"Balanced mode: OCR enabled (text likelihood {text_score:.2f}).")
                    else:
                        run_ocr = False
                        reasons.append(f"Balanced mode: OCR skipped for low-text scene ({text_score:.2f}).")

                if is_doc and text_score > 0.45:
                    run_segformer = False
                    reasons.append("Pure document/receipt: SegFormer skipped.")
                else:
                    run_segformer = True

            elif normalized_mode == "accurate":
                # Accurate mode: prioritize maximal scene information
                imgsz = 1280
                run_person_analysis = True
                run_open_vocab = True
                run_segformer = True
                run_tiling = False
                if not force_ocr:
                    run_ocr = text_score >= 0.15
                    if run_ocr:
                        reasons.append("Accurate mode: OCR enabled for comprehensive extraction.")
                    else:
                        reasons.append("Accurate mode: OCR skipped as no text signals detected.")

            elif normalized_mode == "everything":
                # Everything mode: complete visual inventory (multi-scale, person deep analysis, open-vocab, tiling if large)
                imgsz = 1280
                run_person_analysis = True
                run_open_vocab = True
                run_segformer = True
                run_ocr = True if (force_ocr or is_doc or text_score >= 0.25) else False
                run_tiling = max(h_in, w_in) >= 2000
                reasons.append("Everything mode: full multimodal coarse-to-fine visual inventory active.")
                if run_tiling:
                    reasons.append(f"Tiling enabled for ultra-high-resolution canvas ({w_in}x{h_in}).")

            elapsed_ms = (time.perf_counter() - start_t) * 1000
            final_reason = " | ".join(reasons) if reasons else f"Mode: {normalized_mode}"

            return RoutingDecision(
                mode=normalized_mode,
                run_yolo=run_yolo,
                run_segformer=run_segformer,
                run_ocr=run_ocr,
                run_vision=run_vision,
                text_likelihood_score=text_score,
                is_document_or_receipt=is_doc,
                reason=final_reason,
                processing_time_ms=elapsed_ms,
                run_person_analysis=run_person_analysis,
                run_open_vocab=run_open_vocab,
                run_tiling=run_tiling,
                imgsz=imgsz,
            )

        except Exception as e:
            logger.warning(f"[AIRouter] Heuristic exception: {e}. Falling back to default balanced routing.")
            elapsed_ms = (time.perf_counter() - start_t) * 1000
            return RoutingDecision(
                mode=normalized_mode,
                run_yolo=True,
                run_segformer=True,
                run_ocr=True,
                run_vision=True,
                text_likelihood_score=0.5,
                is_document_or_receipt=False,
                reason=f"Routing error fallback: {str(e)}",
                processing_time_ms=elapsed_ms,
            )

_ai_router_service: Optional[AIRouterService] = None

def get_ai_router_service() -> AIRouterService:
    global _ai_router_service
    if _ai_router_service is None:
        _ai_router_service = AIRouterService()
    return _ai_router_service
