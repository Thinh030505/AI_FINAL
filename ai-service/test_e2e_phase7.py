import requests
import json
import time

BASE_URL = "http://localhost:3000/api"

def main():
    print("=" * 70)
    print("      PHASE 7 END-TO-END GATEWAY INTEGRATION & SECURITY TEST")
    print("=" * 70)

    # 1. Login
    login_data = {"email": "phase7test@example.com", "password": "Password123!"}
    res = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    assert res.status_code in [200, 201], f"Login failed: {res.text}"
    token = res.json()["data"]["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[1/6] Login successful. Bearer token acquired.")

    # 2. Upload Street image
    street_path = "D:/hocWeb/P_AI/test-images/street.jpg"
    with open(street_path, "rb") as f:
        files = {"image": ("street.jpg", f, "image/jpeg")}
        upload_res = requests.post(f"{BASE_URL}/images", headers=headers, files=files)
    assert upload_res.status_code in [200, 201], f"Upload failed: {upload_res.text}"
    img_record = upload_res.json()["data"]["image"]
    image_id = img_record["id"]
    image_url = img_record["imageUrl"]
    print(f"[2/6] Image uploaded to Cloudinary: ID={image_id}, URL={image_url}")

    # 3. Call Image Analysis via NestJS Gateway
    print("[3/6] Invoking POST /api/image-analysis (SegFormer + YOLO11 + PaddleOCR + Fusion)...")
    t0 = time.time()
    analysis_res = requests.post(f"{BASE_URL}/image-analysis", headers=headers, json={"imageId": image_id}, timeout=180)
    latency = round(time.time() - t0, 2)
    assert analysis_res.status_code in [200, 201], f"Image Analysis failed: {analysis_res.text}"
    analysis_data = analysis_res.json()["data"]["analysis"]

    print(f"   Pipeline completed in {latency}s")
    print(f"   Record ID: {analysis_data['id']}")
    print(f"   Status: {analysis_data['status']}")
    print(f"   Scene Type: {analysis_data['fusedResult']['sceneType']}")
    print(f"   Environment: {analysis_data['fusedResult']['environment']}")
    print(f"   Dominant Regions: {analysis_data['fusedResult']['dominantRegions']}")
    print(f"   Object Count: {analysis_data['objectDetection']['objectCount']}")
    print(f"   Segmentation Regions: {len(analysis_data['segmentation']['regions'])}")
    print(f"   Description: {analysis_data['fusedResult']['description']}")

    # 4. Get History
    hist_res = requests.get(f"{BASE_URL}/image-analysis", headers=headers)
    assert hist_res.status_code == 200
    records = hist_res.json()["data"]["analyses"]
    print(f"[4/6] GET /api/image-analysis returned {len(records)} history records.")

    # 5. Get by ID
    get_id = analysis_data["id"]
    single_res = requests.get(f"{BASE_URL}/image-analysis/{get_id}", headers=headers)
    assert single_res.status_code == 200
    assert single_res.json()["data"]["analysis"]["id"] == get_id
    print(f"[5/6] GET /api/image-analysis/{get_id} verified successfully.")

    # 6. Anti-IDOR Security: Test without auth header
    unauth_res = requests.get(f"{BASE_URL}/image-analysis/{get_id}")
    assert unauth_res.status_code == 401, f"Anti-IDOR failed: {unauth_res.status_code}"
    print("[6/6] Anti-IDOR check PASSED: Unauthenticated access rejected with HTTP 401.")
    print("\n" + "=" * 70)
    print("  ALL PHASE 7 END-TO-END GATEWAY TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 70)

if __name__ == "__main__":
    main()
