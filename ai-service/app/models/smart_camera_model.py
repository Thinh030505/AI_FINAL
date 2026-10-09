from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class SmartBBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float

    def to_list(self) -> List[float]:
        return [self.x1, self.y1, self.x2, self.y2]

    def iou(self, other: "SmartBBox") -> float:
        ix1 = max(self.x1, other.x1)
        iy1 = max(self.y1, other.y1)
        ix2 = min(self.x2, other.x2)
        iy2 = min(self.y2, other.y2)

        iw = max(0.0, ix2 - ix1)
        ih = max(0.0, iy2 - iy1)
        inter = iw * ih

        area1 = max(0.0, self.x2 - self.x1) * max(0.0, self.y2 - self.y1)
        area2 = max(0.0, other.x2 - other.x1) * max(0.0, other.y2 - other.y1)
        union = area1 + area2 - inter

        if union <= 0.0:
            return 0.0
        return inter / union

    def contains(self, inner: "SmartBBox", tolerance: float = 0.15) -> bool:
        """Checks if self contains inner with a small margin of tolerance"""
        w = max(1.0, inner.x2 - inner.x1)
        h = max(1.0, inner.y2 - inner.y1)
        tol_w = w * tolerance
        tol_h = h * tolerance
        return (
            self.x1 - tol_w <= inner.x1
            and self.y1 - tol_h <= inner.y1
            and self.x2 + tol_w >= inner.x2
            and self.y2 + tol_h >= inner.y2
        )

class RealtimeDetection(BaseModel):
    id: str
    trackId: Optional[int] = None
    label: str
    confidence: float
    bbox: SmartBBox
    level: str  # "object", "fine_grained", "part", "open_vocab", "ocr", "region"
    category: str  # "person", "human_part", "accessory", "general_object", "natural_object", "ocr_text", "open_vocab"
    source: str  # "general_yolo", "person_specialist", "open_vocab", "ocr_engine", etc.
    parentId: Optional[str] = None
    childrenIds: List[str] = Field(default_factory=list)
    ocrText: Optional[str] = None
    translatedText: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    rawBbox: Optional[SmartBBox] = None
    canonicalBbox: Optional[SmartBBox] = None

class SmartCameraTiming(BaseModel):
    preprocessMs: float = 0.0
    generalDetectionMs: float = 0.0
    specialistMs: float = 0.0
    openVocabMs: float = 0.0
    ocrMs: float = 0.0
    fusionMs: float = 0.0
    trackingMs: float = 0.0
    totalMs: float = 0.0

class ImageDimensions(BaseModel):
    width: int
    height: int

class FrameTransformMetadata(BaseModel):
    uploadWidth: int
    uploadHeight: int
    originalWidth: int
    originalHeight: int
    scaleX: float
    scaleY: float

class DeviceInfo(BaseModel):
    cuda: bool
    device: str
    gpuName: Optional[str] = None
    vramMb: Optional[int] = None
    torchVersion: str

class SmartCameraAnalysisResponse(BaseModel):
    frameId: int
    timestamp: float
    image: ImageDimensions
    mode: str
    detections: List[RealtimeDetection]
    timings: SmartCameraTiming
    device: DeviceInfo
    activeTrackCount: int
    transform: Optional[FrameTransformMetadata] = None
    status: str  # "success", "partial_success", "empty"
