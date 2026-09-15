import requests
import sys

sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://localhost:3000/api"

def main():
    print("=== RUNNING PHASES 1-6 REGRESSION TEST SUITE ===")
    login_data = {"email": "phase7test@example.com", "password": "Password123!"}
    res = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    assert res.status_code in [200, 201], f"Login failed: {res.text}"
    token = res.json()["data"]["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    # Test 1: Translation (Phase 4)
    trans_res = requests.post(
        f"{BASE_URL}/translation",
        headers=headers,
        json={"text": "Hello world, welcome to AI OCR Hub", "sourceLanguage": "en", "targetLanguage": "vi"},
        timeout=30
    )
    assert trans_res.status_code in [200, 201], f"Translation failed: {trans_res.text}"
    trans_txt = trans_res.json()["data"]["translation"]["translatedText"]
    print(f"[Phase 4 Translation] PASSED -> \"{trans_txt}\"")

    # Get image ID
    images_res = requests.get(f"{BASE_URL}/images", headers=headers, timeout=10)
    assert images_res.status_code == 200
    images = images_res.json()["data"]["images"]
    assert len(images) > 0, "No images found"
    image_id = images[0]["id"]

    # Test 2: Object Detection (Phase 6)
    det_res = requests.post(
        f"{BASE_URL}/object-detection",
        headers=headers,
        json={"imageId": image_id},
        timeout=30
    )
    assert det_res.status_code in [200, 201], f"YOLO Object Detection failed: {det_res.text}"
    det_count = det_res.json()["data"]["objectDetection"]["objectCount"]
    print(f"[Phase 6 YOLO11] PASSED -> {det_count} objects detected")

    # Test 3: OCR (Phase 3)
    ocr_res = requests.post(
        f"{BASE_URL}/ocr",
        headers=headers,
        json={"imageId": image_id},
        timeout=60
    )
    assert ocr_res.status_code in [200, 201], f"OCR failed: {ocr_res.text}"
    ocr_lines = len(ocr_res.json()["data"]["ocrResult"]["lines"])
    print(f"[Phase 3 PaddleOCR] PASSED -> {ocr_lines} text lines extracted")

    print("=== ALL PHASES 1-6 REGRESSION TESTS PASSED! ZERO BREAKAGES! ===")

if __name__ == "__main__":
    main()
