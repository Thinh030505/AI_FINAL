import time
from typing import List, Dict, Any, Optional
import numpy as np
from app.models.smart_camera_model import RealtimeDetection, SmartBBox

class TrackedObject:
    def __init__(
        self,
        track_id: int,
        label: str,
        level: str,
        category: str,
        source: str,
        bbox: SmartBBox,
        confidence: float,
        timestamp: float,
        parent_label: Optional[str] = None
    ):
        self.track_id = track_id
        self.label = label
        self.level = level
        self.category = category
        self.source = source
        self.bbox = bbox
        self.confidence = confidence
        self.smoothed_bbox = SmartBBox(**bbox.dict())
        self.first_seen = timestamp
        self.last_seen = timestamp
        self.miss_count = 0
        self.hits = 1
        self.parent_label = parent_label
        self.ocr_text: Optional[str] = None
        self.translated_text: Optional[str] = None

    def update(self, detection: RealtimeDetection, timestamp: float, alpha: float = 0.65):
        self.last_seen = timestamp
        self.miss_count = 0
        self.hits += 1
        self.confidence = 0.7 * detection.confidence + 0.3 * self.confidence

        # Exponential moving average for bounding box coordinates
        self.smoothed_bbox.x1 = alpha * detection.bbox.x1 + (1.0 - alpha) * self.smoothed_bbox.x1
        self.smoothed_bbox.y1 = alpha * detection.bbox.y1 + (1.0 - alpha) * self.smoothed_bbox.y1
        self.smoothed_bbox.x2 = alpha * detection.bbox.x2 + (1.0 - alpha) * self.smoothed_bbox.x2
        self.smoothed_bbox.y2 = alpha * detection.bbox.y2 + (1.0 - alpha) * self.smoothed_bbox.y2

        if detection.ocrText:
            self.ocr_text = detection.ocrText
        if detection.translatedText:
            self.translated_text = detection.translatedText

    def mark_missed(self, decay: float = 0.85):
        self.miss_count += 1
        self.confidence *= decay

class SmartCameraTracker:
    """
    Lightweight, high-speed multi-object tracker for live camera streams.
    Features:
    - Persistent trackId assignment across frames
    - IoU + spatial centroid cost matching
    - Bounding box temporal smoothing (EMA) to prevent micro-jitter
    - Disappearance delay (grace period TTL: 500ms) to eliminate flickering
    - Bounded memory to prevent memory leaks
    """
    _instance: Optional["SmartCameraTracker"] = None

    def __init__(self, max_ttl_ms: float = 500.0, iou_threshold: float = 0.30):
        self.max_ttl_sec = max_ttl_ms / 1000.0
        self.iou_threshold = iou_threshold
        self.next_track_id = 1
        self.tracks: Dict[int, TrackedObject] = {}
        self.last_cleanup = time.time()

    @classmethod
    def get_instance(cls) -> "SmartCameraTracker":
        if cls._instance is None:
            cls._instance = SmartCameraTracker()
        return cls._instance

    def reset(self):
        self.tracks.clear()
        self.next_track_id = 1

    def update_tracks(
        self,
        detections: List[RealtimeDetection],
        timestamp: Optional[float] = None
    ) -> List[RealtimeDetection]:
        now = timestamp or time.time()

        # Step 1: Filter dead tracks older than TTL
        active_track_ids = []
        for tid, trk in list(self.tracks.items()):
            if (now - trk.last_seen) > self.max_ttl_sec or trk.miss_count > 5:
                del self.tracks[tid]
            else:
                active_track_ids.append(tid)

        matched_track_ids = set()
        matched_det_indices = set()

        # Step 2: Greedy IoU matching partitioned by semantic label
        from app.services.detection_fusion_engine import are_labels_equivalent

        for d_idx, det in enumerate(detections):
            best_iou = 0.0
            best_tid = None

            for tid in active_track_ids:
                if tid in matched_track_ids:
                    continue
                trk = self.tracks[tid]

                # Strict label consistency: never match different objects (e.g. refrigerator vs person)
                if not are_labels_equivalent(trk.label, det.label):
                    continue

                iou = det.bbox.iou(trk.smoothed_bbox)
                if iou > best_iou:
                    best_iou = iou
                    best_tid = tid

            if best_tid is not None and best_iou >= self.iou_threshold:
                # Update existing track
                self.tracks[best_tid].update(det, now)
                det.trackId = best_tid
                # Apply smoothed coordinates to detection
                det.bbox = SmartBBox(**self.tracks[best_tid].smoothed_bbox.dict())
                if self.tracks[best_tid].ocr_text and not det.ocrText:
                    det.ocrText = self.tracks[best_tid].ocr_text
                if self.tracks[best_tid].translated_text and not det.translatedText:
                    det.translatedText = self.tracks[best_tid].translated_text

                matched_track_ids.add(best_tid)
                matched_det_indices.add(d_idx)

        # Step 3: Handle unmatched active tracks (temporal smoothing grace period)
        output_detections = list(detections)
        for tid in active_track_ids:
            if tid not in matched_track_ids:
                trk = self.tracks[tid]
                trk.mark_missed()
                # Only retain a brief ghost box if track was strongly established (>=3 hits),
                # highly confident (>=0.65), only 1 missed frame, and is a major object
                if trk.hits >= 3 and trk.miss_count == 1 and trk.confidence >= 0.65 and trk.level in ["object", "fine_grained"]:
                    ghost_det = RealtimeDetection(
                        id=f"track_{tid}",
                        trackId=tid,
                        label=trk.label,
                        confidence=round(float(trk.confidence * 0.85), 2),
                        bbox=SmartBBox(**trk.smoothed_bbox.dict()),
                        level=trk.level,
                        category=trk.category,
                        source=trk.source,
                        parentId=None,
                        childrenIds=[],
                        ocrText=trk.ocr_text,
                        translatedText=trk.translated_text
                    )
                    output_detections.append(ghost_det)

        # Step 4: Register new tracks for unmatched detections
        for d_idx, det in enumerate(detections):
            if d_idx not in matched_det_indices:
                tid = self.next_track_id
                self.next_track_id += 1
                det.trackId = tid
                self.tracks[tid] = TrackedObject(
                    track_id=tid,
                    label=det.label,
                    level=det.level,
                    category=det.category,
                    source=det.source,
                    bbox=det.bbox,
                    confidence=det.confidence,
                    timestamp=now
                )

        # Bounded cache check
        if len(self.tracks) > 100:
            oldest_tid = min(self.tracks.keys(), key=lambda k: self.tracks[k].last_seen)
            del self.tracks[oldest_tid]

        return output_detections
