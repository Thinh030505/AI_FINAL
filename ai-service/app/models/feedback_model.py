from typing import List, Optional, Literal
from pydantic import BaseModel, Field

class CorrectedBox(BaseModel):
    className: str
    classId: Optional[int] = None
    x: float = Field(..., description="Normalized x center or min")
    y: float = Field(..., description="Normalized y center or min")
    width: float = Field(..., description="Normalized width")
    height: float = Field(..., description="Normalized height")

class DetectionFeedbackRequest(BaseModel):
    imageId: str
    imageUrl: Optional[str] = None
    detectorVersion: str = "phase11_v1.0"
    userFeedback: Literal["correct", "wrong_class", "missing_box", "bad_box", "false_positive"]
    correctedBoxes: List[CorrectedBox] = Field(default_factory=list)
    notes: Optional[str] = None

class DetectionFeedbackResponse(BaseModel):
    feedbackId: str
    status: str
    recordedAt: str
    savedPath: str
