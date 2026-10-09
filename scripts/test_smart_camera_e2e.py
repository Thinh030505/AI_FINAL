import httpx
import json

def test_smart_camera_e2e():
    print("=== Testing Smart Camera End-to-End through NestJS Gateway (Port 3000) ===")

    # 1. Test Gateway Status
    try:
        r_status = httpx.get("http://localhost:3000/api/smart-camera/status", timeout=5.0)
        print(f"[STATUS] NestJS /api/smart-camera/status: {r_status.status_code}")
        print("  Payload:", json.dumps(r_status.json(), indent=2))
    except Exception as e:
        print(f"[ERROR] Failed to query status: {e}")
        return

    # 2. Test Analyze Frame via Gateway (multipart upload)
    image_path = "test-images/accessories/person_glasses.jpg"
    print(f"\n[ANALYZE] Submitting frame: {image_path} (mode=everything, threshold=0.25)...")

    with open(image_path, "rb") as f:
        files = {"file": ("frame.jpg", f, "image/jpeg")}
        data = {
            "frameId": 1,
            "mode": "everything",
            "confidenceThreshold": 0.25,
            "enableOcr": False
        }
        r_analyze = httpx.post(
            "http://localhost:3000/api/smart-camera/analyze-frame",
            files=files,
            data=data,
            timeout=15.0
        )
        print(f"[ANALYZE] HTTP Status Code: {r_analyze.status_code}")
        payload = r_analyze.json()
        assert payload.get("success") is True, f"Expected success=true, got {payload}"
        analysis = payload.get("data", {})
        detections = analysis.get("detections", [])
        timings = analysis.get("timings", {})
        device = analysis.get("device", {})

        print(f"  Frame ID: {analysis.get('frameId')}")
        print(f"  Image dimensions: {analysis.get('image')}")
        print(f"  Device: {device}")
        print(f"  Active Tracks: {analysis.get('activeTrackCount')}")
        print(f"  Timings: {json.dumps(timings, indent=2)}")
        print(f"  Total Detections Found: {len(detections)}")

        for d in detections:
            print(f"    - [{d.get('level').upper()}] #{d.get('trackId')} '{d.get('label')}' ({d.get('confidence'):.2f}) -> bbox: {d.get('bbox')}, parent={d.get('parentId')}, children={d.get('childrenIds')}")

if __name__ == "__main__":
    test_smart_camera_e2e()
