import asyncio
import numpy as np
import cv2
import sys
import os

# Add ai-service to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ai-service'))

from app.services.visual_intelligence_service import get_visual_intelligence_service

async def main():
    print("=" * 70)
    print("   LIVE DUAL-ENGINE (YOLO + PADDLEOCR) PIPELINE TEST")
    print("=" * 70)

    # 1. Create a synthetic test image (800x600) with bold text
    img = np.ones((600, 800, 3), dtype=np.uint8) * 245  # Light gray background

    # Draw header text
    cv2.putText(img, "SIEU THI XE DAP", (100, 150), cv2.FONT_HERSHEY_SIMPLEX, 1.8, (20, 20, 180), 4)
    cv2.putText(img, "WELCOME TO MOTORCYCLE STORE", (80, 260), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (180, 20, 20), 3)
    cv2.putText(img, "DISCOUNT 20%", (250, 380), cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 120, 0), 3)

    # Encode to bytes
    success, encoded_jpg = cv2.imencode(".jpg", img)
    assert success, "Failed to encode image to JPEG"
    img_bytes = encoded_jpg.tobytes()

    service = get_visual_intelligence_service()
    print("Invoking VisualIntelligenceService.analyze_image_bytes...")
    result = await service.analyze_image_bytes(img_bytes, confidence_threshold=0.20)

    print("\n--- RESULTS ---")
    print(f"Success: {result.success}")
    print(f"Image Dimensions: {result.image}")
    print(f"Detected Objects Count: {len(result.analysis.objects)}")
    print(f"Detected Texts Count: {len(result.analysis.texts)}")
    print(f"Full Text Extracted:\n{result.analysis.full_text}")
    print(f"Engines Status: {result.engines}")
    print(f"Timings: {result.timings}")

    assert result.success is True, "Result success must be True"
    assert len(result.analysis.texts) >= 2, "Must detect at least 2 text regions"
    assert "SIEU THI" in result.analysis.full_text or "XE DAP" in result.analysis.full_text or "WELCOME" in result.analysis.full_text, "OCR recognized target words"
    
    print("\n[SUCCESS] Live Dual-Engine analysis completed successfully and validated!")

if __name__ == "__main__":
    asyncio.run(main())

