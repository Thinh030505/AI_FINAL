"""
Phase 11 Benchmark & Promotion Engine: training/run_full_phase11_benchmark.py
Executes frozen evaluation across Baseline and Candidate models, verifies promotion gates,
conducts hard negative false positive and small-object breakdown, produces failure analysis,
and promotes winning model with atomic rollback capability.
"""

import os
import sys
import json
import time
import shutil
import yaml
import cv2
import numpy as np
import torch

sys.path.insert(0, os.path.abspath("."))
from training.evaluate_detector import run_evaluation, load_ontology, compute_box_iou

BENCHMARK_DIR = os.path.abspath("datasets/benchmarks/phase11_v1")
BENCHMARK_META = os.path.join(BENCHMARK_DIR, "benchmark_meta.json")
FAILURES_DIR = os.path.abspath("reports/phase11_failures")
REGISTRY_PATH = os.path.abspath("ai-service/model_registry.json")
PRODUCTION_DIR = os.path.abspath("models/production")
REPORTS_DIR = os.path.abspath("reports")

def generate_failure_visualizations(model_path, candidate_name):
    os.makedirs(FAILURES_DIR, exist_ok=True)
    name_to_id, id_to_name, classes_list = load_ontology()
    with open(BENCHMARK_META, "r", encoding="utf-8") as f:
        meta = json.load(f)

    from ultralytics import YOLO
    model = YOLO(model_path)
    device = "cuda" if torch.cuda.is_available() else "cpu"

    model_class_map = {}
    if hasattr(model, "names") and model.names:
        for idx, m_name in model.names.items():
            norm_name = m_name.lower().replace("-", " ").replace("_", " ")
            if norm_name in name_to_id:
                model_class_map[idx] = name_to_id[norm_name]
            elif m_name.lower() in name_to_id:
                model_class_map[idx] = name_to_id[m_name.lower()]

    failure_log = []

    for entry in meta["entries"]:
        fname = entry["image"]
        ipath = os.path.join(BENCHMARK_DIR, "images", fname)
        if not os.path.exists(ipath):
            continue

        img = cv2.imread(ipath)
        ih, iw = img.shape[:2]

        # Load GT
        lpath = os.path.join(BENCHMARK_DIR, "labels", os.path.splitext(fname)[0] + ".txt")
        gt_boxes = []
        if os.path.exists(lpath):
            with open(lpath, "r", encoding="utf-8") as lf:
                for line in lf:
                    p = line.strip().split()
                    if len(p) == 5:
                        gt_boxes.append((int(p[0]), float(p[1]), float(p[2]), float(p[3]), float(p[4])))

        res = model.predict(source=img, conf=0.25, device=device, verbose=False)
        preds = []
        for r in res:
            for b in r.boxes:
                raw_cls = int(b.cls[0].item())
                conf = float(b.conf[0].item())
                xywhn = b.xywhn[0].tolist()
                cid = model_class_map.get(raw_cls, None)
                if cid is not None:
                    preds.append((cid, xywhn[0], xywhn[1], xywhn[2], xywhn[3], conf))

        # Check for False Positives on hard negatives
        is_hard_neg = entry.get("category") == "hard_negative"
        if is_hard_neg and len(preds) > 0:
            vis = img.copy()
            for p in preds:
                cname = id_to_name.get(p[0], f"cls_{p[0]}")
                xmin = int((p[1] - p[3]/2) * iw)
                ymin = int((p[2] - p[4]/2) * ih)
                xmax = int((p[1] + p[3]/2) * iw)
                ymax = int((p[2] + p[4]/2) * ih)
                cv2.rectangle(vis, (xmin, ymin), (xmax, ymax), (0, 0, 255), 2)
                cv2.putText(vis, f"FP: {cname} {p[5]:.2f}", (xmin, max(15, ymin-5)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
            out_fail_path = os.path.join(FAILURES_DIR, f"fail_fp_hardneg_{fname}")
            cv2.imwrite(out_fail_path, vis)
            failure_log.append({
                "type": "false_positive_hard_negative",
                "image": fname,
                "saved_visual": out_fail_path,
                "details": [f"{id_to_name.get(p[0])} ({p[5]:.2f})" for p in preds]
            })

        # Check for False Negatives on small/micro objects
        matched_gt = set()
        for g_idx, g in enumerate(gt_boxes):
            for p in preds:
                if p[0] == g[0] and compute_box_iou(g[1:], p[1:5]) >= 0.50:
                    matched_gt.add(g_idx)
                    break

        unmatched = [gt_boxes[i] for i in range(len(gt_boxes)) if i not in matched_gt]
        if len(unmatched) > 0:
            vis = img.copy()
            for u in unmatched:
                cname = id_to_name.get(u[0], f"cls_{u[0]}")
                xmin = int((u[1] - u[3]/2) * iw)
                ymin = int((u[2] - u[4]/2) * ih)
                xmax = int((u[1] + u[3]/2) * iw)
                ymax = int((u[2] + u[4]/2) * ih)
                cv2.rectangle(vis, (xmin, ymin), (xmax, ymax), (0, 165, 255), 2)
                cv2.putText(vis, f"FN: {cname}", (xmin, max(15, ymin-5)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 165, 255), 1)
            out_fail_path = os.path.join(FAILURES_DIR, f"fail_fn_{fname}")
            cv2.imwrite(out_fail_path, vis)
            failure_log.append({
                "type": "false_negative_missed",
                "image": fname,
                "saved_visual": out_fail_path,
                "details": [id_to_name.get(u[0]) for u in unmatched]
            })

    with open(os.path.join(FAILURES_DIR, f"failure_analysis_{candidate_name}.json"), "w", encoding="utf-8") as f:
        json.dump(failure_log, f, indent=2)

    return failure_log

def check_promotion_gates(baseline_res, candidate_res):
    b_map = baseline_res["metrics"]["mAP50_95"]
    c_map = candidate_res["metrics"]["mAP50_95"]
    b_small_rec = baseline_res["scale_breakdown"]["small_objects"]["recall"]
    c_small_rec = candidate_res["scale_breakdown"]["small_objects"]["recall"]
    b_micro_rec = baseline_res["scale_breakdown"]["micro_objects"]["recall"]
    c_micro_rec = candidate_res["scale_breakdown"]["micro_objects"]["recall"]
    b_fpr = baseline_res["hard_negatives"]["false_positive_rate"]
    c_fpr = candidate_res["hard_negatives"]["false_positive_rate"]
    c_lat_p95 = candidate_res["latency_and_vram"]["latency_p95_ms"]
    c_vram = candidate_res["latency_and_vram"]["peak_vram_mb"]

    # Gate 1: Performance (mAP50-95 increase OR small object recall boost >= 15% without significant mAP drop)
    gate_perf = (c_map > b_map) or (c_small_rec >= b_small_rec + 0.15 and c_map >= b_map - 0.015)

    # Gate 2: Hard Negative FPR must not increase
    gate_fpr = (c_fpr <= b_fpr)

    # Gate 3: Latency within budget (< 120ms)
    gate_lat = (c_lat_p95 <= 120.0)

    # Gate 4: VRAM within budget (< 4500MB)
    gate_vram = (c_vram <= 4500.0)

    all_passed = gate_perf and gate_fpr and gate_lat and gate_vram

    gates_status = {
        "gate_1_performance": {
            "passed": bool(gate_perf),
            "baseline_mAP50_95": b_map,
            "candidate_mAP50_95": c_map,
            "baseline_small_recall": b_small_rec,
            "candidate_small_recall": c_small_rec,
            "baseline_micro_recall": b_micro_rec,
            "candidate_micro_recall": c_micro_rec
        },
        "gate_2_hard_negative_suppression": {
            "passed": bool(gate_fpr),
            "baseline_fpr": b_fpr,
            "candidate_fpr": c_fpr
        },
        "gate_3_latency": {
            "passed": bool(gate_lat),
            "candidate_latency_p95_ms": c_lat_p95,
            "max_allowed_ms": 120.0
        },
        "gate_4_vram_budget": {
            "passed": bool(gate_vram),
            "candidate_peak_vram_mb": c_vram,
            "max_allowed_mb": 4500.0
        },
        "verdict": "PROMOTE_TO_PRODUCTION" if all_passed else "REJECT_MAINTAIN_BASELINE"
    }

    return gates_status, all_passed

def promote_model_atomic(candidate_weights, candidate_name, metrics):
    os.makedirs(PRODUCTION_DIR, exist_ok=True)
    prod_weight_name = f"{candidate_name}_prod.pt"
    prod_weight_path = os.path.join(PRODUCTION_DIR, prod_weight_name)
    shutil.copy(candidate_weights, prod_weight_path)

    # Update model_registry.json with rollback history
    with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
        reg = json.load(f)

    # Preserve previous production model as rollback target
    old_core = reg["models"].get("core_detector", {})
    reg["models"]["previous_core_detector_rollback"] = old_core

    # Update core_detector
    reg["models"]["core_detector"] = {
        "name": candidate_name,
        "version": "phase11_v1.0",
        "weights": f"models/production/{prod_weight_name}",
        "classes": 180,
        "task": "detect",
        "device": "auto",
        "pinned": True,
        "status": "production",
        "promoted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "mAP50": metrics["metrics"]["mAP50"],
        "mAP50_95": metrics["metrics"]["mAP50_95"],
        "precision": metrics["metrics"]["precision"],
        "recall": metrics["metrics"]["recall"],
        "f1_score": metrics["metrics"]["f1_score"],
        "hard_negative_fpr": metrics["hard_negatives"]["false_positive_rate"]
    }
    reg["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")

    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(reg, f, indent=2)

    print(f"\nSUCCESS: Promoted {candidate_name} to production!")
    print(f"Production path: {prod_weight_path}")
    print(f"Model registry updated with automatic rollback target preserved.")

def main():
    candidate_weights = sys.argv[1] if len(sys.argv) > 1 else "models/candidates/yolo11n_finegrained_v1.pt"
    candidate_name = sys.argv[2] if len(sys.argv) > 2 else "yolo11n_finegrained_v1"

    baseline_report_path = os.path.join(REPORTS_DIR, "phase11_baseline_report.json")
    if not os.path.exists(baseline_report_path):
        print("Running baseline evaluation...")
        baseline_res = run_evaluation("ai-service/models/yolo11n.pt")
        with open(baseline_report_path, "w", encoding="utf-8") as f:
            json.dump(baseline_res, f, indent=2)
    else:
        with open(baseline_report_path, "r", encoding="utf-8") as f:
            baseline_res = json.load(f)

    print(f"\n==========================================")
    print(f"RUNNING FROZEN BENCHMARK ON CANDIDATE: {candidate_name}")
    print(f"==========================================")
    candidate_res = run_evaluation(candidate_weights)

    # Evaluate promotion gates
    gates, promote = check_promotion_gates(baseline_res, candidate_res)

    # Generate failure visualizations
    print("\nGenerating failure analysis artifacts...")
    failures = generate_failure_visualizations(candidate_weights, candidate_name)

    comparison_report = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "baseline": {
            "model": baseline_res["model_path"],
            "mAP50": baseline_res["metrics"]["mAP50"],
            "mAP50_95": baseline_res["metrics"]["mAP50_95"],
            "precision": baseline_res["metrics"]["precision"],
            "recall": baseline_res["metrics"]["recall"],
            "f1_score": baseline_res["metrics"]["f1_score"],
            "micro_recall": baseline_res["scale_breakdown"]["micro_objects"]["recall"],
            "small_recall": baseline_res["scale_breakdown"]["small_objects"]["recall"],
            "hard_neg_fpr": baseline_res["hard_negatives"]["false_positive_rate"],
            "latency_p95_ms": baseline_res["latency_and_vram"]["latency_p95_ms"]
        },
        "candidate": {
            "model": candidate_weights,
            "mAP50": candidate_res["metrics"]["mAP50"],
            "mAP50_95": candidate_res["metrics"]["mAP50_95"],
            "precision": candidate_res["metrics"]["precision"],
            "recall": candidate_res["metrics"]["recall"],
            "f1_score": candidate_res["metrics"]["f1_score"],
            "micro_recall": candidate_res["scale_breakdown"]["micro_objects"]["recall"],
            "small_recall": candidate_res["scale_breakdown"]["small_objects"]["recall"],
            "hard_neg_fpr": candidate_res["hard_negatives"]["false_positive_rate"],
            "latency_p95_ms": candidate_res["latency_and_vram"]["latency_p95_ms"]
        },
        "gates": gates,
        "failures_count": len(failures)
    }

    comp_path = os.path.join(REPORTS_DIR, "phase11_benchmark_comparison.json")
    with open(comp_path, "w", encoding="utf-8") as f:
        json.dump(comparison_report, f, indent=2)

    print(f"\n==========================================")
    print(f"PROMOTION VERDICT: {gates['verdict']}")
    print(f"==========================================")
    print(f"Gate 1 (Performance):        {'PASS' if gates['gate_1_performance']['passed'] else 'FAIL'} (mAP50-95: {baseline_res['metrics']['mAP50_95']} -> {candidate_res['metrics']['mAP50_95']}, Small Recall: {baseline_res['scale_breakdown']['small_objects']['recall']} -> {candidate_res['scale_breakdown']['small_objects']['recall']})")
    print(f"Gate 2 (Hard-Neg FPR):       {'PASS' if gates['gate_2_hard_negative_suppression']['passed'] else 'FAIL'} (FPR: {baseline_res['hard_negatives']['false_positive_rate']*100:.1f}% -> {candidate_res['hard_negatives']['false_positive_rate']*100:.1f}%)")
    print(f"Gate 3 (Latency Budget):     {'PASS' if gates['gate_3_latency']['passed'] else 'FAIL'} ({candidate_res['latency_and_vram']['latency_p95_ms']}ms <= 120ms)")
    print(f"Gate 4 (VRAM Budget):        {'PASS' if gates['gate_4_vram_budget']['passed'] else 'FAIL'} ({candidate_res['latency_and_vram']['peak_vram_mb']}MB <= 4500MB)")

    if promote:
        promote_model_atomic(candidate_weights, candidate_name, candidate_res)
    else:
        print(f"\nCandidate {candidate_name} did not pass all promotion gates. Baseline preserved.")

if __name__ == "__main__":
    main()
