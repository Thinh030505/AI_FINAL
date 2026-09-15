import os
import io
import time
import logging
from typing import List, Dict, Optional, Union, Any
import httpx
import numpy as np
from PIL import Image
import torch
from transformers import SegformerImageProcessor, SegformerForSemanticSegmentation

from app.models.segmentation_model import (
    SegmentationRegion,
    SegmentationData,
)

logger = logging.getLogger("ai-service.segmentation")

# Model configuration
SEGFORMER_MODEL_NAME = "nvidia/segformer-b0-finetuned-ade-512-512"
MIN_REGION_PERCENTAGE = 1.0  # Ignore regions < 1% of total image area to eliminate noise

# Canonical mapping from raw ADE20K classes to unified environmental labels
CANONICAL_LABEL_MAPPING = {
    "sea": "water/sea",
    "water": "water/sea",
    "ocean": "water/sea",
    "lake": "water/sea",
    "river": "water/sea",
    "pool": "water/sea",
    "earth": "ground",
    "ground": "ground",
    "land": "ground",
    "soil": "ground",
    "dirt": "ground",
    "sand": "sand",
    "beach": "sand",
    "sky": "sky",
    "road": "road",
    "route": "road",
    "highway": "road",
    "path": "road",
    "runway": "road",
    "grass": "grass",
    "lawn": "grass",
    "building": "building",
    "edifice": "building",
    "house": "building",
    "skyscraper": "building",
    "tree": "tree/foliage",
    "plant": "tree/foliage",
    "flora": "tree/foliage",
    "palm": "tree/foliage",
    "floor": "floor",
    "flooring": "floor",
    "rug": "floor",
    "carpet": "floor",
    "wall": "wall",
    "ceiling": "ceiling",
    "mountain": "mountain",
    "hill": "mountain",
    "rock": "rock",
    "sidewalk": "sidewalk",
    "pavement": "sidewalk",
    "bridge": "bridge",
    "fence": "fence",
}


class SegmentationService:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"[Segmentation] Initializing SegFormer model ({SEGFORMER_MODEL_NAME}) on device: {self.device}")
        try:
            self.processor = SegformerImageProcessor.from_pretrained(SEGFORMER_MODEL_NAME)
            self.model = SegformerForSemanticSegmentation.from_pretrained(SEGFORMER_MODEL_NAME)
            self.model.to(self.device)
            self.model.eval()
            self.id2label = self.model.config.id2label
            logger.info("[Segmentation] SegFormer model loaded successfully.")
        except Exception as e:
            logger.error(f"[Segmentation] Failed to load SegFormer model: {e}")
            raise e

    def _canonicalize_label(self, raw_label: str) -> str:
        """Map raw ADE20K label to canonical environmental concept."""
        clean_raw = raw_label.lower().replace("_", " ").strip()
        # Direct exact or substring match
        for key, canonical in CANONICAL_LABEL_MAPPING.items():
            if key == clean_raw or key in clean_raw.split():
                return canonical
        return clean_raw

    async def _fetch_image(self, image_url: Union[str, bytes]) -> Image.Image:
        if isinstance(image_url, Image.Image):
            return image_url.convert("RGB")
        if hasattr(image_url, "pil_image"):
            return image_url.pil_image.convert("RGB")
        if isinstance(image_url, bytes):
            return Image.open(io.BytesIO(image_url)).convert("RGB")
        if isinstance(image_url, str):
            if os.path.exists(image_url):
                return Image.open(image_url).convert("RGB")
            if image_url.startswith("file://"):
                local_p = image_url[7:]
                if os.path.exists(local_p):
                    return Image.open(local_p).convert("RGB")
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(image_url, headers=headers)
            if response.status_code != 200:
                raise ValueError(f"Failed to fetch image from URL: HTTP {response.status_code}")
            content_type = response.headers.get("content-type", "")
            if not any(t in content_type for t in ["image", "application/octet-stream"]):
                raise ValueError(f"URL content-type is not an image: {content_type}")
            image_bytes = response.content

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return image

    async def segment_image(self, image_url: Any) -> SegmentationData:
        start_time = time.time()
        image = await self._fetch_image(image_url)
        orig_w, orig_h = image.size

        # Preprocess input image for SegFormer
        inputs = self.processor(images=image, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits  # shape: [1, num_classes, H/4, W/4]

            # Upsample logits to original image dimensions (height, width)
            upsampled_logits = torch.nn.functional.interpolate(
                logits,
                size=(orig_h, orig_w),
                mode="bilinear",
                align_corners=False
            )
            pred_seg = upsampled_logits.argmax(dim=1)[0].cpu().numpy()

        total_pixels = orig_w * orig_h
        unique_classes, counts = np.unique(pred_seg, return_counts=True)

        # Aggregate regions by canonical label to avoid fragmentation
        aggregated: Dict[str, Dict] = {}
        for class_id, count in zip(unique_classes, counts):
            raw_label = self.id2label.get(int(class_id), f"class_{class_id}")
            canonical = self._canonicalize_label(raw_label)
            percentage = (count / total_pixels) * 100.0

            if canonical not in aggregated:
                aggregated[canonical] = {
                    "label": canonical,
                    "rawLabel": raw_label,
                    "pixelCount": int(count),
                    "percentage": percentage
                }
            else:
                aggregated[canonical]["pixelCount"] += int(count)
                aggregated[canonical]["percentage"] += percentage

        # Filter noise regions and format output
        regions: List[SegmentationRegion] = []
        for item in aggregated.values():
            pct = round(item["percentage"], 2)
            if pct >= MIN_REGION_PERCENTAGE:
                regions.append(
                    SegmentationRegion(
                        label=item["label"],
                        rawLabel=item["rawLabel"],
                        pixelCount=item["pixelCount"],
                        regionPercentage=pct
                    )
                )

        # Sort by region percentage descending
        regions.sort(key=lambda r: r.regionPercentage, reverse=True)

        processing_time = int((time.time() - start_time) * 1000)

        return SegmentationData(
            model="segformer-b0-ade20k",
            imageWidth=orig_w,
            imageHeight=orig_h,
            processingTimeMs=processing_time,
            regions=regions
        )


_segmentation_service_instance: Optional[SegmentationService] = None


def get_segmentation_service() -> SegmentationService:
    global _segmentation_service_instance
    if _segmentation_service_instance is None:
        _segmentation_service_instance = SegmentationService()
    return _segmentation_service_instance


segmentation_service = get_segmentation_service()
