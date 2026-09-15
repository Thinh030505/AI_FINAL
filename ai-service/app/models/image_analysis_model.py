from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class ImageAnalysisRequest(BaseModel):
    imageUrl: str = Field(..., description="Direct HTTP/HTTPS URL of the image to analyze")
    mode: Optional[str] = Field("balanced", description="Analysis execution mode: auto, fast, balanced, accurate, everything")
    forceOcr: Optional[bool] = Field(False, description="Explicitly force OCR execution overriding adaptive routing heuristics")

class FusedSummary(BaseModel):
    sceneType: str
    environment: str
    weather: str
    description: str
    objectCount: int
    distinctObjectClasses: List[str] = []
    dominantRegions: List[str] = []
    hasText: bool = False
    textSnippet: Optional[str] = ""

class ImageAnalysisTimings(BaseModel):
    qualityCheckMs: float = 0.0
    routingMs: float = 0.0
    objectDetectionMs: float = 0.0
    personCropMs: float = 0.0
    bodyRegionMs: float = 0.0
    openVocabMs: float = 0.0
    segmentationMs: float = 0.0
    ocrMs: float = 0.0
    visionMs: float = 0.0
    fusionMs: float = 0.0
    totalMs: float = 0.0

class ImageAnalysisData(BaseModel):
    status: str = "success"
    modules: Dict[str, str] = {}
    analysisMode: str = "balanced"
    qualityAssessment: Optional[Dict[str, Any]] = None
    routingDecision: Optional[Dict[str, Any]] = None
    timings: ImageAnalysisTimings = Field(default_factory=ImageAnalysisTimings)
    totalProcessingTimeMs: int
    imageWidth: int
    imageHeight: int
    fusedResult: FusedSummary
    objectDetection: Dict[str, Any]
    segmentation: Dict[str, Any]
    ocr: Dict[str, Any]
    vision: Dict[str, Any]
    # Deep Multimodal Understanding Extensions
    people: List[Dict[str, Any]] = Field(default_factory=list, description="Person-first detailed records with clothing and accessories")
    smallObjects: List[Dict[str, Any]] = Field(default_factory=list, description="Detected small objects and accessories")
    relationships: List[Dict[str, Any]] = Field(default_factory=list, description="Spatial and semantic relationship tuples")
    colors: List[Dict[str, Any]] = Field(default_factory=list, description="Dominant and secondary color palettes of key objects")
    deepInventory: Optional[Dict[str, Any]] = Field(default=None, description="Complete hierarchically organized visual inventory")

class ImageAnalysisResponse(BaseModel):
    success: bool = True
    message: str = "Multimodal AI image analysis and fusion completed successfully"
    data: ImageAnalysisData

