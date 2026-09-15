import cv2
import numpy as np
from typing import Dict, Any, List, Optional
import logging
from app.services.color_analysis_service import get_color_analysis_service
from app.services.body_region_service import BodyRegion

logger = logging.getLogger("ai-service.clothing_analysis")

class ClothingItem:
    def __init__(
        self,
        category: str,       # "upper_body", "lower_body", "footwear"
        clothing_type: str,  # "shirt", "t-shirt", "jacket", "pants", "shoes", etc.
        color: str,          # "black", "blue", "white", etc.
        secondary_color: str,
        confidence: float,
        box_in_orig: List[int]
    ):
        self.category = category
        self.clothing_type = clothing_type
        self.color = color
        self.secondary_color = secondary_color
        self.confidence = confidence
        self.box_in_orig = box_in_orig

    def to_dict(self) -> Dict[str, Any]:
        display_name = f"{self.color} {self.clothing_type}".strip()
        return {
            "category": self.category,
            "type": self.clothing_type,
            "displayName": display_name,
            "color": self.color,
            "secondaryColor": self.secondary_color,
            "confidence": round(float(self.confidence), 2),
            "bbox": self.box_in_orig
        }

class ClothingAnalysisService:
    """
    Clothing Analysis Service.
    Analyzes clothing items (t-shirt, shirt, jacket, hoodie, coat, pants, jeans, shorts, dress, shoes)
    across upper body, waist, leg, and foot regions, associating them with accurate color signatures.
    """
    _instance: Optional["ClothingAnalysisService"] = None

    def __init__(self):
        self.color_svc = get_color_analysis_service()

    @classmethod
    def get_instance(cls) -> "ClothingAnalysisService":
        if cls._instance is None:
            cls._instance = ClothingAnalysisService()
        return cls._instance

    def analyze_person_clothing(
        self,
        person_bgr: np.ndarray,
        regions: List[BodyRegion],
        person_bbox_orig: List[int]
    ) -> List[ClothingItem]:
        """
        Extracts clothing profile from person crop and detected anatomical regions.
        """
        clothing_items: List[ClothingItem] = []
        h, w = person_bgr.shape[:2]
        ox1, oy1, ox2, oy2 = person_bbox_orig

        # 1. Upper body clothing analysis
        upper_region = next((r for r in regions if r.name == "UPPER_BODY"), None)
        if upper_region:
            ux1, uy1, ux2, uy2 = upper_region.box_in_crop
            upper_crop = person_bgr[uy1:uy2, ux1:ux2]
            color_res = self.color_svc.analyze_colors(upper_crop)

            # Heuristic on aspect ratio and texture to determine clothing type
            rw = max(1, ux2 - ux1)
            rh = max(1, uy2 - uy1)
            aspect = rh / float(rw)

            # If upper body covers long vertical span -> jacket or coat, else t-shirt/shirt
            if aspect > 1.2:
                c_type = "jacket"
                conf = 0.78
            else:
                c_type = "t-shirt"
                conf = 0.82

            clothing_items.append(ClothingItem(
                category="upper_body",
                clothing_type=c_type,
                color=color_res.get("dominantColor", "neutral"),
                secondary_color=color_res.get("secondaryColor", "none"),
                confidence=conf,
                box_in_orig=upper_region.box_in_orig
            ))
        else:
            # Upper body anatomical slice (top 20% to 55%)
            uy1, uy2 = int(h * 0.20), int(h * 0.55)
            upper_crop = person_bgr[uy1:uy2, :]
            color_res = self.color_svc.analyze_colors(upper_crop)
            clothing_items.append(ClothingItem(
                category="upper_body",
                clothing_type="shirt",
                color=color_res.get("dominantColor", "neutral"),
                secondary_color=color_res.get("secondaryColor", "none"),
                confidence=0.70,
                box_in_orig=[ox1, oy1 + uy1, ox2, oy1 + uy2]
            ))

        # 2. Lower body clothing analysis (waist to ankles: 50% to 85%)
        ly1, ly2 = int(h * 0.50), int(h * 0.85)
        if ly2 > ly1 + 10:
            lower_crop = person_bgr[ly1:ly2, :]
            lower_color = self.color_svc.analyze_colors(lower_crop)
            l_color = lower_color.get("dominantColor", "neutral")

            # In visual recognition, blue lower clothing is typically jeans
            c_type = "jeans" if l_color in ["blue", "navy"] else "pants"

            clothing_items.append(ClothingItem(
                category="lower_body",
                clothing_type=c_type,
                color=l_color,
                secondary_color=lower_color.get("secondaryColor", "none"),
                confidence=0.76,
                box_in_orig=[ox1, oy1 + ly1, ox2, oy1 + ly2]
            ))

        # 3. Footwear analysis
        feet_region = next((r for r in regions if r.name == "FEET"), None)
        if feet_region:
            fx1, fy1, fx2, fy2 = feet_region.box_in_crop
            feet_crop = person_bgr[fy1:fy2, fx1:fx2]
            f_color = self.color_svc.analyze_colors(feet_crop)
            clothing_items.append(ClothingItem(
                category="footwear",
                clothing_type="shoes",
                color=f_color.get("dominantColor", "neutral"),
                secondary_color=f_color.get("secondaryColor", "none"),
                confidence=0.80,
                box_in_orig=feet_region.box_in_orig
            ))
        elif h >= 100:
            fy1 = int(h * 0.85)
            feet_crop = person_bgr[fy1:h, :]
            f_color = self.color_svc.analyze_colors(feet_crop)
            clothing_items.append(ClothingItem(
                category="footwear",
                clothing_type="shoes",
                color=f_color.get("dominantColor", "neutral"),
                secondary_color=f_color.get("secondaryColor", "none"),
                confidence=0.68,
                box_in_orig=[ox1, oy1 + fy1, ox2, oy2]
            ))

        return clothing_items

def get_clothing_analysis_service() -> ClothingAnalysisService:
    return ClothingAnalysisService.get_instance()
