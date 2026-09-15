import os
import sys
import time
import json
import psutil
import httpx

TEST_IMAGES = [
    ("Beach", r"D:\hocWeb\P_AI\test-images\beach.jpg"),
    ("Street", r"D:\hocWeb\P_AI\test-images\street.jpg"),
    ("Receipt", r"D:\hocWeb\P_AI\test-images\receipt.jpg"),
    ("Person+Phone", r"D:\hocWeb\P_AI\test-images\person_phone.jpg"),
    ("Office", r"D:\hocWeb\P_AI\test-images\office.jpg"),
    ("Text-heavy", r"D:\hocWeb\P_AI\test-images\text_heavy.png"),
    ("Low-text", r"D:\hocWeb\P_AI\test-images\low_text.jpg"),
    ("Object-poor", r"D:\hocWeb\P_AI\test-images\object_poor.jpg"),
]

API_URL = "http://127.0.0.1:8000/image-analysis"

process = psutil.Process(os.getpid())

def get_ram_mb():
    return round(process.memory_info().rss / (1024 * 1024), 2)

def run_after_benchmarks():
    print("=" * 80)
    print("PHASE 9 EMPIRICAL BENCHMARK (AFTER OPTIMIZATION)")
    print("Target: Balanced Adaptive Routing with Concurrency & Single Fetch")
    print("=" * 80)

    # Load BEFORE data for direct comparison
    before_file = os.path.join(os.path.dirname(__file__), "benchmark_baseline_before.json")
    before_map = {}
    if os.path.exists(before_file):
        with open(before_file, "r", encoding="utf-8") as f:
            before_data = json.load(f)
            for r in before_data.get("results", []):
                before_map[r["category"]] = r

    results = []
    cache_results = []

    with httpx.Client(timeout=120.0) as client:
        # First check health
        health = client.get("http://127.0.0.1:8000/health")
        print(f"Server Health: {health.status_code} -> {health.json()}\n")

        for category, path in TEST_IMAGES:
            filename = os.path.basename(path)
            print(f"\n--- Testing [{category}] ({filename}) ---")
            if not os.path.exists(path):
                print(f"Error: File not found {path}")
                continue

            # Run 1: Cold/Warm request in balanced mode
            t_start = time.perf_counter()
            resp = client.post(API_URL, json={
                "imageUrl": path,
                "mode": "balanced",
                "forceOcr": False
            })
            total_client_ms = round((time.perf_counter() - t_start) * 1000, 2)

            if resp.status_code != 200:
                print(f"API Error ({resp.status_code}): {resp.text}")
                continue

            res_json = resp.json()
            analysis = res_json.get("data", {})
            if "analysis" in analysis:
                analysis = analysis["analysis"]
            timings = analysis.get("timings", {})
            routing = analysis.get("routingDecision", {})
            modules = analysis.get("modules", {})
            objects = analysis.get("objectDetection", {}).get("detections", [])
            regions = analysis.get("segmentation", {}).get("regions", [])
            ocr_info = analysis.get("ocr", {})
            ocr_lines = ocr_info.get("lines", [])
            fused = analysis.get("fusedResult", {})

            row = {
                "category": category,
                "filename": filename,
                "mode": "balanced",
                "qualityCheckMs": timings.get("qualityCheckMs", 0.0),
                "routingMs": timings.get("routingMs", 0.0),
                "yoloMs": timings.get("objectDetectionMs", 0.0),
                "segFormerMs": timings.get("segmentationMs", 0.0),
                "ocrMs": timings.get("ocrMs", 0.0),
                "visionMs": timings.get("visionMs", 0.0),
                "fusionMs": timings.get("fusionMs", 0.0),
                "serverTotalMs": timings.get("totalMs", 0.0),
                "clientTotalMs": total_client_ms,
                "detectedObjects": len(objects),
                "regionsCount": len(regions),
                "ocrLines": len(ocr_lines),
                "sceneType": fused.get("sceneType", ""),
                "routingReason": routing.get("reason", ""),
                "modules": modules,
            }
            results.append(row)

            b_row = before_map.get(category, {})
            b_total = b_row.get("totalMs", 0.0)
            diff_pct = round(((b_total - total_client_ms) / b_total) * 100, 1) if b_total > 0 else 0.0

            print(f"  [RESULT] Client Total: {total_client_ms}ms (Server: {timings.get('totalMs', 0)}ms)")
            print(f"  Breakdown: Quality={timings.get('qualityCheckMs', 0)}ms | Router={timings.get('routingMs', 0)}ms | YOLO={timings.get('objectDetectionMs', 0)}ms | Seg={timings.get('segmentationMs', 0)}ms | OCR={timings.get('ocrMs', 0)}ms ({modules.get('ocr', 'executed')}) | Vision={timings.get('visionMs', 0)}ms | Fusion={timings.get('fusionMs', 0)}ms")
            print(f"  Routing Decision: {routing.get('reason', 'N/A')}")
            print(f"  Objects: {len(objects)} | Regions: {len(regions)} | OCR Lines: {len(ocr_lines)} | Scene: {fused.get('sceneType')}")
            if b_total > 0:
                print(f"  ==> SPEEDUP vs BEFORE: {b_total:.1f}ms -> {total_client_ms:.1f}ms ({diff_pct:+}% faster!)")

            # Run 2: Immediate repeat to test Cache Hit
            t_cache_start = time.perf_counter()
            cache_resp = client.post(API_URL, json={
                "imageUrl": path,
                "mode": "balanced",
                "forceOcr": False
            })
            cache_client_ms = round((time.perf_counter() - t_cache_start) * 1000, 2)
            cache_results.append({
                "category": category,
                "cacheHitMs": cache_client_ms
            })
            print(f"  [CACHE TEST] Repeat Request: {cache_client_ms}ms")

    # Output Comparative Markdown Table
    print("\n" + "=" * 90)
    print("COMPARATIVE BENCHMARK: BEFORE vs AFTER OPTIMIZATION")
    print("=" * 90)
    headers = ["Category", "Image", "Before (ms)", "After (ms)", "Speedup (%)", "YOLO (ms)", "Seg (ms)", "OCR Status", "Objects (B/A)", "Regions (B/A)"]
    print(f"| {' | '.join(headers)} |")
    print(f"|{'|'.join(['---' for _ in headers])}|")

    for r in results:
        cat = r["category"]
        b = before_map.get(cat, {})
        b_ms = b.get("totalMs", 0.0)
        a_ms = r["clientTotalMs"]
        pct = round(((b_ms - a_ms) / b_ms) * 100, 1) if b_ms > 0 else 0.0
        ocr_status = f"{r['ocrMs']:.1f}ms" if r['modules'].get('ocr') != 'skipped' else "Skipped"
        b_objs = b.get("detectedObjects", "-")
        a_objs = r["detectedObjects"]
        b_regs = b.get("regionsCount", "-")
        a_regs = r["regionsCount"]
        print(f"| {cat} | {r['filename']} | {b_ms:.1f} | {a_ms:.1f} | {pct:+}% | {r['yoloMs']:.1f} | {r['segFormerMs']:.1f} | {ocr_status} | {b_objs}/{a_objs} | {b_regs}/{a_regs} |")

    # Save to benchmark_baseline_after.json
    output_path = os.path.join(os.path.dirname(__file__), "benchmark_baseline_after.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "results": results,
            "cacheResults": cache_results
        }, f, indent=2, ensure_ascii=False)
    print(f"\nSaved benchmark results to {output_path}")

if __name__ == "__main__":
    run_after_benchmarks()
