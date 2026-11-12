import asyncio
import numpy as np
import cv2
import json
from app.services.visual_intelligence_service import get_visual_intelligence_service

async def test_dual_engine():
    print("Testing VisualIntelligenceService...")
    # Create test synthetic image: 600x800 with sample shapes and text
    img = np.ones((600, 800, 3), dtype=np.uint8) * 255
    # Draw sample text
    cv2.putText(img, "WELCOME TO AI STUDIO", (100, 200), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 2)
    cv2.putText(img, "CHAO MUNG BAN", (100, 300), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 2)
    # Encode as JPEG
    _, encoded = cv2.imencode(".jpg", img)
    image_bytes = encoded.tobytes()

    service = get_visual_intelligence_service()
    resp = await service.analyze_image_bytes(image_bytes, confidence_threshold=0.25)
    
    print("\n[RESULT]")
    print(f"Success: {resp.success}")
    print(f"Dimensions: {resp.image}")
    print(f"Detected Objects count: {len(resp.analysis.objects)}")
    print(f"Detected Texts count: {len(resp.analysis.texts)}")
    print(f"Engines: {resp.engines}")
    print(f"Timings: {resp.timings}")
    print(f"Full text snippet: {resp.analysis.full_text[:100]}")
    
    assert resp.success is True
    assert resp.image["width"] == 800
    assert resp.image["height"] == 600
    assert "object_detection" in resp.engines
    assert "ocr" in resp.engines
    print("\n[SUCCESS] VisualIntelligenceService unit test passed!")

if __name__ == "__main__":
    asyncio.run(test_dual_engine())
