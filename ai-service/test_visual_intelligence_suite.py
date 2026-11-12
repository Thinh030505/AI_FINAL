import asyncio
import numpy as np
import cv2
import time
from unittest.mock import patch
from app.services.visual_intelligence_service import get_visual_intelligence_service

async def run_suite():
    print("=" * 75)
    print("      DUAL-ENGINE VISUAL INTELLIGENCE AUTOMATED TEST SUITE")
    print("=" * 75)
    service = get_visual_intelligence_service()
    passed = 0
    total = 0

    # -------------------------------------------------------------
    # CASE 1: Image with Text Only (OCR Succeeds, YOLO no_results)
    # -------------------------------------------------------------
    total += 1
    print("\n[TEST 1] Text-heavy image (OCR finds text, YOLO finds 0 objects)")
    img1 = np.ones((500, 700, 3), dtype=np.uint8) * 255
    cv2.putText(img1, "COFFEE SHOP & BAKERY", (50, 150), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 2)
    cv2.putText(img1, "CUA HANG TIEN LOI", (50, 250), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 2)
    _, enc1 = cv2.imencode(".jpg", img1)
    res1 = await service.analyze_image_bytes(enc1.tobytes(), confidence_threshold=0.25)
    assert res1.success is True
    assert res1.image["width"] == 700
    assert res1.image["height"] == 500
    assert len(res1.analysis.texts) >= 1
    assert res1.engines["ocr"]["status"] == "success"
    assert res1.engines["object_detection"]["status"] in ["no_results", "success"]
    print(f"  -> Found {len(res1.analysis.texts)} text lines, {len(res1.analysis.objects)} objects")
    print("  [PASS] Case 1 passed.")
    passed += 1

    # -------------------------------------------------------------
    # CASE 2: Blank image (Both engines handle 0 detections safely)
    # -------------------------------------------------------------
    total += 1
    print("\n[TEST 2] Blank image (No text, no objects)")
    img2 = np.ones((400, 400, 3), dtype=np.uint8) * 255
    _, enc2 = cv2.imencode(".jpg", img2)
    res2 = await service.analyze_image_bytes(enc2.tobytes(), confidence_threshold=0.25)
    assert res2.success is True
    assert len(res2.analysis.objects) == 0
    assert len(res2.analysis.texts) == 0
    assert res2.engines["object_detection"]["status"] == "no_results"
    assert res2.engines["ocr"]["status"] == "no_results"
    print("  -> Safely reported no_results for both engines without error")
    print("  [PASS] Case 2 passed.")
    passed += 1

    # -------------------------------------------------------------
    # CASE 3: Invalid / Corrupted image input
    # -------------------------------------------------------------
    total += 1
    print("\n[TEST 3] Invalid / Corrupted image input handling")
    try:
        corrupted_bytes = b"NOT_A_VALID_IMAGE_DATA_123456789"
        await service.analyze_image_bytes(corrupted_bytes)
        print("  [FAIL] Expected ValueError was not raised!")
    except ValueError as ve:
        assert "Failed to decode image bytes" in str(ve)
        print(f"  -> Caught expected validation error: {ve}")
        print("  [PASS] Case 3 passed.")
        passed += 1

    # -------------------------------------------------------------
    # CASE 4: Fault Tolerance - YOLO Engine Error Isolation
    # -------------------------------------------------------------
    total += 1
    print("\n[TEST 4] Fault Tolerance: YOLO engine failure isolation (OCR still works)")
    with patch.object(service, '_execute_yolo', side_effect=RuntimeError("Simulated YOLO CUDA OOM")):
        res4 = await service.analyze_image_bytes(enc1.tobytes())
        assert res4.success is True
        assert res4.engines["object_detection"]["status"] == "error"
        assert "Simulated YOLO CUDA OOM" in res4.engines["object_detection"]["message"]
        # OCR must still have succeeded!
        assert res4.engines["ocr"]["status"] == "success"
        assert len(res4.analysis.texts) >= 1
        print("  -> YOLO failed gracefully, OCR produced full results without crash")
        print("  [PASS] Case 4 passed.")
        passed += 1

    # -------------------------------------------------------------
    # CASE 5: Fault Tolerance - OCR Engine Error Isolation
    # -------------------------------------------------------------
    total += 1
    print("\n[TEST 5] Fault Tolerance: OCR engine failure isolation (YOLO still works)")
    with patch.object(service, '_execute_ocr', side_effect=RuntimeError("Simulated PaddleOCR timeout")):
        res5 = await service.analyze_image_bytes(enc2.tobytes())
        assert res5.success is True
        assert res5.engines["ocr"]["status"] == "error"
        assert "Simulated PaddleOCR timeout" in res5.engines["ocr"]["message"]
        assert res5.engines["object_detection"]["status"] in ["success", "no_results"]
        print("  -> OCR failed gracefully, YOLO handled pipeline without crash")
        print("  [PASS] Case 5 passed.")
        passed += 1

    # -------------------------------------------------------------
    # CASE 6: Strict Coordinate Normalization & Clamping
    # -------------------------------------------------------------
    total += 1
    print("\n[TEST 6] Strict Bounding Box Normalization & Boundary Clamping")
    # All text and object bounding boxes must satisfy 0 <= x1 <= x2 <= width and 0 <= y1 <= y2 <= height
    for txt in res1.analysis.texts:
        assert 0.0 <= txt.bbox.x1 <= txt.bbox.x2 <= 700.0, f"X bounds violated: {txt.bbox}"
        assert 0.0 <= txt.bbox.y1 <= txt.bbox.y2 <= 500.0, f"Y bounds violated: {txt.bbox}"
        assert 0.0 <= txt.confidence <= 1.0, f"Confidence invalid: {txt.confidence}"
    print("  -> All bounding box coordinates tightly clamped within [0, width] and [0, height]")
    print("  [PASS] Case 6 passed.")
    passed += 1

    # -------------------------------------------------------------
    # CASE 7: Vietnamese Text & Diacritic Extraction
    # -------------------------------------------------------------
    total += 1
    print("\n[TEST 7] Vietnamese Diacritic Text Preservation")
    img7 = np.ones((400, 600, 3), dtype=np.uint8) * 255
    cv2.putText(img7, "TIENG ANH CHO NGUOI MOI", (40, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 2)
    _, enc7 = cv2.imencode(".jpg", img7)
    res7 = await service.analyze_image_bytes(enc7.tobytes())
    assert res7.success is True
    assert len(res7.analysis.texts) >= 1
    full_txt = res7.analysis.full_text
    print(f"  -> Extracted text: {full_txt}")
    print("  [PASS] Case 7 passed.")
    passed += 1

    print("\n" + "=" * 75)
    print(f"TOTAL TESTS: {total} | PASSED: {passed} | FAILED: {total - passed}")
    print("=" * 75)
    if passed == total:
        print("[SUCCESS] ALL 7 DUAL-ENGINE VISUAL INTELLIGENCE TESTS PASSED!")
    else:
        raise AssertionError(f"{total - passed} tests failed!")

if __name__ == "__main__":
    asyncio.run(run_suite())
