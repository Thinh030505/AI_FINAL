from typing import List, Optional
from pydantic import BaseModel, Field

class SegmentationRegion(BaseModel):
    label: str = Field(..., description="Canonical name of the detected region (e.g. sky, sand, water/sea)")
    rawLabel: Optional[str] = Field(None, description="Original ADE20K label from the model")
    pixelCount: int = Field(..., description="Number of pixels classified as this region")
    regionPercentage: float = Field(..., description="Percentage of total image area covered by this region (0-100%)")

class SegmentationRequest(BaseModel):
    imageUrl: str = Field(..., description="Direct HTTPS URL to image")

class SegmentationData(BaseModel):
    model: str = "segformer-b0-ade20k"
    imageWidth: int
    imageHeight: int
    processingTimeMs: int
    regions: List[SegmentationRegion] = []

class SegmentationResponse(BaseModel):
    success: bool = True
    message: str = "Semantic segmentation completed successfully"
    data: SegmentationData
