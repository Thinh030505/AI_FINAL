"""
Fine-Grained Detector Training Engine: training/train_finegrained_detector.py
Trains or fine-tunes detector candidates on standardized ontology with micro-object-safe
augmentations within RTX 4050 6GB VRAM budget.
"""

import os
import sys
import shutil
import json
import yaml
import torch
from ultralytics import YOLO

CONFIG_PATH = os.path.abspath("configs/train_finegrained_v1.yaml")
CANDIDATES_DIR = os.path.abspath("models/candidates")
REPORTS_DIR = os.path.abspath("reports")

def main():
    base_model_name = sys.argv[1] if len(sys.argv) > 1 else "yolo11n"
    epochs_override = int(sys.argv[2]) if len(sys.argv) > 2 else 20

    os.makedirs(CANDIDATES_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)

    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)

    # Determine device
    device = 0 if torch.cuda.is_available() else "cpu"
    print(f"==========================================")
    print(f"TRAINING DETECTOR CANDIDATE: {base_model_name}")
    print(f"Device: {device} | Epochs: {epochs_override} | Batch: {cfg['batch']}")
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        total_vram = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        print(f"GPU: {gpu_name} ({total_vram:.2f} GB)")
    print(f"==========================================")

    # Initialize base model
    model_weight = f"ai-service/models/{base_model_name}.pt"
    if not os.path.exists(model_weight):
        model_weight = f"{base_model_name}.pt"

    model = YOLO(model_weight)

    project_dir = os.path.abspath("runs/train_finegrained")
    run_name = f"{base_model_name}_v1"

    results = model.train(
        data=os.path.abspath(cfg["data"]),
        epochs=epochs_override,
        batch=cfg["batch"],
        imgsz=cfg["imgsz"],
        device=device,
        workers=cfg.get("workers", 2),
        optimizer=cfg.get("optimizer", "AdamW"),
        lr0=cfg.get("lr0", 0.002),
        lrf=cfg.get("lrf", 0.01),
        mosaic=cfg.get("mosaic", 0.3),
        mixup=cfg.get("mixup", 0.1),
        copy_paste=cfg.get("copy_paste", 0.1),
        scale=cfg.get("scale", 0.5),
        project=project_dir,
        name=run_name,
        exist_ok=True,
        verbose=True
    )

    best_weights_path = os.path.join(project_dir, run_name, "weights", "best.pt")
    candidate_out_path = os.path.join(CANDIDATES_DIR, f"{base_model_name}_finegrained_v1.pt")

    if os.path.exists(best_weights_path):
        shutil.copy(best_weights_path, candidate_out_path)
        print(f"Best candidate weights saved to: {candidate_out_path}")
    else:
        last_weights_path = os.path.join(project_dir, run_name, "weights", "last.pt")
        if os.path.exists(last_weights_path):
            shutil.copy(last_weights_path, candidate_out_path)
            print(f"Last candidate weights saved to: {candidate_out_path}")

    # Export training metrics report
    report = {
        "candidate_name": f"{base_model_name}_finegrained_v1",
        "base_model": base_model_name,
        "epochs": epochs_override,
        "device": str(device),
        "weights_path": candidate_out_path,
        "status": "COMPLETED"
    }

    report_path = os.path.join(REPORTS_DIR, f"training_{base_model_name}_metrics.json")
    with open(report_path, "w", encoding="utf-8") as rf:
        json.dump(report, rf, indent=2)

    print(f"Training summary written to: {report_path}")

if __name__ == "__main__":
    main()
