"""
Threshold Calibration Engine: training/calibrate_thresholds.py
Performs precision-recall curve analysis and threshold sweep on validation split
to calibrate per-class operational confidence thresholds maximizing F1-score.
Exports to configs/class_thresholds.yaml.
"""

import os
import sys
import glob
import json
import yaml
import cv2
import numpy as np
import torch
from ultralytics import YOLO

ONTOLOGY_PATH = os.path.abspath("datasets/class_ontology.yaml")
VAL_IMAGES_DIR = os.path.abspath("datasets/processed/images/val")
VAL_LABELS_DIR = os.path.abspath("datasets/processed/labels/val")
CONFIGS_DIR = os.path.abspath("configs")
THRESHOLDS_OUT = os.path.join(CONFIGS_DIR, "class_thresholds.yaml")

def load_ontology():
    with open(ONTOLOGY_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return {c["id"]: c["name"] for c in data["classes"]}, data["classes"]

def compute_box_iou(box1, box2):
    x1_min, y1_min = box1[0] - box1[2] / 2, box1[1] - box1[3] / 2
    x1_max, y1_max = box1[0] + box1[2] / 2, box1[1] + box1[3] / 2
    x2_min, y2_min = box2[0] - box2[2] / 2, box2[1] - box2[3] / 2
    x2_max, y2_max = box2[0] + box2[2] / 2, box2[1] + box2[3] / 2

    inter_w = max(0.0, min(x1_max, x2_max) - max(x1_min, x2_min))
    inter_h = max(0.0, min(y1_max, y2_max) - max(y1_min, y2_min))
    inter_area = inter_w * inter_h
    union = box1[2] * box1[3] + box2[2] * box2[3] - inter_area
    return inter_area / union if union > 0 else 0.0

def main():
    model_path = sys.argv[1] if len(sys.argv) > 1 else "models/candidates/yolo11n_finegrained_v1.pt"
    if not os.path.exists(model_path):
        model_path = "ai-service/models/yolo11n.pt"

    device = "cuda" if torch.cuda.is_available() else "cpu"
    id_to_name, classes_meta = load_ontology()
    name_to_id = {c["name"].lower(): c["id"] for c in classes_meta}

    print(f"Calibrating per-class thresholds for {model_path} on validation set...")
    model = YOLO(model_path)

    val_imgs = sorted(glob.glob(os.path.join(VAL_IMAGES_DIR, "*.jpg")))
    print(f"Validation images: {len(val_imgs)}")

    # Collect ground truths and model raw predictions (conf >= 0.05)
    all_gt = []    # per image: list of (cls_id, xc, yc, w, h)
    all_preds = [] # per image: list of (cls_id, xc, yc, w, h, conf)

    # Class ID mapping
    model_class_map = {}
    if hasattr(model, "names") and model.names:
        for idx, m_name in model.names.items():
            norm_name = m_name.lower().replace("-", " ").replace("_", " ")
            if norm_name in name_to_id:
                model_class_map[idx] = name_to_id[norm_name]
            elif m_name.lower() in name_to_id:
                model_class_map[idx] = name_to_id[m_name.lower()]

    for ipath in val_imgs:
        fname = os.path.basename(ipath)
        lpath = os.path.join(VAL_LABELS_DIR, os.path.splitext(fname)[0] + ".txt")

        gt_boxes = []
        if os.path.exists(lpath):
            with open(lpath, "r", encoding="utf-8") as lf:
                for line in lf:
                    p = line.strip().split()
                    if len(p) == 5:
                        gt_boxes.append((int(p[0]), float(p[1]), float(p[2]), float(p[3]), float(p[4])))
        all_gt.append(gt_boxes)

        img = cv2.imread(ipath)
        res = model.predict(source=img, conf=0.05, device=device, verbose=False)
        preds = []
        for r in res:
            for b in r.boxes:
                raw_cls = int(b.cls[0].item())
                conf = float(b.conf[0].item())
                xywhn = b.xywhn[0].tolist()
                canon_id = model_class_map.get(raw_cls, raw_cls)
                preds.append((canon_id, xywhn[0], xywhn[1], xywhn[2], xywhn[3], conf))
        all_preds.append(preds)

    # Sweep thresholds per class
    threshold_steps = np.arange(0.10, 0.85, 0.05)
    calibrated_thresholds = {}

    for c in classes_meta:
        cid = c["id"]
        cname = c["name"]
        scale_tier = c.get("scale_tier", "medium")

        # Default fallback by scale tier
        default_th = 0.20 if scale_tier == "micro" else 0.25

        # Check if class is present in val GT
        total_class_gt = sum(sum(1 for g in gt if g[0] == cid) for gt in all_gt)
        if total_class_gt == 0:
            calibrated_thresholds[cname] = {
                "class_id": cid,
                "threshold": float(default_th),
                "f1_score": 0.0,
                "status": "default_tier"
            }
            continue

        best_f1 = -1.0
        best_th = default_th
        best_p = 0.0
        best_r = 0.0

        for th in threshold_steps:
            tp = 0
            fp = 0
            fn = 0

            for img_idx in range(len(val_imgs)):
                gt_list = [g for g in all_gt[img_idx] if g[0] == cid]
                pred_list = [p for p in all_preds[img_idx] if p[0] == cid and p[5] >= th]

                matched_gt = set()
                matched_pred = set()

                for g_idx, g in enumerate(gt_list):
                    for p_idx, p in enumerate(pred_list):
                        if p_idx in matched_pred:
                            continue
                        iou = compute_box_iou(g[1:], p[1:5])
                        if iou >= 0.50:
                            matched_gt.add(g_idx)
                            matched_pred.add(p_idx)
                            break

                tp += len(matched_gt)
                fn += (len(gt_list) - len(matched_gt))
                fp += (len(pred_list) - len(matched_pred))

            prec = tp / max(1, (tp + fp))
            rec = tp / max(1, (tp + fn))
            f1 = 2 * prec * rec / max(1e-6, (prec + rec))

            if f1 > best_f1:
                best_f1 = f1
                best_th = float(th)
                best_p = prec
                best_r = rec

        calibrated_thresholds[cname] = {
            "class_id": cid,
            "threshold": round(best_th, 2),
            "precision": round(best_p, 4),
            "recall": round(best_r, 4),
            "f1_score": round(best_f1, 4),
            "status": "calibrated"
        }

    # Save to yaml
    output_data = {
        "version": "1.0.0",
        "default_threshold": 0.25,
        "classes": calibrated_thresholds
    }

    os.makedirs(CONFIGS_DIR, exist_ok=True)
    with open(THRESHOLDS_OUT, "w", encoding="utf-8") as f:
        yaml.dump(output_data, f, sort_keys=False)

    print(f"Class threshold calibration complete. Saved to: {THRESHOLDS_OUT}")
    cal_count = sum(1 for v in calibrated_thresholds.values() if v.get("status") == "calibrated")
    print(f"Classes calibrated with validation instances: {cal_count}/{len(classes_meta)}")

if __name__ == "__main__":
    main()
