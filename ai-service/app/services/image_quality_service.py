import time
import logging
from typing import Dict, Any, List, Optional, Union
import numpy as np
import cv2
from PIL import Image

logger = logging.getLogger("ai-service.image_quality")

# Empirical thresholds for fast quality screening
BLUR_THRESHOLD_VAR = 80.0       # Laplacian variance below this is likely blurry
DARK_LUMINANCE_THRESHOLD = 40.0   # Average pixel intensity below this is underexposed
BRIGHT_LUMINANCE_THRESHOLD = 225.0 # Average pixel intensity above this is overexposed
MIN_RECOMMENDED_DIM = 200        # Minimum recommended dimension for reliable vision processing

class ImageQualityAssessment:
    def __init__(
        self,
        width: int,
        height: int,
        aspect_ratio: float,
        orientation: str,
        blur_score: float,
        is_blurry: bool,
        brightness: float,
        lighting_condition: str,
        warnings: List[str],
        processing_time_ms: float,
    ):
        self.width = width
        self.height = height
        self.aspect_ratio = aspect_ratio
        self.orientation = orientation
        self.blur_score = blur_score
        self.is_blurry = is_blurry
        self.brightness = brightness
        self.lighting_condition = lighting_condition
        self.warnings = warnings
        self.processing_time_ms = processing_time_ms

    def to_dict(self) -> Dict[str, Any]:
        return {
            "width": self.width,
            "height": self.height,
            "aspectRatio": round(self.aspect_ratio, 2),
            "orientation": self.orientation,
            "blurScore": round(self.blur_score, 2),
            "isBlurry": self.is_blurry,
            "brightness": round(self.brightness, 2),
            "lightingCondition": self.lighting_condition,
            "warnings": self.warnings,
            "processingTimeMs": round(self.processing_time_ms, 2),
        }

class ImageQualityService:
    """
    Ultra-fast (<5ms), non-blocking image quality assessment service.
    Performs Laplacian blur estimation, brightness/contrast statistics,
    and aspect ratio profiling using OpenCV vectorized operations.
    """

    @staticmethod
    def assess_quality(image_input: Union[np.ndarray, Image.Image, bytes]) -> ImageQualityAssessment:
        start_t = time.perf_counter()
        warnings: List[str] = []

        # 1. Convert input to BGR numpy array
        img_bgr = None
        if isinstance(image_input, np.ndarray):
            if len(image_input.shape) == 2:
                img_bgr = cv2.cvtColor(image_input, cv2.COLOR_GRAY2BGR)
            elif image_input.shape[2] == 4:
                img_bgr = cv2.cvtColor(image_input, cv2.COLOR_BGRA2BGR)
            else:
                img_bgr = image_input
        elif isinstance(image_input, Image.Image):
            rgb_arr = np.array(image_input.convert("RGB"))
            img_bgr = cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2BGR)
        elif isinstance(image_input, bytes):
            np_arr = np.frombuffer(image_input, np.uint8)
            img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img_bgr is None or img_bgr.size == 0:
            elapsed = (time.perf_counter() - start_t) * 1000
            return ImageQualityAssessment(
                width=0,
                height=0,
                aspect_ratio=0.0,
                orientation="unknown",
                blur_score=0.0,
                is_blurry=True,
                brightness=0.0,
                lighting_condition="unreadable",
                warnings=["Corrupted or unreadable image stream"],
                processing_time_ms=elapsed,
            )

        h, w = img_bgr.shape[:2]
        aspect_ratio = w / float(h) if h > 0 else 1.0

        # Orientation
        if aspect_ratio > 1.15:
            orientation = "landscape"
        elif aspect_ratio < 0.85:
            orientation = "portrait"
        else:
            orientation = "square"

        # Check resolution
        if min(w, h) < MIN_RECOMMENDED_DIM:
            warnings.append(f"Low resolution ({w}x{h}). Quality may be degraded.")

        # Convert to Grayscale for fast signal processing
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

        # 2. Blur Estimation via Laplacian Variance
        # Downscale for blur computation if image is huge to guarantee <5ms
        if max(w, h) > 1024:
            scale = 1024.0 / max(w, h)
            small_gray = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_NEAREST)
            laplacian_var = float(cv2.Laplacian(small_gray, cv2.CV_64F).var())
        else:
            laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

        is_blurry = laplacian_var < BLUR_THRESHOLD_VAR
        if is_blurry:
            warnings.append(f"Image appears blurry (sharpness score: {laplacian_var:.1f})")

        # 3. Luminance / Exposure Analysis
        mean_brightness = float(np.mean(gray))
        if mean_brightness < DARK_LUMINANCE_THRESHOLD:
            lighting_condition = "dark"
            warnings.append("Image is underexposed/dark. Detection accuracy might decrease.")
        elif mean_brightness > BRIGHT_LUMINANCE_THRESHOLD:
            lighting_condition = "bright"
            warnings.append("Image is overexposed/washed out.")
        else:
            lighting_condition = "normal"

        elapsed_ms = (time.perf_counter() - start_t) * 1000

        return ImageQualityAssessment(
            width=w,
            height=h,
            aspect_ratio=aspect_ratio,
            orientation=orientation,
            blur_score=laplacian_var,
            is_blurry=is_blurry,
            brightness=mean_brightness,
            lighting_condition=lighting_condition,
            warnings=warnings,
            processing_time_ms=elapsed_ms,
        )

_image_quality_service: Optional[ImageQualityService] = None

def get_image_quality_service() -> ImageQualityService:
    global _image_quality_service
    if _image_quality_service is None:
        _image_quality_service = ImageQualityService()
    return _image_quality_service
