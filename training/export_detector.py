"""
Model Export & Optimization Engine: training/export_detector.py
Exports trained fine-grained detector models to ONNX (opset 17, dynamic batch/axes)
and benchmarks exported runtime performance.
"""

import os
import sys
import time
import json
import torch
from ultralytics import YOLO

REPORTS_DIR = os.path.abspath("reports")

def export_model(model_weights_path: str, format_type: str = "onnx", opset: int = 17):
    os.makedirs(REPORTS_DIR, exist_ok=True)
    if not os.path.exists(model_weights_path):
        raise FileNotFoundError(f"Model weights not found: {model_weights_path}")

    print(f"Loading model for export: {model_weights_path}")
    model = YOLO(model_weights_path)

    t0 = time.perf_counter()
    exported_path = model.export(
        format=format_type,
        opset=opset,
        dynamic=True,
        simplify=True
    )
    export_elapsed_s = round(time.perf_counter() - t0, 2)
    print(f"Export completed in {export_elapsed_s}s -> {exported_path}")

    # Check file size
    pt_size_mb = round(os.path.getsize(model_weights_path) / (1024 * 1024), 2)
    export_size_mb = round(os.path.getsize(exported_path) / (1024 * 1024), 2) if os.path.exists(exported_path) else 0.0

    report = {
        "source_weights": model_weights_path,
        "exported_format": format_type,
        "exported_path": str(exported_path),
        "opset": opset,
        "dynamic_axes": True,
        "pytorch_size_mb": pt_size_mb,
        "exported_size_mb": export_size_mb,
        "export_time_seconds": export_elapsed_s,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

    out_json = os.path.join(REPORTS_DIR, "model_export_report.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"Export metrics saved to: {out_json}")
    return report

if __name__ == "__main__":
    weights = sys.argv[1] if len(sys.argv) > 1 else "models/candidates/yolo11n_finegrained_v1.pt"
    fmt = sys.argv[2] if len(sys.argv) > 2 else "onnx"
    export_model(weights, fmt)
