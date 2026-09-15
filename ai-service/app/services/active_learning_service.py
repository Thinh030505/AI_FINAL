import os
import json
import time
import uuid
import logging
from typing import Dict, Any
from app.models.feedback_model import DetectionFeedbackRequest, DetectionFeedbackResponse

logger = logging.getLogger("active_learning_service")

FEEDBACK_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../datasets/active_learning"))
FEEDBACK_LOG = os.path.join(FEEDBACK_DIR, "feedback_log.jsonl")

class ActiveLearningService:
    def __init__(self):
        os.makedirs(FEEDBACK_DIR, exist_ok=True)

    def record_feedback(self, request: DetectionFeedbackRequest) -> DetectionFeedbackResponse:
        fid = str(uuid.uuid4())
        ts = time.strftime("%Y-%m-%dT%H:%M:%SZ")

        entry = {
            "feedback_id": fid,
            "image_id": request.imageId,
            "image_url": request.imageUrl,
            "detector_version": request.detectorVersion,
            "user_feedback": request.userFeedback,
            "corrected_boxes": [b.model_dump() for b in request.correctedBoxes],
            "notes": request.notes,
            "timestamp": ts
        }

        with open(FEEDBACK_LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")

        logger.info(f"Recorded active learning feedback {fid} for image {request.imageId} ({request.userFeedback})")

        return DetectionFeedbackResponse(
            feedbackId=fid,
            status="recorded",
            recordedAt=ts,
            savedPath=FEEDBACK_LOG
        )

    def get_stats(self) -> Dict[str, Any]:
        if not os.path.exists(FEEDBACK_LOG):
            return {"total_feedback": 0, "categories": {}}

        counts = {}
        total = 0
        with open(FEEDBACK_LOG, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    item = json.loads(line)
                    total += 1
                    fb = item.get("user_feedback", "unknown")
                    counts[fb] = counts.get(fb, 0) + 1

        return {
            "total_feedback": total,
            "breakdown": counts,
            "log_path": FEEDBACK_LOG
        }

_instance = None

def get_active_learning_service() -> ActiveLearningService:
    global _instance
    if _instance is None:
        _instance = ActiveLearningService()
    return _instance
