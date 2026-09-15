import os
import shutil
import hashlib
import random
import logging
from typing import Dict, List, Any, Tuple
from PIL import Image

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("dataset_builder")

class DatasetBuilder:
    """
    Automated Dataset Builder & Quality Inspector for YOLO Multimodal Vision.
    - Validates bounding boxes (normalized 0-1 range).
    - Detects duplicate images via SHA-256 hash.
    - Analyzes class distribution and reports imbalances.
    - Generates 70/20/10 train/val/test splits.
    - Supports negative sample management to curb false positives.
    """
    def __init__(self, dataset_dir: str):
        self.dataset_dir = os.path.abspath(dataset_dir)
        self.classes: List[str] = []
        self._load_classes()

    def _load_classes(self):
        yaml_path = os.path.join(self.dataset_dir, "data.yaml")
        if os.path.exists(yaml_path):
            import yaml
            with open(yaml_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
                names = data.get("names", {})
                if isinstance(names, dict):
                    self.classes = [names[k] for k in sorted(names.keys())]
                elif isinstance(names, list):
                    self.classes = names

    def validate_labels(self, labels_dir: str) -> Dict[str, Any]:
        """
        Validates all .txt label files in a directory.
        Checks:
        - Class ID within range
        - Coordinates in [0.0, 1.0]
        - Box width/height > 0
        """
        report = {
            "total_files": 0,
            "valid_files": 0,
            "corrupted_files": [],
            "out_of_bounds": 0,
            "empty_files": 0,
            "class_counts": {c: 0 for c in self.classes}
        }

        if not os.path.exists(labels_dir):
            return report

        for fname in os.listdir(labels_dir):
            if not fname.endswith(".txt"):
                continue
            report["total_files"] += 1
            fpath = os.path.join(labels_dir, fname)

            with open(fpath, "r", encoding="utf-8") as f:
                lines = [l.strip() for l in f.readlines() if l.strip()]

            if not lines:
                report["empty_files"] += 1
                continue

            file_valid = True
            for l_idx, line in enumerate(lines):
                parts = line.split()
                if len(parts) != 5:
                    report["corrupted_files"].append(f"{fname}:L{l_idx+1}")
                    file_valid = False
                    continue

                try:
                    cls_id = int(parts[0])
                    cx, cy, w, h = [float(x) for x in parts[1:]]
                except ValueError:
                    report["corrupted_files"].append(f"{fname}:L{l_idx+1}")
                    file_valid = False
                    continue

                if not (0.0 <= cx <= 1.0 and 0.0 <= cy <= 1.0 and 0.0 < w <= 1.0 and 0.0 < h <= 1.0):
                    report["out_of_bounds"] += 1
                    file_valid = False

                if 0 <= cls_id < len(self.classes):
                    cls_name = self.classes[cls_id]
                    report["class_counts"][cls_name] = report["class_counts"].get(cls_name, 0) + 1

            if file_valid:
                report["valid_files"] += 1

        return report

    def find_duplicates(self, images_dir: str) -> List[Tuple[str, str]]:
        """Finds duplicate images using SHA-256 hash."""
        hashes: Dict[str, str] = {}
        duplicates: List[Tuple[str, str]] = []

        if not os.path.exists(images_dir):
            return duplicates

        for fname in os.listdir(images_dir):
            if not fname.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                continue
            fpath = os.path.join(images_dir, fname)
            with open(fpath, "rb") as f:
                h = hashlib.sha256(f.read()).hexdigest()
            if h in hashes:
                duplicates.append((hashes[h], fname))
            else:
                hashes[h] = fname

        return duplicates

    def split_dataset(
        self,
        source_img_dir: str,
        source_lbl_dir: str,
        train_ratio: float = 0.70,
        val_ratio: float = 0.20
    ):
        """Splits raw images and labels into train/val/test folders."""
        images = [f for f in os.listdir(source_img_dir) if f.lower().endswith((".jpg", ".png", ".jpeg"))]
        random.seed(42)
        random.shuffle(images)

        n_total = len(images)
        n_train = int(n_total * train_ratio)
        n_val = int(n_total * val_ratio)

        splits = {
            "train": images[:n_train],
            "val": images[n_train:n_train + n_val],
            "test": images[n_train + n_val:]
        }

        for split_name, img_list in splits.items():
            split_img_dir = os.path.join(self.dataset_dir, "images", split_name)
            split_lbl_dir = os.path.join(self.dataset_dir, "labels", split_name)
            os.makedirs(split_img_dir, exist_ok=True)
            os.makedirs(split_lbl_dir, exist_ok=True)

            for img_name in img_list:
                shutil.copy2(os.path.join(source_img_dir, img_name), os.path.join(split_img_dir, img_name))
                lbl_name = os.path.splitext(img_name)[0] + ".txt"
                lbl_path = os.path.join(source_lbl_dir, lbl_name)
                if os.path.exists(lbl_path):
                    shutil.copy2(lbl_path, os.path.join(split_lbl_dir, lbl_name))
                else:
                    # Negative sample: create empty label file!
                    open(os.path.join(split_lbl_dir, lbl_name), "w").close()

        logger.info(f"Split completed: train={len(splits['train'])}, val={len(splits['val'])}, test={len(splits['test'])}")

if __name__ == "__main__":
    builder = DatasetBuilder("datasets/accessory_dataset_v1")
    logger.info(f"Loaded {len(builder.classes)} classes from data.yaml")
