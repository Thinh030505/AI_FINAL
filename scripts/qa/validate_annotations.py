"""
Annotation Validation Engine: scripts/qa/validate_annotations.py
Strictly validates YOLO-formatted labels:
- class_id within ontology range [0, total_classes-1]
- normalized coordinates [0.0, 1.0]
- non-degenerate bounding boxes (w > 0, h > 0)
- boundary constraints (xmin >= 0, xmax <= 1, ymin >= 0, ymax <= 1)
- reports degenerate or corrupt boxes into datasets/qa/annotation_validation_report.json.
"""

import os
import glob
import json
import yaml

ONTOLOGY_PATH = os.path.abspath("datasets/class_ontology.yaml")
QA_DIR = os.path.abspath("datasets/qa")
REPORT_OUT = os.path.join(QA_DIR, "annotation_validation_report.json")

def load_ontology_range():
    with open(ONTOLOGY_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return len(data["classes"])

def validate_labels(labels_dirs):
    total_classes = load_ontology_range()
    
    all_label_files = []
    for d in labels_dirs:
        all_label_files.extend(glob.glob(os.path.join(d, "*.txt")))

    print(f"Validating {len(all_label_files)} label files across {labels_dirs}...")

    total_boxes = 0
    valid_boxes = 0
    invalid_boxes = []
    empty_label_files = []

    for lpath in all_label_files:
        fname = os.path.basename(lpath)
        with open(lpath, "r", encoding="utf-8") as lf:
            lines = [line.strip() for line in lf if line.strip()]

        if len(lines) == 0:
            empty_label_files.append(fname)
            continue

        for l_idx, line in enumerate(lines):
            total_boxes += 1
            parts = line.split()
            if len(parts) != 5:
                invalid_boxes.append({
                    "file": fname,
                    "line": l_idx + 1,
                    "content": line,
                    "error": f"Expected 5 tokens, got {len(parts)}"
                })
                continue

            try:
                cls_id = int(parts[0])
                xc = float(parts[1])
                yc = float(parts[2])
                w = float(parts[3])
                h = float(parts[4])
            except ValueError as e:
                invalid_boxes.append({
                    "file": fname,
                    "line": l_idx + 1,
                    "content": line,
                    "error": f"Parse error: {e}"
                })
                continue

            # Check class range
            if cls_id < 0 or cls_id >= total_classes:
                invalid_boxes.append({
                    "file": fname,
                    "line": l_idx + 1,
                    "content": line,
                    "error": f"Class ID {cls_id} out of range [0, {total_classes-1}]"
                })
                continue

            # Check coordinates [0, 1]
            if not (0.0 <= xc <= 1.0 and 0.0 <= yc <= 1.0 and 0.0 < w <= 1.0 and 0.0 < h <= 1.0):
                invalid_boxes.append({
                    "file": fname,
                    "line": l_idx + 1,
                    "content": line,
                    "error": f"Coordinates out of bounds or degenerate: xc={xc}, yc={yc}, w={w}, h={h}"
                })
                continue

            # Check edge bounds (with tolerance for rounding)
            xmin = xc - w / 2.0
            xmax = xc + w / 2.0
            ymin = yc - h / 2.0
            ymax = yc + h / 2.0
            eps = 0.01
            if xmin < -eps or xmax > 1.0 + eps or ymin < -eps or ymax > 1.0 + eps:
                invalid_boxes.append({
                    "file": fname,
                    "line": l_idx + 1,
                    "content": line,
                    "error": f"Box exceeds image boundaries: xmin={xmin:.4f}, xmax={xmax:.4f}, ymin={ymin:.4f}, ymax={ymax:.4f}"
                })
                continue

            valid_boxes += 1

    report = {
        "status": "PASSED" if len(invalid_boxes) == 0 else "FAILED",
        "total_files_checked": len(all_label_files),
        "empty_files_count": len(empty_label_files),
        "empty_files": empty_label_files,
        "total_boxes": total_boxes,
        "valid_boxes": valid_boxes,
        "invalid_boxes_count": len(invalid_boxes),
        "invalid_boxes": invalid_boxes
    }

    os.makedirs(QA_DIR, exist_ok=True)
    with open(REPORT_OUT, "w", encoding="utf-8") as rf:
        json.dump(report, rf, indent=2)

    print(f"Annotation validation completed: {report['status']}")
    print(f"Valid boxes: {valid_boxes}/{total_boxes} | Invalid boxes: {len(invalid_boxes)} | Empty/Negative files: {len(empty_label_files)}")
    print(f"Report saved to: {REPORT_OUT}")

if __name__ == "__main__":
    dirs_to_check = [
        os.path.abspath("datasets/interim/labels"),
        os.path.abspath("datasets/benchmarks/phase11_v1/labels")
    ]
    validate_labels(dirs_to_check)
