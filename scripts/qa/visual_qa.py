"""
Visual QA Engine: scripts/qa/visual_qa.py
Renders bounding box overlays with class names onto images and generates contact sheets
in datasets/qa/contact_sheets/ for human visual QA inspection.
"""

import os
import glob
import random
import cv2
import numpy as np
import yaml

ONTOLOGY_PATH = os.path.abspath("datasets/class_ontology.yaml")
QA_DIR = os.path.abspath("datasets/qa/contact_sheets")

def load_ontology():
    with open(ONTOLOGY_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return {c["id"]: c["name"] for c in data["classes"]}

def draw_annotations(img, label_path, id_to_name):
    annotated = img.copy()
    h, w = annotated.shape[:2]
    if not os.path.exists(label_path):
        return annotated

    with open(label_path, "r", encoding="utf-8") as f:
        lines = [l.strip() for l in f if l.strip()]

    if len(lines) == 0:
        # Hard negative indicator
        cv2.putText(annotated, "HARD NEGATIVE (0 BOXES)", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        return annotated

    colors = [
        (0, 255, 0), (255, 0, 0), (0, 0, 255), (255, 255, 0),
        (0, 255, 255), (255, 0, 255), (0, 165, 255), (128, 0, 128)
    ]

    for line in lines:
        parts = line.split()
        if len(parts) != 5:
            continue
        cid, xc, yc, bw, bh = int(parts[0]), float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])
        xmin = int((xc - bw / 2.0) * w)
        xmax = int((xc + bw / 2.0) * w)
        ymin = int((yc - bh / 2.0) * h)
        ymax = int((yc + bh / 2.0) * h)

        cname = id_to_name.get(cid, f"cls_{cid}")
        color = colors[cid % len(colors)]

        cv2.rectangle(annotated, (xmin, ymin), (xmax, ymax), color, 2)
        # Label banner
        label_text = f"{cname}"
        t_size = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)[0]
        cv2.rectangle(annotated, (xmin, max(0, ymin - 16)), (xmin + t_size[0] + 4, ymin), color, -1)
        cv2.putText(annotated, label_text, (xmin + 2, max(12, ymin - 3)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1)

    return annotated

def create_contact_sheet(image_paths, label_paths, id_to_name, output_path, grid_rows=3, grid_cols=3, cell_size=(320, 320)):
    cw, ch = cell_size
    sheet = np.full((ch * grid_rows, cw * grid_cols, 3), (40, 40, 40), dtype=np.uint8)

    for idx in range(min(len(image_paths), grid_rows * grid_cols)):
        ipath = image_paths[idx]
        lpath = label_paths[idx]
        img = cv2.imread(ipath)
        if img is None:
            continue
        ann_img = draw_annotations(img, lpath, id_to_name)
        resized = cv2.resize(ann_img, cell_size, interpolation=cv2.INTER_AREA)

        r = idx // grid_cols
        c = idx % grid_cols
        sheet[r * ch : (r + 1) * ch, c * cw : (c + 1) * cw] = resized

    cv2.imwrite(output_path, sheet)
    print(f"Generated contact sheet: {output_path}")

def main():
    os.makedirs(QA_DIR, exist_ok=True)
    id_to_name = load_ontology()

    # Sample from interim dataset
    interim_imgs = sorted(glob.glob("datasets/interim/images/*.jpg"))
    interim_lbls = [os.path.join("datasets/interim/labels", os.path.splitext(os.path.basename(p))[0] + ".txt") for p in interim_imgs]

    # Contact sheet 1: Sample training/interim
    sample_indices = random.sample(range(len(interim_imgs)), min(9, len(interim_imgs)))
    s_imgs = [interim_imgs[i] for i in sample_indices]
    s_lbls = [interim_lbls[i] for i in sample_indices]
    create_contact_sheet(s_imgs, s_lbls, id_to_name, os.path.join(QA_DIR, "contact_sheet_interim_sample.jpg"))

    # Contact sheet 2: Frozen benchmark suite
    bm_imgs = sorted(glob.glob("datasets/benchmarks/phase11_v1/images/*.jpg"))
    bm_lbls = [os.path.join("datasets/benchmarks/phase11_v1/labels", os.path.splitext(os.path.basename(p))[0] + ".txt") for p in bm_imgs]
    create_contact_sheet(bm_imgs[:9], bm_lbls[:9], id_to_name, os.path.join(QA_DIR, "contact_sheet_benchmark_01.jpg"))
    if len(bm_imgs) > 9:
        create_contact_sheet(bm_imgs[9:18], bm_lbls[9:18], id_to_name, os.path.join(QA_DIR, "contact_sheet_benchmark_02.jpg"))

if __name__ == "__main__":
    main()
