from pydantic import BaseModel, Field
from typing import List

class BoundingBox(BaseModel):
    x1: float = Field(..., description="Top-left X coordinate in pixels")
    y1: float = Field(..., description="Top-left Y coordinate in pixels")
    x2: float = Field(..., description="Bottom-right X coordinate in pixels")
    y2: float = Field(..., description="Bottom-right Y coordinate in pixels")

class DetectionItem(BaseModel):
    label: str = Field(..., description="Detected object class label")
    classId: int = Field(..., description="COCO class identifier integer")
    confidence: float = Field(..., description="Detection confidence score between 0.0 and 1.0")
    box: BoundingBox = Field(..., description="Bounding box pixel coordinates")

class ObjectDetectionData(BaseModel):
    model: str = Field(default="yolo11n", description="Name of the detection model used")
    imageWidth: int = Field(..., description="Original image width in pixels")
    imageHeight: int = Field(..., description="Original image height in pixels")
    processingTimeMs: int = Field(..., description="Inference processing latency in milliseconds")
    detections: List[DetectionItem] = Field(default_factory=list, description="List of detected objects")
    objectCount: int = Field(default=0, description="Total count of detected objects")

class ObjectDetectionRequest(BaseModel):
    imageUrl: str = Field(..., description="Public or Cloudinary HTTP/HTTPS URL of the image to analyze")

class ObjectDetectionResponse(BaseModel):
    success: bool = True
    message: str = "Object detection completed successfully"
    data: ObjectDetectionData
