"""
Dataset Deduplication Engine: scripts/datasets/deduplicate_dataset.py
Performs exact cryptographic SHA-256 matching and perceptual dHash (difference hash)
Hamming distance analysis to ensure no near-identical duplicates contaminate the dataset.
"""

import os
import glob
import hashlib
import json
import cv2
import numpy as np

QA_DIR = os.path.abspath("datasets/qa")
REPORT_OUT = os.path.join(QA_DIR, "deduplication_report.json")

def compute_dhash(image, hash_size=8):
    """
    Computes perceptual difference hash (dHash).
    Resizes image to (hash_size + 1, hash_size), converts to grayscale,
    and compares adjacent pixels.
    """
    resized = cv2.resize(image, (hash_size + 1, hash_size), interpolation=cv2.INTER_AREA)
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY) if len(resized.shape) == 3 else resized
    # Compute horizontal gradient
    diff = gray[:, 1:] > gray[:, :-1]
    return diff.flatten()

def hamming_distance(hash1, hash2):
    return int(np.count_nonzero(hash1 != hash2))

def main():
    os.makedirs(QA_DIR, exist_ok=True)
    images_dir = os.path.abspath("datasets/interim/images")
    img_files = sorted(glob.glob(os.path.join(images_dir, "*.jpg")))

    print(f"Scanning {len(img_files)} images for exact and perceptual duplicates...")

    sha_map = {}
    dhashes = []
    fnames = []

    exact_duplicates = []

    for fpath in img_files:
        fname = os.path.basename(fpath)
        with open(fpath, "rb") as f:
            h = hashlib.sha256(f.read()).hexdigest()

        if h in sha_map:
            exact_duplicates.append({"original": sha_map[h], "duplicate": fname, "sha256": h})
        else:
            sha_map[h] = fname

        img = cv2.imread(fpath)
        if img is not None:
            dh = compute_dhash(img)
            dhashes.append(dh)
            fnames.append(fname)

    # Compute perceptual near-duplicates (Hamming distance <= 3)
    near_duplicates = []
    n = len(fnames)
    for i in range(n):
        for j in range(i + 1, n):
            dist = hamming_distance(dhashes[i], dhashes[j])
            if dist <= 3:
                near_duplicates.append({
                    "file_a": fnames[i],
                    "file_b": fnames[j],
                    "hamming_distance": dist
                })

    report = {
        "total_scanned": len(img_files),
        "exact_duplicates_count": len(exact_duplicates),
        "exact_duplicates": exact_duplicates,
        "near_duplicates_count": len(near_duplicates),
        "near_duplicates": near_duplicates,
        "status": "PASSED" if len(exact_duplicates) == 0 and len(near_duplicates) == 0 else "WARNING"
    }

    with open(REPORT_OUT, "w", encoding="utf-8") as rf:
        json.dump(report, rf, indent=2)

    print(f"Deduplication complete. Report saved to: {REPORT_OUT}")
    print(f"Exact duplicates: {len(exact_duplicates)} | Near duplicates (Hamming <= 3): {len(near_duplicates)}")

if __name__ == "__main__":
    main()
