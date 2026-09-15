import cv2
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
import logging

logger = logging.getLogger("ai-service.color_analysis")

# Reference palette in HSV (H: 0-180, S: 0-255, V: 0-255)
COLOR_NAMES_HSV = [
    ("black", 0, 180, 0, 255, 0, 50),
    ("white", 0, 180, 0, 40, 200, 255),
    ("gray", 0, 180, 0, 50, 50, 200),
    ("red", 0, 10, 60, 255, 60, 255),
    ("red", 170, 180, 60, 255, 60, 255),
    ("orange", 11, 24, 70, 255, 70, 255),
    ("yellow", 25, 34, 70, 255, 70, 255),
    ("green", 35, 85, 50, 255, 50, 255),
    ("cyan", 86, 100, 50, 255, 50, 255),
    ("blue", 101, 130, 60, 255, 50, 255),
    ("navy", 101, 130, 60, 255, 20, 90),
    ("purple", 131, 155, 50, 255, 50, 255),
    ("pink", 156, 169, 40, 255, 120, 255),
    ("brown", 10, 25, 60, 255, 20, 120),
    ("beige", 15, 35, 20, 80, 150, 230),
]

class ColorAnalysisService:
    """
    Color Analysis Service for extractable visual objects (clothing, bags, shoes, accessories).
    Uses K-Means clustering and perceptual HSV quantization to deliver explainable,
    hallucination-free color attributes.
    """
    _instance: Optional["ColorAnalysisService"] = None

    @classmethod
    def get_instance(cls) -> "ColorAnalysisService":
        if cls._instance is None:
            cls._instance = ColorAnalysisService()
        return cls._instance

    def _hsv_to_color_name(self, h: float, s: float, v: float) -> str:
        # First check achromatic ranges (black, white, gray)
        if v < 45:
            return "black"
        if s < 30 and v > 195:
            return "white"
        if s < 45 and 45 <= v <= 195:
            return "gray"

        # Check chromatic ranges
        for name, h_min, h_max, s_min, s_max, v_min, v_max in COLOR_NAMES_HSV:
            if h_min <= h <= h_max and s_min <= s <= s_max and v_min <= v <= v_max:
                return name

        # Fallback by hue angle
        if h <= 10 or h >= 170:
            return "red"
        elif 11 <= h <= 25:
            return "orange"
        elif 26 <= h <= 34:
            return "yellow"
        elif 35 <= h <= 85:
            return "green"
        elif 86 <= h <= 130:
            return "blue"
        elif 131 <= h <= 155:
            return "purple"
        elif 156 <= h <= 169:
            return "pink"

        return "neutral"

    def analyze_colors(
        self,
        bgr_image: np.ndarray,
        min_pixels: int = 36
    ) -> Dict[str, Any]:
        """
        Analyzes dominant and secondary colors from a cropped bounding box or region.
        Returns:
            {
                "dominantColor": "black",
                "secondaryColor": "white",
                "dominantHex": "#1a1a1a",
                "secondaryHex": "#f0f0f0",
                "confidence": 0.88,
                "palette": [...]
            }
        """
        if bgr_image is None or bgr_image.size == 0:
            return {
                "dominantColor": "unknown",
                "secondaryColor": "unknown",
                "dominantHex": "#000000",
                "secondaryHex": "#000000",
                "confidence": 0.0,
                "palette": []
            }

        h, w = bgr_image.shape[:2]
        if h * w < min_pixels:
            return {
                "dominantColor": "undetermined",
                "secondaryColor": "undetermined",
                "dominantHex": "#808080",
                "secondaryHex": "#808080",
                "confidence": 0.3,
                "palette": []
            }

        # Subsample for speed if crop is large
        if max(h, w) > 160:
            scale = 160.0 / max(h, w)
            sample = cv2.resize(bgr_image, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        else:
            sample = bgr_image

        pixels = sample.reshape(-1, 3).astype(np.float32)

        # Remove pure transparent/black or border pixels if needed
        k = 3
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
        try:
            _, labels, centers = cv2.kmeans(
                pixels, k, None, criteria, 3, cv2.KMEANS_PP_CENTERS
            )
        except Exception as e:
            logger.warning(f"[ColorAnalysis] K-Means error: {e}")
            return {
                "dominantColor": "unknown",
                "secondaryColor": "unknown",
                "dominantHex": "#000000",
                "secondaryHex": "#000000",
                "confidence": 0.0,
                "palette": []
            }

        counts = np.bincount(labels.flatten())
        total_p = len(labels)
        sorted_indices = np.argsort(-counts)

        palette = []
        for idx in sorted_indices:
            b, g, r = [int(c) for c in centers[idx]]
            b_norm, g_norm, r_norm = b / 255.0, g / 255.0, r / 255.0
            hex_code = f"#{r:02x}{g:02x}{b:02x}"
            ratio = round(float(counts[idx]) / total_p, 3)

            # Convert to HSV for naming
            pixel_mat = np.uint8([[[b, g, r]]])
            hsv_val = cv2.cvtColor(pixel_mat, cv2.COLOR_BGR2HSV)[0][0]
            name = self._hsv_to_color_name(float(hsv_val[0]), float(hsv_val[1]), float(hsv_val[2]))

            palette.append({
                "name": name,
                "hex": hex_code,
                "ratio": ratio,
                "rgb": [r, g, b]
            })

        dominant = palette[0]
        secondary = palette[1] if len(palette) > 1 and palette[1]["ratio"] >= 0.15 else None

        dom_name = dominant["name"]
        sec_name = secondary["name"] if secondary else "none"

        return {
            "dominantColor": dom_name,
            "secondaryColor": sec_name,
            "dominantHex": dominant["hex"],
            "secondaryHex": secondary["hex"] if secondary else dominant["hex"],
            "confidence": round(float(dominant["ratio"]), 2),
            "palette": palette
        }

def get_color_analysis_service() -> ColorAnalysisService:
    return ColorAnalysisService.get_instance()
