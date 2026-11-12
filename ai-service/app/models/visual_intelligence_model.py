from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class BBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float

class ObjectItem(BaseModel):
    id: str
    class_id: int
    label: str
    confidence: float
    bbox: BBox

class TextItem(BaseModel):
    id: str
    content: str
    confidence: float
    bbox: BBox
    polygon: Optional[List[List[int]]] = None

class VisualIntelligenceAnalysis(BaseModel):
    objects: List[ObjectItem] = Field(default_factory=list)
    texts: List[TextItem] = Field(default_factory=list)
    full_text: str = ""

class EngineMetadata(BaseModel):
    status: str  # "success" | "no_results" | "error"
    count: int = 0
    processing_time_ms: int = 0
    model: Optional[str] = None
    engine: Optional[str] = None
    message: Optional[str] = None

class VisualIntelligenceResponse(BaseModel):
    success: bool = True
    image: Dict[str, int]
    analysis: VisualIntelligenceAnalysis
    engines: Dict[str, Any]
    timings: Optional[Dict[str, Any]] = None
    message: Optional[str] = "Dual-engine visual intelligence analysis completed"

class VisualIntelligenceRequest(BaseModel):
    imageUrl: str
    confidence_threshold: Optional[float] = 0.25
