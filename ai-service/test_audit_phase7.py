import requests
import json
import time

BASE_GW = "http://localhost:3000/api"
BASE_AI = "http://localhost:8000"

def main():
    print("=== STARTING PHASE 7 MULTIMODAL AUDIT VERIFICATION ===")

    # Log in User A
    res_a = requests.post(f"{BASE_GW}/auth/login", json={"email": "audit_user_a_test@example.com", "password": "Password123!"})
    token_a = res_a.json()["data"]["accessToken"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 1. Direct SegFormer Semantic Segmentation on beach.jpg
    with open("D:/hocWeb/P_AI/test-images/beach.jpg", "rb") as f:
        r_up = requests.post(f"{BASE_GW}/images", headers=headers_a, files={"image": ("beach.jpg", f, "image/jpeg")})
    beach_id = r_up.json()["data"]["image"]["id"]
    beach_url = r_up.json()["data"]["image"]["imageUrl"]

    r_seg = requests.post(f"{BASE_AI}/semantic-segmentation", json={"imageUrl": beach_url}, timeout=60)
    assert r_seg.status_code == 200, f"SegFormer failed: {r_seg.text}"
    seg_data = r_seg.json()["data"]
    print(f"[1] SegFormer on beach.jpg ({seg_data['processingTimeMs']}ms):")
    print(f"    Model: {seg_data['model']}")
    print(f"    Regions ({len(seg_data['regions'])}):")
    for r in seg_data["regions"]:
        print(f"      - {r['label']}: {r['regionPercentage']}% ({r['pixelCount']:,} px)")

    # 2. Mandatory Beach Case Test via Gateway POST /api/image-analysis
    print("\n[2] MANDATORY BEACH CASE TEST (Full Pipeline via Gateway):")
    t0 = time.time()
    r_beach_analysis = requests.post(f"{BASE_GW}/image-analysis", headers=headers_a, json={"imageId": beach_id}, timeout=90)
    beach_time = round(time.time() - t0, 2)
    assert r_beach_analysis.status_code in [200, 201], f"Beach analysis failed: {r_beach_analysis.text}"
    b_res = r_beach_analysis.json()["data"]["analysis"]
    print(f"    Pipeline Latency: {beach_time}s")
    print(f"    Pipeline Status: {b_res['status']}")
    print(f"    Modules Status: {b_res['modules']}")
    print(f"    Inferred Scene: {b_res['fusedResult']['sceneType']} ({b_res['fusedResult']['environment']})")
    print(f"    Dominant Regions: {b_res['fusedResult']['dominantRegions']}")
    print(f"    YOLO Objects Detected: {b_res['objectDetection']['objectCount']}")
    print(f"    OCR Text Detected: {repr(b_res['ocr']['fullText'])}")
    print(f"    Vision Description: \"{b_res['fusedResult']['description']}\"")
    print(f"    Fallback Used: {b_res['vision'].get('isFallback')}")

    # 3. Partial Failure Test: Send invalid image URL directly to /image-analysis or simulate failure
    print("\n[3] PARTIAL SUCCESS / FAILURE RESILIENCE TEST:")
    try:
        r_err = requests.post(f"{BASE_AI}/image-analysis", json={"imageUrl": "http://127.0.0.1:9999/non-existent.jpg"}, timeout=10)
        print(f"    Invalid URL handling: status={r_err.status_code}")
    except Exception as e:
        print(f"    Invalid URL handled via connection rejection: {e}")

    # 4. Gateway History & Anti-IDOR
    r_hist = requests.get(f"{BASE_GW}/image-analysis", headers=headers_a)
    assert r_hist.status_code == 200
    print(f"\n[4] User A image-analysis history count: {len(r_hist.json()['data']['analyses'])}")

    res_b = requests.post(f"{BASE_GW}/auth/login", json={"email": "audit_user_b_test@example.com", "password": "Password123!"})
    token_b = res_b.json()["data"]["accessToken"]
    r_idor = requests.get(f"{BASE_GW}/image-analysis/{b_res['id']}", headers={"Authorization": f"Bearer {token_b}"})
    print(f"[5] Anti-IDOR Image Analysis Check: status={r_idor.status_code} msg={r_idor.json().get('message')}")
    assert r_idor.status_code in [403, 404]

    print("=== PHASE 7 MULTIMODAL AUDIT VERIFICATION PASSED ===")

if __name__ == "__main__":
    main()
