"""
Independent Verification Script for YOLO11m Model Integration
Path: ai-service/verify_yolo11m.py
"""

import os
import sys
import cv2
import numpy as np

# Ensure ai-service root is in sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

def main():
    print("=" * 65)
    print("      YOLO11m INDEPENDENT INTEGRATION VERIFICATION SCRIPT")
    print("=" * 65)

    # 1. Check weight file existence
    weights_path = os.path.join(SCRIPT_DIR, "models", "best.pt")
    print(f"\n[Step 1/5] Checking weight file:")
    print(f"  Target path: {weights_path}")
    if not os.path.exists(weights_path):
        print(f"  [ERROR] File does NOT exist at {weights_path}")
        sys.exit(1)

    file_size_mb = os.path.getsize(weights_path) / (1024 * 1024)
    print(f"  [PASSED] File exists! Size: {file_size_mb:.2f} MB")

    # 2. Load model via Ultralytics
    print(f"\n[Step 2/5] Loading model with Ultralytics YOLO:")
    try:
        from ultralytics import YOLO
        raw_model = YOLO(weights_path)
        print(f"  [PASSED] Model successfully loaded by Ultralytics!")
    except Exception as e:
        print(f"  [ERROR] Failed to load model with Ultralytics: {e}")
        sys.exit(1)

    # 3. Verify 80 COCO classes
    print(f"\n[Step 3/5] Verifying COCO class count and labels:")
    names = raw_model.names
    class_count = len(names)
    print(f"  Class count: {class_count}")
    if class_count != 80:
        print(f"  [ERROR] Expected 80 classes, but found {class_count}")
        sys.exit(1)
    print(f"  [PASSED] Model contains exactly 80 COCO classes.")
    print(f"  Sample classes: [0] '{names[0]}', [1] '{names[1]}', [16] '{names[16]}', [79] '{names[79]}'")

    # 4. Verify ObjectDetectionService loading & active model name
    print(f"\n[Step 4/5] Initializing ObjectDetectionService via App Singleton:")
    try:
        from app.services.object_detection_service import get_object_detection_service
        service = get_object_detection_service()
        print(f"  Active model name: {service._active_model_name}")
        print(f"  Loaded weights path: {service._loaded_weights_path}")
        print(f"  Device: {service._device}, Runtime: {service._runtime}")

        assert service._active_model_name == "yolo11m", (
            f"Expected active_model_name == 'yolo11m', got '{service._active_model_name}'"
        )
        assert "best.pt" in service._loaded_weights_path, (
            f"Expected 'best.pt' in loaded weights path, got '{service._loaded_weights_path}'"
        )
        print(f"  [PASSED] ObjectDetectionService active model is correctly identified as 'yolo11m'!")
    except Exception as e:
        print(f"  [ERROR] ObjectDetectionService initialization failed: {e}")
        sys.exit(1)

    # 5. Run inference on sample image
    print(f"\n[Step 5/5] Running inference on sample image:")
    sample_image_path = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "test-images", "street.jpg"))
    if not os.path.exists(sample_image_path):
        sample_image_path = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "test-images", "beach.jpg"))

    if not os.path.exists(sample_image_path):
        print(f"  [WARNING] No sample test image found at {sample_image_path}, using synthetic image.")
        img_bgr = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(img_bgr, "Synthetic Test", (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    else:
        print(f"  Using image: {sample_image_path}")
        img_bgr = cv2.imread(sample_image_path)

    if img_bgr is None:
        print(f"  [ERROR] Failed to read image from {sample_image_path}")
        sys.exit(1)

    result = service.detect_objects(img_bgr, confidence_threshold=0.25)
    print(f"  Inference completed successfully in {result.processingTimeMs} ms!")
    print(f"  Result Model Field: '{result.model}'")
    print(f"  Resolution: {result.imageWidth}x{result.imageHeight}")
    print(f"  Objects Detected: {result.objectCount}")
    print("-" * 65)
    print(f"  {'#':<4} {'Class Label':<18} {'Class ID':<10} {'Confidence':<12} {'Bounding Box [x1, y1, x2, y2]'}")
    print("-" * 65)

    for idx, item in enumerate(result.detections, 1):
        b = item.box
        box_str = f"[{b.x1:.1f}, {b.y1:.1f}, {b.x2:.1f}, {b.y2:.1f}]"
        print(f"  {idx:<4} {item.label:<18} {item.classId:<10} {item.confidence:<12.4f} {box_str}")

    print("-" * 65)
    assert result.model == "yolo11m", f"Expected result.model to be 'yolo11m', got '{result.model}'"
    print(f"\n[CONCLUSION] ALL 5 VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 65)

if __name__ == "__main__":
    main()
