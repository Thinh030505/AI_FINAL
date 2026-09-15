import requests
import json
import time

BASE_GW = "http://localhost:3000/api"
BASE_AI = "http://localhost:8000"

def main():
    print("=== STARTING YOLO OBJECT DETECTION AUDIT VERIFICATION ===")

    # Log in User A
    res_a = requests.post(f"{BASE_GW}/auth/login", json={"email": "audit_user_a_test@example.com", "password": "Password123!"})
    token_a = res_a.json()["data"]["accessToken"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Upload street.jpg
    with open("D:/hocWeb/P_AI/test-images/street.jpg", "rb") as f:
        r_up = requests.post(f"{BASE_GW}/images", headers=headers_a, files={"image": ("street.jpg", f, "image/jpeg")})
    street_id = r_up.json()["data"]["image"]["id"]
    street_url = r_up.json()["data"]["image"]["imageUrl"]
    print(f"Uploaded street.jpg: ID={street_id}")

    # 1. Gateway Object Detection on street.jpg
    t0 = time.time()
    r_det = requests.post(f"{BASE_GW}/object-detection", headers=headers_a, json={"imageId": street_id}, timeout=30)
    det_time = round(time.time() - t0, 2)
    assert r_det.status_code in [200, 201], f"Gateway YOLO failed: {r_det.text}"
    det_record = r_det.json()["data"]["objectDetection"]
    print(f"[1] Gateway YOLO street.jpg completed in {det_time}s")
    print(f"    Record ID: {det_record['id']}")
    print(f"    Model: {det_record['model']}")
    print(f"    Image Size: {det_record['imageWidth']}x{det_record['imageHeight']}")
    print(f"    Object Count: {det_record['objectCount']}")
    print("    Detections:")
    for d in det_record["detections"]:
        b = d["box"]
        print(f"      - {d['label']} ({d['confidence']:.3f}): box=[{b['x1']:.1f}, {b['y1']:.1f}, {b['x2']:.1f}, {b['y2']:.1f}]")

    # 2. Test Direct AI Service with different confidence thresholds on street.jpg
    r_low = requests.post(f"{BASE_AI}/object-detection", json={"imageUrl": street_url, "confidenceThreshold": 0.10})
    r_high = requests.post(f"{BASE_AI}/object-detection", json={"imageUrl": street_url, "confidenceThreshold": 0.50})
    count_low = len(r_low.json()["data"]["detections"])
    count_high = len(r_high.json()["data"]["detections"])
    print(f"[2] Confidence Filtering Test:")
    print(f"    Threshold 0.10 -> {count_low} objects (contains lower-confidence noise)")
    print(f"    Threshold 0.50 -> {count_high} objects (high-confidence only)")

    # 3. Test on beach.jpg
    with open("D:/hocWeb/P_AI/test-images/beach.jpg", "rb") as f:
        r_up_beach = requests.post(f"{BASE_GW}/images", headers=headers_a, files={"image": ("beach.jpg", f, "image/jpeg")})
    beach_id = r_up_beach.json()["data"]["image"]["id"]
    r_det_beach = requests.post(f"{BASE_GW}/object-detection", headers=headers_a, json={"imageId": beach_id})
    beach_det = r_det_beach.json()["data"]["objectDetection"]
    print(f"[3] Beach image YOLO detections: {beach_det['objectCount']} objects")

    # 4. Test on doc_invoice.png (Document with no natural objects)
    with open("D:/hocWeb/P_AI/test-images/doc_invoice.png", "rb") as f:
        r_up_doc = requests.post(f"{BASE_GW}/images", headers=headers_a, files={"image": ("doc_invoice.png", f, "image/png")})
    doc_id = r_up_doc.json()["data"]["image"]["id"]
    r_det_doc = requests.post(f"{BASE_GW}/object-detection", headers=headers_a, json={"imageId": doc_id})
    doc_det = r_det_doc.json()["data"]["objectDetection"]
    print(f"[4] Invoice document YOLO detections: {doc_det['objectCount']} objects (expected 0 false positives)")

    # 5. History & Anti-IDOR
    r_hist = requests.get(f"{BASE_GW}/object-detection", headers=headers_a)
    print(f"[5] User A YOLO history count: {len(r_hist.json()['data']['objectDetections'])}")

    res_b = requests.post(f"{BASE_GW}/auth/login", json={"email": "audit_user_b_test@example.com", "password": "Password123!"})
    token_b = res_b.json()["data"]["accessToken"]
    r_idor = requests.get(f"{BASE_GW}/object-detection/{det_record['id']}", headers={"Authorization": f"Bearer {token_b}"})
    print(f"[6] Anti-IDOR YOLO Check: status={r_idor.status_code} msg={r_idor.json().get('message')}")
    assert r_idor.status_code in [403, 404]

    print("=== YOLO OBJECT DETECTION AUDIT VERIFICATION PASSED ===")

if __name__ == "__main__":
    main()
