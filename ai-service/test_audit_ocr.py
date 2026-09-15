import requests
import json
import time

BASE_AI = "http://localhost:8000"
BASE_GW = "http://localhost:3000/api"

def main():
    print("=== STARTING OCR AUDIT VERIFICATION ===")

    # Log in User A
    res_a = requests.post(f"{BASE_GW}/auth/login", json={"email": "audit_user_a_test@example.com", "password": "Password123!"})
    token_a = res_a.json()["data"]["accessToken"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Upload doc_invoice.png for testing
    with open("D:/hocWeb/P_AI/test-images/doc_invoice.png", "rb") as f:
        r_up = requests.post(f"{BASE_GW}/images", headers=headers_a, files={"image": ("doc_invoice.png", f, "image/png")})
    img_id = r_up.json()["data"]["image"]["id"]
    img_url = r_up.json()["data"]["image"]["imageUrl"]
    print(f"Uploaded doc_invoice.png: ID={img_id}")

    # 1. Test Gateway OCR POST /api/ocr
    t0 = time.time()
    r_ocr = requests.post(f"{BASE_GW}/ocr", headers=headers_a, json={"imageId": img_id}, timeout=90)
    ocr_time = round(time.time() - t0, 2)
    assert r_ocr.status_code in [200, 201], f"Gateway OCR failed: {r_ocr.text}"
    ocr_data = r_ocr.json()["data"]["ocrResult"]

    print(f"Gateway OCR completed in {ocr_time}s")
    print(f"  Total lines detected: {len(ocr_data['lines'])}")
    print(f"  Avg Confidence: {ocr_data.get('avgConfidence')}")
    print(f"  Min Confidence: {ocr_data.get('minConfidence')}")
    print(f"  isUncertain: {ocr_data.get('isUncertain')}")
    print("  Recognized text lines:")
    for line in ocr_data["lines"]:
        print(f"    - [{line['confidence']:.3f}] {line['text']}")

    # 2. Test Gateway OCR History GET /api/ocr
    r_hist = requests.get(f"{BASE_GW}/ocr", headers=headers_a)
    print(f"GET /api/ocr returned {len(r_hist.json()['data']['ocrResults'])} records.")

    # 3. Test Gateway OCR Detail GET /api/ocr/:id
    ocr_record_id = ocr_data["id"]
    r_det = requests.get(f"{BASE_GW}/ocr/{ocr_record_id}", headers=headers_a)
    assert r_det.status_code == 200
    print(f"GET /api/ocr/{ocr_record_id} verified successfully.")

    # 4. Anti-IDOR for OCR: User B cannot access User A's OCR result
    res_b = requests.post(f"{BASE_GW}/auth/login", json={"email": "audit_user_b_test@example.com", "password": "Password123!"})
    token_b = res_b.json()["data"]["accessToken"]
    r_idor_ocr = requests.get(f"{BASE_GW}/ocr/{ocr_record_id}", headers={"Authorization": f"Bearer {token_b}"})
    print(f"Anti-IDOR OCR Check: status={r_idor_ocr.status_code} msg={r_idor_ocr.json().get('message')}")
    assert r_idor_ocr.status_code in [403, 404], f"IDOR vulnerability detected on OCR: {r_idor_ocr.status_code}"

    # 5. Test direct AI Service OCR endpoint POST http://localhost:8000/ocr
    r_direct = requests.post(f"{BASE_AI}/ocr", json={"imageUrl": img_url}, timeout=60)
    assert r_direct.status_code == 200, f"Direct AI OCR failed: {r_direct.text}"
    direct_data = r_direct.json()["data"]
    print(f"Direct FastAPI POST /ocr: status={r_direct.status_code}, lines={len(direct_data['lines'])}, time={direct_data['processingTimeMs']}ms")

    print("=== OCR AUDIT VERIFICATION PASSED ===")

if __name__ == "__main__":
    main()
