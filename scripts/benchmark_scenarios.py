import os
import time
import httpx
import json

SCENARIOS = [
    {
        "id": "Scenario A",
        "name": "One person",
        "image": "test-images/accessories/person_phone.jpg",
        "mode": "everything",
        "ocr": False,
        "thresh": 0.20
    },
    {
        "id": "Scenario B",
        "name": "Person + accessories (glasses)",
        "image": "test-images/accessories/person_glasses.jpg",
        "mode": "everything",
        "ocr": False,
        "thresh": 0.20
    },
    {
        "id": "Scenario C",
        "name": "Multiple people",
        "image": "test-images/accessories/multiple_people.jpg",
        "mode": "detailed",
        "ocr": False,
        "thresh": 0.20
    },
    {
        "id": "Scenario D",
        "name": "Desk / office scene",
        "image": "test-images/office.jpg",
        "mode": "everything",
        "ocr": False,
        "thresh": 0.15
    },
    {
        "id": "Scenario E",
        "name": "Street / vehicles / scene",
        "image": "test-images/street.jpg",
        "mode": "simple",
        "ocr": False,
        "thresh": 0.20
    },
    {
        "id": "Scenario F",
        "name": "Outdoor nature / scene objects",
        "image": "test-images/beach.jpg",
        "mode": "everything",
        "ocr": False,
        "thresh": 0.15
    },
    {
        "id": "Scenario G",
        "name": "Text / Sign / OCR (Gated)",
        "image": "test-images/doc_invoice.png",
        "mode": "everything",
        "ocr": True,
        "thresh": 0.20
    },
    {
        "id": "Scenario H",
        "name": "Low light person",
        "image": "test-images/accessories/person_low_light.jpg",
        "mode": "everything",
        "ocr": False,
        "thresh": 0.20
    },
    {
        "id": "Scenario I",
        "name": "Multi-accessories person",
        "image": "test-images/accessories/person_multi_accessories.jpg",
        "mode": "everything",
        "ocr": False,
        "thresh": 0.20
    }
]

def run_benchmarks():
    print("================================================================================")
    print("        SMART CAMERA EVERYTHING DETECTION - SCENARIO BENCHMARK SUITE")
    print("================================================================================")

    results = []

    for sc in SCENARIOS:
        img_path = sc["image"]
        if not os.path.exists(img_path):
            print(f"Skipping {sc['id']}: {img_path} not found")
            continue

        print(f"\n--- Running [{sc['id']}: {sc['name']}] ---")
        t0 = time.time()
        with open(img_path, "rb") as f:
            files = {"file": (os.path.basename(img_path), f, "image/jpeg")}
            data = {
                "frameId": 1,
                "mode": sc["mode"],
                "confidenceThreshold": sc["thresh"],
                "enableOcr": sc["ocr"],
                "targetLang": "vi"
            }
            resp = httpx.post(
                "http://localhost:3000/api/smart-camera/analyze-frame",
                files=files,
                data=data,
                timeout=60.0
            )

        wall_latency = round((time.time() - t0) * 1000, 1)

        if resp.status_code == 200:
            payload = resp.json()
            analysis = payload.get("data", {})
            detections = analysis.get("detections", [])
            timings = analysis.get("timings", {})
            device = analysis.get("device", {})

            labels = [f"{d['label']} ({d['confidence']:.2f})" for d in detections[:6]]
            more = f" ... and {len(detections)-6} more" if len(detections) > 6 else ""

            status_str = "VERIFIED" if len(detections) > 0 else "PARTIALLY_VERIFIED"

            print(f"  Status: {status_str}")
            print(f"  Objects Detected ({len(detections)}): {', '.join(labels)}{more}")
            print(f"  Timings: General={timings.get('generalDetectionMs', 0)}ms, Specialist={timings.get('specialistMs', 0)}ms, OpenVocab={timings.get('openVocabMs', 0)}ms, OCR={timings.get('ocrMs', 0)}ms, Total={timings.get('totalMs', 0)}ms")
            print(f"  Gateway Wall Latency: {wall_latency} ms")

            results.append({
                "scenario": sc["id"],
                "name": sc["name"],
                "objectsCount": len(detections),
                "labels": [d["label"] for d in detections],
                "aiTotalMs": timings.get("totalMs", 0),
                "gatewayWallMs": wall_latency,
                "status": status_str,
                "device": device
            })
        else:
            print(f"  FAILED: HTTP {resp.status_code} - {resp.text}")
            results.append({
                "scenario": sc["id"],
                "name": sc["name"],
                "status": "BLOCKED",
                "error": resp.text
            })

    # Save benchmark results
    with open("reports/smart_camera_benchmark_results.json", "w") as out:
        json.dump(results, out, indent=2)

    print("\n================================================================================")
    print("                     BENCHMARK SUMMARY TABLE")
    print("================================================================================")
    print(f"{'Scenario':<12} | {'Name':<32} | {'Detections':<10} | {'AI Latency':<10} | {'Status'}")
    print("-" * 80)
    for r in results:
        cnt = str(r.get("objectsCount", 0))
        lat = f"{r.get('aiTotalMs', 0)} ms"
        st = r.get("status", "UNKNOWN")
        print(f"{r['scenario']:<12} | {r['name']:<32} | {cnt:<10} | {lat:<10} | {st}")
    print("================================================================================")

if __name__ == "__main__":
    os.makedirs("reports", exist_ok=True)
    run_benchmarks()
