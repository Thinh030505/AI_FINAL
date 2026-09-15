"""
Dataset Manifest Builder: scripts/datasets/build_manifests.py
Computes cryptographic SHA-256 hashes, provenance records, and image dimensions
for all interim and processed images into datasets/manifests/dataset_manifest.json.
"""

import os
import glob
import hashlib
import json
import cv2

INTERIM_DIR = os.path.abspath("datasets/interim")
MANIFEST_OUT = os.path.abspath("datasets/manifests/dataset_manifest.json")

def compute_sha256(file_path: str) -> str:
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def main():
    os.makedirs(os.path.dirname(MANIFEST_OUT), exist_ok=True)
    img_patterns = [
        os.path.join(INTERIM_DIR, "images", "*.jpg"),
        os.path.join(INTERIM_DIR, "images", "*.png"),
        os.path.join("datasets/benchmarks/phase11_v1/images", "*.jpg"),
        os.path.join("datasets/benchmarks/phase11_v1/images", "*.png")
    ]

    all_files = []
    for pat in img_patterns:
        all_files.extend(glob.glob(pat))

    print(f"Indexing {len(all_files)} images for provenance manifest...")
    manifest_entries = []

    for fpath in all_files:
        sha256 = compute_sha256(fpath)
        img = cv2.imread(fpath)
        h, w, c = img.shape if img is not None else (0, 0, 0)
        fname = os.path.basename(fpath)

        # Check label file
        is_benchmark = "benchmarks" in fpath
        if is_benchmark:
            lbl_file = os.path.join("datasets/benchmarks/phase11_v1/labels", os.path.splitext(fname)[0] + ".txt")
            source = "Phase11_Frozen_Benchmark"
            license_tag = "Internal_Frozen_Test"
        else:
            lbl_file = os.path.join(INTERIM_DIR, "labels", os.path.splitext(fname)[0] + ".txt")
            source = "Synthetic_FineGrained_Engine"
            license_tag = "CC BY 4.0 / Synthetic"

        box_count = 0
        if os.path.exists(lbl_file):
            with open(lbl_file, "r", encoding="utf-8") as lf:
                box_count = len([line for line in lf if line.strip()])

        manifest_entries.append({
            "image_id": os.path.splitext(fname)[0],
            "filename": fname,
            "storage_path": os.path.relpath(fpath).replace("\\", "/"),
            "sha256": sha256,
            "width": w,
            "height": h,
            "channels": c,
            "source_dataset": source,
            "license": license_tag,
            "annotation_count": box_count,
            "is_hard_negative": (box_count == 0)
        })

    manifest = {
        "version": "1.0.0",
        "total_images": len(manifest_entries),
        "total_boxes": sum(e["annotation_count"] for e in manifest_entries),
        "hard_negatives": sum(1 for e in manifest_entries if e["is_hard_negative"]),
        "entries": manifest_entries
    }

    with open(MANIFEST_OUT, "w", encoding="utf-8") as mf:
        json.dump(manifest, mf, indent=2)

    print(f"Manifest saved to: {MANIFEST_OUT}")
    print(f"Total entries: {len(manifest_entries)} | Boxes: {manifest['total_boxes']} | Hard Negs: {manifest['hard_negatives']}")

if __name__ == "__main__":
    main()
