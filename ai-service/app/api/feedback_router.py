from fastapi import APIRouter, HTTPException, status
from app.models.feedback_model import DetectionFeedbackRequest, DetectionFeedbackResponse
from app.services.active_learning_service import get_active_learning_service

router = APIRouter(prefix="/api/v1/feedback", tags=["Active Learning Feedback"])

@router.post("/detection", response_model=DetectionFeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_detection_feedback(request: DetectionFeedbackRequest):
    try:
        service = get_active_learning_service()
        resp = service.record_feedback(request)
        return resp
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_feedback_stats():
    try:
        service = get_active_learning_service()
        return service.get_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
