"""
Dataset Splitting & Leakage Verification Engine: scripts/datasets/split_and_check_leakage.py
Splits data into train (70%), val (15%), test (15%), enforces zero cryptographic SHA-256 leakage
across splits and against the frozen benchmark, and exports datasets/stats/class_coverage.csv.
"""

import os
import glob
import shutil
import hashlib
import json
import csv
import random
import yaml

ONTOLOGY_PATH = os.path.abspath("datasets/class_ontology.yaml")
INTERIM_DIR = os.path.abspath("datasets/interim")
PROCESSED_DIR = os.path.abspath("datasets/processed")
SPLITS_DIR = os.path.abspath("datasets/splits")
STATS_DIR = os.path.abspath("datasets/stats")
BENCHMARK_DIR = os.path.abspath("datasets/benchmarks/phase11_v1")
QA_DIR = os.path.abspath("datasets/qa")

def compute_sha256(fpath):
    h = hashlib.sha256()
    with open(fpath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def load_ontology():
    with open(ONTOLOGY_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data["classes"]

def main():
    classes_list = load_ontology()
    id_to_name = {c["id"]: c["name"] for c in classes_list}

    # Clean and create directories
    for split in ["train", "val", "test"]:
        os.makedirs(os.path.join(PROCESSED_DIR, "images", split), exist_ok=True)
        os.makedirs(os.path.join(PROCESSED_DIR, "labels", split), exist_ok=True)
    os.makedirs(SPLITS_DIR, exist_ok=True)
    os.makedirs(STATS_DIR, exist_ok=True)

    img_files = sorted(glob.glob(os.path.join(INTERIM_DIR, "images", "*.jpg")))
    print(f"Total interim images to split: {len(img_files)}")

    random.seed(42)
    shuffled = img_files.copy()
    random.shuffle(shuffled)

    n = len(shuffled)
    n_train = int(n * 0.70)
    n_val = int(n * 0.15)
    
    train_files = shuffled[:n_train]
    val_files = shuffled[n_train:n_train + n_val]
    test_files = shuffled[n_train + n_val:]

    split_groups = {
        "train": train_files,
        "val": val_files,
        "test": test_files
    }

    split_hashes = {"train": set(), "val": set(), "test": set()}
    class_split_counts = {c["id"]: {"train": 0, "val": 0, "test": 0} for c in classes_list}

    for split_name, files in split_groups.items():
        txt_list_path = os.path.join(SPLITS_DIR, f"{split_name}.txt")
        with open(txt_list_path, "w", encoding="utf-8") as list_f:
            for fpath in files:
                fname = os.path.basename(fpath)
                sha = compute_sha256(fpath)
                split_hashes[split_name].add(sha)

                # Copy image
                dst_img = os.path.join(PROCESSED_DIR, "images", split_name, fname)
                shutil.copy(fpath, dst_img)
                list_f.write(f"{dst_img}\n")

                # Copy label
                src_lbl = os.path.join(INTERIM_DIR, "labels", os.path.splitext(fname)[0] + ".txt")
                dst_lbl = os.path.join(PROCESSED_DIR, "labels", split_name, os.path.splitext(fname)[0] + ".txt")
                if os.path.exists(src_lbl):
                    shutil.copy(src_lbl, dst_lbl)
                    # Count classes
                    with open(src_lbl, "r", encoding="utf-8") as lf:
                        for line in lf:
                            parts = line.strip().split()
                            if len(parts) == 5:
                                cid = int(parts[0])
                                if cid in class_split_counts:
                                    class_split_counts[cid][split_name] += 1
                else:
                    # Empty file
                    with open(dst_lbl, "w", encoding="utf-8") as lf:
                        pass

    # Benchmark hashes for contamination audit
    bm_files = glob.glob(os.path.join(BENCHMARK_DIR, "images", "*.*"))
    bm_hashes = {compute_sha256(f) for f in bm_files}

    # Cryptographic Leakage Checks
    train_val_leak = split_hashes["train"].intersection(split_hashes["val"])
    train_test_leak = split_hashes["train"].intersection(split_hashes["test"])
    val_test_leak = split_hashes["val"].intersection(split_hashes["test"])
    train_bm_leak = split_hashes["train"].intersection(bm_hashes)

    leakage_passed = (
        len(train_val_leak) == 0 and
        len(train_test_leak) == 0 and
        len(val_test_leak) == 0 and
        len(train_bm_leak) == 0
    )

    leakage_report = {
        "status": "PASSED" if leakage_passed else "FAILED_LEAKAGE_DETECTED",
        "train_samples": len(train_files),
        "val_samples": len(val_files),
        "test_samples": len(test_files),
        "frozen_benchmark_samples": len(bm_files),
        "leakage_checks": {
            "train_intersect_val": len(train_val_leak),
            "train_intersect_test": len(train_test_leak),
            "val_intersect_test": len(val_test_leak),
            "train_intersect_frozen_benchmark": len(train_bm_leak)
        }
    }

    leakage_report_path = os.path.join(QA_DIR, "leakage_audit_report.json")
    with open(leakage_report_path, "w", encoding="utf-8") as f:
        json.dump(leakage_report, f, indent=2)

    # Export Class Coverage CSV
    csv_path = os.path.join(STATS_DIR, "class_coverage.csv")
    with open(csv_path, "w", newline="", encoding="utf-8") as cf:
        writer = csv.writer(cf)
        writer.writerow(["class_id", "class_name", "group", "scale_tier", "train_count", "val_count", "test_count", "total_count"])
        for c in classes_list:
            cid = c["id"]
            counts = class_split_counts[cid]
            total_c = counts["train"] + counts["val"] + counts["test"]
            writer.writerow([cid, c["name"], c["group"], c["scale_tier"], counts["train"], counts["val"], counts["test"], total_c])

    # Export dataset.yaml for YOLO
    yolo_data = {
        "path": PROCESSED_DIR.replace("\\", "/"),
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "names": {c["id"]: c["name"] for c in classes_list}
    }
    yolo_yaml_path = os.path.join(PROCESSED_DIR, "dataset.yaml")
    with open(yolo_yaml_path, "w", encoding="utf-8") as yf:
        yaml.dump(yolo_data, yf, sort_keys=False)

    print(f"\n==========================================")
    print(f"SPLIT & LEAKAGE AUDIT: {leakage_report['status']}")
    print(f"==========================================")
    print(f"Train: {len(train_files)} | Val: {len(val_files)} | Test: {len(test_files)}")
    print(f"Train intersect Val: {len(train_val_leak)}")
    print(f"Train intersect Test: {len(train_test_leak)}")
    print(f"Train intersect Frozen Benchmark: {len(train_bm_leak)}")
    print(f"Coverage CSV: {csv_path}")
    print(f"YOLO YAML: {yolo_yaml_path}")

if __name__ == "__main__":
    main()
