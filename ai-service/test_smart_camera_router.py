import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import cv2
import json
from app.services.realtime_ai_router import RealTimeAIRouter

router = RealTimeAIRouter.get_instance()
test_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "test-images", "accessories", "person_glasses.jpg")
img = cv2.imread(test_path)
print("Image loaded:", img.shape if img is not None else "Failed to load")

# Run router in everything mode
resp = router.analyze_frame(img, frame_id=1, mode="everything", confidence_threshold=0.25)
print("Status:", resp.status)
print("Device:", resp.device.dict())
print("Timings (ms):", json.dumps(resp.timings.dict(), indent=2))
print(f"Total detections: {len(resp.detections)}")
for d in resp.detections:
    print(f"  [{d.level.upper()}] id={d.id} trackId={d.trackId} label='{d.label}' conf={d.confidence:.2f} parent={d.parentId} children={d.childrenIds} box={[d.bbox.x1, d.bbox.y1, d.bbox.x2, d.bbox.y2]}")
