import os
import sys
import time
import numpy as np
from ultralytics import YOLO
import psutil

process = psutil.Process(os.getpid())

def get_ram_mb():
    return round(process.memory_info().rss / (1024 * 1024), 2)

def benchmark_yolo():
    print("=== YOLO RUNTIME BENCHMARK (PyTorch vs ONNX Runtime) ===")
    pt_path = r"D:\hocWeb\P_AI\ai-service\yolo11n.pt"
    onnx_path = r"D:\hocWeb\P_AI\ai-service\yolo11n.onnx"
    test_img = r"D:\hocWeb\P_AI\test-images\street.jpg"

    # 1. Export ONNX once if not present
    if not os.path.exists(onnx_path):
        print(f"Exporting {pt_path} to ONNX format...")
        model = YOLO(pt_path)
        model.export(format="onnx", imgsz=640, dynamic=True)
        print("ONNX model export completed.")
    else:
        print(f"Existing ONNX model found at {onnx_path}")

    # 2. Benchmark PyTorch
    print("\n--- Benchmarking PyTorch (.pt) ---")
    model_pt = YOLO(pt_path)
    # Warmup
    for _ in range(3):
        model_pt(test_img, verbose=False)

    times_pt = []
    for _ in range(15):
        t0 = time.perf_counter()
        res = model_pt(test_img, verbose=False)
        times_pt.append((time.perf_counter() - t0) * 1000)

    avg_pt = np.mean(times_pt)
    min_pt = np.min(times_pt)
    p95_pt = np.percentile(times_pt, 95)
    ram_pt = get_ram_mb()
    detections_pt = len(res[0].boxes)
    print(f"PyTorch (.pt): Avg={avg_pt:.2f}ms | Min={min_pt:.2f}ms | P95={p95_pt:.2f}ms | Detected={detections_pt} objects | RAM={ram_pt}MB")

    # 3. Benchmark ONNX
    print("\n--- Benchmarking ONNX Runtime (.onnx) ---")
    model_onnx = YOLO(onnx_path)
    # Warmup
    for _ in range(3):
        model_onnx(test_img, verbose=False)

    times_onnx = []
    for _ in range(15):
        t0 = time.perf_counter()
        res_onnx = model_onnx(test_img, verbose=False)
        times_onnx.append((time.perf_counter() - t0) * 1000)

    avg_onnx = np.mean(times_onnx)
    min_onnx = np.min(times_onnx)
    p95_onnx = np.percentile(times_onnx, 95)
    ram_onnx = get_ram_mb()
    detections_onnx = len(res_onnx[0].boxes)
    print(f"ONNX Runtime: Avg={avg_onnx:.2f}ms | Min={min_onnx:.2f}ms | P95={p95_onnx:.2f}ms | Detected={detections_onnx} objects | RAM={ram_onnx}MB")

    speedup = ((avg_pt - avg_onnx) / avg_pt) * 100
    print("\n=== SUMMARY COMPARISON ===")
    print(f"PyTorch Average: {avg_pt:.2f} ms")
    print(f"ONNX Average:    {avg_onnx:.2f} ms")
    print(f"Speedup:         {speedup:+.2f}%")
    print(f"Accuracy match:  PyTorch={detections_pt} objects vs ONNX={detections_onnx} objects")

    return {
        "pytorch": {"avgMs": round(avg_pt, 2), "minMs": round(min_pt, 2), "p95Ms": round(p95_pt, 2), "detections": detections_pt},
        "onnx": {"avgMs": round(avg_onnx, 2), "minMs": round(min_onnx, 2), "p95Ms": round(p95_onnx, 2), "detections": detections_onnx},
        "speedupPercent": round(speedup, 2)
    }

if __name__ == "__main__":
    benchmark_yolo()
