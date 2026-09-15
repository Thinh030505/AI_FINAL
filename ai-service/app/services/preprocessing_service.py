import os
import io
import httpx
import cv2
import numpy as np
from PIL import Image
import logging
from typing import Union, Optional, Tuple, List, Dict, Any

logger = logging.getLogger("ai-service.preprocessing")

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

class ProcessedImageBundle:
    """
    In-memory unified image container for Deep Multimodal Image Understanding.
    STRICTLY preserves unscaled original pixels (original_bytes, original_bgr, original_rgb, original_pil)
    and provides lazy multi-scale caches (640, 960, 1280) and precision crop functions mapping
    directly to/from original image coordinates.
    """
    def __init__(
        self,
        original_bytes: bytes,
        bgr: np.ndarray,
        rgb: np.ndarray,
        pil_image: Image.Image,
        width: int,
        height: int
    ):
        # Strict preservation of original high-resolution representations
        self.original_bytes = original_bytes
        self.original_bgr = bgr
        self.original_rgb = rgb
        self.original_pil = pil_image
        self.original_width = width
        self.original_height = height

        # Backwards-compatible aliases
        self.bgr = bgr
        self.rgb = rgb
        self.pil_image = pil_image
        self.width = width
        self.height = height

        # Lazy multi-scale cached representations
        self._cache_detector_640: Optional[np.ndarray] = None
        self._cache_detector_960: Optional[np.ndarray] = None
        self._cache_detector_1280: Optional[np.ndarray] = None
        self._cache_global_1280_pil: Optional[Image.Image] = None

    @classmethod
    def from_bytes(cls, image_bytes: bytes) -> "ProcessedImageBundle":
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img_bgr is None:
            # Fallback PIL decode
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img_rgb = np.array(pil_img)
            img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
        else:
            img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(img_rgb)

        h, w = img_bgr.shape[:2]
        return cls(
            original_bytes=image_bytes,
            bgr=img_bgr,
            rgb=img_rgb,
            pil_image=pil_img,
            width=w,
            height=h
        )

    def get_resized_pil(self, max_dim: int = 1280) -> Image.Image:
        """
        Returns a resized PIL Image if dimensions exceed max_dim.
        Useful for optimizing Gemini Vision API token usage and latency.
        """
        if max(self.original_width, self.original_height) <= max_dim:
            return self.original_pil

        if max_dim == 1280 and self._cache_global_1280_pil is not None:
            return self._cache_global_1280_pil

        scale = max_dim / float(max(self.original_width, self.original_height))
        new_w = max(1, int(self.original_width * scale))
        new_h = max(1, int(self.original_height * scale))
        resized = self.original_pil.resize((new_w, new_h), Image.Resampling.BILINEAR)

        if max_dim == 1280:
            self._cache_global_1280_pil = resized
        return resized

    @property
    def global_1280(self) -> Image.Image:
        """Pre-cached 1280px PIL image for global multimodal inspection"""
        return self.get_resized_pil(1280)

    @property
    def detector_640(self) -> np.ndarray:
        """Cached 640px BGR image for ultra-fast detection"""
        if self._cache_detector_640 is None:
            self._cache_detector_640, _ = self.get_detector_bgr(640)
        return self._cache_detector_640

    @property
    def detector_960(self) -> np.ndarray:
        """Cached 960px BGR image for balanced detection"""
        if self._cache_detector_960 is None:
            self._cache_detector_960, _ = self.get_detector_bgr(960)
        return self._cache_detector_960

    @property
    def detector_1280(self) -> np.ndarray:
        """Cached 1280px BGR image for accurate/everything detection"""
        if self._cache_detector_1280 is None:
            self._cache_detector_1280, _ = self.get_detector_bgr(1280)
        return self._cache_detector_1280

    def get_detector_bgr(self, target_max_dim: int = 960) -> tuple[np.ndarray, float]:
        """
        Returns resized BGR array and scale factor (scaled_dim / orig_dim).
        Does not upscale if image is already smaller than target_max_dim.
        """
        max_side = max(self.original_width, self.original_height)
        if max_side <= target_max_dim:
            return self.original_bgr, 1.0

        scale = target_max_dim / float(max_side)
        new_w = max(1, int(self.original_width * scale))
        new_h = max(1, int(self.original_height * scale))
        resized = cv2.resize(self.original_bgr, (new_w, new_h), interpolation=cv2.INTER_AREA)
        return resized, scale

    def map_bbox_to_original(
        self,
        bbox: Union[list[float], tuple[float, float, float, float]],
        from_width: int,
        from_height: int
    ) -> list[int]:
        """
        Converts bounding box [x1, y1, x2, y2] from a scaled canvas back to the original image coordinates.
        Clips tightly to [0, 0, original_width, original_height].
        """
        if from_width <= 0 or from_height <= 0:
            return [int(b) for b in bbox]

        scale_x = self.original_width / float(from_width)
        scale_y = self.original_height / float(from_height)

        x1 = max(0, min(self.original_width - 1, int(round(bbox[0] * scale_x))))
        y1 = max(0, min(self.original_height - 1, int(round(bbox[1] * scale_y))))
        x2 = max(x1 + 1, min(self.original_width, int(round(bbox[2] * scale_x))))
        y2 = max(y1 + 1, min(self.original_height, int(round(bbox[3] * scale_y))))
        return [x1, y1, x2, y2]

    def crop_original(
        self,
        bbox: Union[list[int], tuple[int, int, int, int], list[float]],
        padding_ratio: float = 0.10
    ) -> tuple[np.ndarray, Image.Image, tuple[int, int, int, int]]:
        """
        Crops directly from the ORIGINAL HIGH-RESOLUTION image without intermediate loss.
        Applies context padding while respecting canvas boundaries.
        Returns:
            (crop_bgr, crop_pil, (crop_x1, crop_y1, crop_x2, crop_y2))
        The returned absolute coordinates permit lossless mapping of any micro-detection back to full image.
        """
        x1, y1, x2, y2 = [int(round(c)) for c in bbox]
        w = max(1, x2 - x1)
        h = max(1, y2 - y1)

        pad_x = int(w * padding_ratio)
        pad_y = int(h * padding_ratio)

        crop_x1 = max(0, x1 - pad_x)
        crop_y1 = max(0, y1 - pad_y)
        crop_x2 = min(self.original_width, x2 + pad_x)
        crop_y2 = min(self.original_height, y2 + pad_y)

        crop_bgr = self.original_bgr[crop_y1:crop_y2, crop_x1:crop_x2].copy()
        crop_rgb = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2RGB)
        crop_pil = Image.fromarray(crop_rgb)

        return crop_bgr, crop_pil, (crop_x1, crop_y1, crop_x2, crop_y2)

class PreprocessingService:
    @staticmethod
    async def fetch_image_from_url(url: str) -> bytes:
        async with httpx.AsyncClient(timeout=25.0, follow_redirects=True, headers=HEADERS) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.content

    @classmethod
    async def prepare_image_bundle(cls, image_input: Union[str, bytes, ProcessedImageBundle]) -> ProcessedImageBundle:
        """
        Builds or returns the in-memory ProcessedImageBundle from URL, bytes, file path, or existing bundle.
        """
        if isinstance(image_input, ProcessedImageBundle):
            return image_input

        if isinstance(image_input, bytes):
            return ProcessedImageBundle.from_bytes(image_input)

        if isinstance(image_input, str):
            if image_input.startswith("http://") or image_input.startswith("https://"):
                raw_bytes = await cls.fetch_image_from_url(image_input)
                return ProcessedImageBundle.from_bytes(raw_bytes)
            elif os.path.exists(image_input):
                with open(image_input, "rb") as f:
                    return ProcessedImageBundle.from_bytes(f.read())
            else:
                raise ValueError(f"Invalid image path or URL: {image_input}")

        raise ValueError(f"Unsupported image input type: {type(image_input)}")

    @staticmethod
    def preprocess_image_bytes(
        image_bytes: bytes,
        mode: str = "adaptive",
        target_min_dim: int = 800,
        max_dim: int = 2400,
        padding_px: int = 15
    ) -> np.ndarray:
        """
        High-precision multi-stage adaptive preprocessing pipeline for Vietnamese/English OCR text recognition.
        - Adds 15px border padding so top Vietnamese diacritics are never clipped.
        - Detects dark UI themes and inverts color space for clean text detection.
        - Uses Lanczos-4 interpolation for small text upscaling.
        """
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            # Fallback PIL decode
            pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

        h, w = img.shape[:2]

        # Step 1: Add 15px solid white border padding around canvas
        img = cv2.copyMakeBorder(
            img,
            padding_px, padding_px, padding_px, padding_px,
            cv2.BORDER_CONSTANT,
            value=[255, 255, 255]
        )
        h, w = img.shape[:2]

        # Step 2: Dark Theme UI Classifier (Invert if dark background + light text)
        gray_check = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        mean_val = np.mean(gray_check)
        if mean_val < 110:
            img = cv2.bitwise_not(img)

        # Step 3: Adaptive Upscaling using Lanczos-4 interpolation for small text
        if min(h, w) < target_min_dim:
            scale = target_min_dim / float(min(h, w))
            scale = min(scale, 2.5)
            new_w, new_h = int(w * scale), int(h * scale)
            img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LANCZOS4)
            h, w = new_h, new_w
        elif max(h, w) > max_dim:
            scale = max_dim / float(max(h, w))
            new_w, new_h = int(w * scale), int(h * scale)
            img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
            h, w = new_h, new_w

        # Step 4: CLAHE Contrast Normalization in LAB color space
        try:
            lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            cl = clahe.apply(l)
            limg = cv2.merge((cl, a, b))
            img_contrast = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
        except Exception as e:
            logger.warning(f"[OCR Preprocessing] CLAHE contrast note: {e}")
            img_contrast = img

        if mode == "contrast":
            # Mode B: Otsu binarized variant for difficult/dim scans
            gray = cv2.cvtColor(img_contrast, cv2.COLOR_BGR2GRAY)
            filtered = cv2.bilateralFilter(gray, 9, 75, 75)
            _, otsu = cv2.threshold(filtered, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            return cv2.cvtColor(otsu, cv2.COLOR_GRAY2BGR)

        # Mode A (adaptive): Mild Unsharp Mask Sharpening
        try:
            gaussian = cv2.GaussianBlur(img_contrast, (0, 0), 2.0)
            sharpened = cv2.addWeighted(img_contrast, 1.3, gaussian, -0.3, 0)
            return sharpened
        except Exception as e:
            logger.warning(f"[OCR Preprocessing] Sharpening note: {e}")
            return img_contrast
