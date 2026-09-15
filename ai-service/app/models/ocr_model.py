from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class OCRRequest(BaseModel):
    imageUrl: Optional[str] = Field(default=None, description="URL of image stored on Cloudinary")

class TextLine(BaseModel):
    text: str
    confidence: float
    box: List[List[int]] = Field(description="Bounding box 4 points [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]")

class OCRData(BaseModel):
    fullText: str
    lines: List[TextLine]
    processingTimeMs: int
    rawFullText: Optional[str] = None
    avgConfidence: Optional[float] = None
    minConfidence: Optional[float] = None
    isUncertain: Optional[bool] = False
    debug: Optional[Dict[str, Any]] = None

class OCRResponse(BaseModel):
    success: bool = True
    data: OCRData
