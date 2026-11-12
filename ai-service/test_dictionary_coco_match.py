"""
Phase 2 Cross-Service Verification:
Validates that frontend/src/data/cocoDictionary.ts perfectly matches the real YOLO11m best.pt model.
"""

import os
import sys
import re
import json
from ultralytics import YOLO

def main():
    print("=" * 70)
    print("   CROSS-SERVICE VERIFICATION: YOLO11m best.pt vs COCO Dictionary")
    print("=" * 70)

    # 1. Load actual best.pt
    model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "models", "best.pt"))
    print(f"Loading YOLO model from: {model_path}")
    model = YOLO(model_path)
    model_names = model.names
    print(f"Loaded model successfully. Found {len(model_names)} classes.")

    # 2. Parse frontend cocoDictionary.ts
    dict_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "src", "data", "cocoDictionary.ts"))
    print(f"Reading dictionary from: {dict_path}")
    with open(dict_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Regex to extract each classId and label
    pattern = re.compile(
        r"classId:\s*(\d+),\s*label:\s*'([^']+)',\s*word:\s*'([^']+)',\s*ipa:\s*'([^']+)',\s*vietnamese:\s*'([^']+)',\s*partOfSpeech:\s*'([^']+)',\s*exampleEn:\s*'([^']+)',\s*exampleVi:\s*'([^']+)'",
        re.DOTALL
    )
    matches = pattern.findall(content)
    print(f"Parsed {len(matches)} vocabulary entries from cocoDictionary.ts")

    assert len(matches) == 80, f"Expected 80 items in dictionary, found {len(matches)}"

    # 3. Compare 1-by-1
    mismatches = []
    for idx_str, label, word, ipa, vn, pos, ex_en, ex_vi in matches:
        cid = int(idx_str)
        model_label = model_names.get(cid)
        if model_label != label:
            mismatches.append(f"ClassId {cid}: Model has '{model_label}', Dictionary has '{label}'")

    if mismatches:
        print("[FAIL] Mismatches detected:")
        for m in mismatches:
            print(f"  - {m}")
        sys.exit(1)

    print("[PASS] 100% of the 80 classes match best.pt exactly (classId 0..79).")
    print(f"Sample entries:")
    for sample_id in [0, 9, 32, 58, 67, 78, 79]:
        item = matches[sample_id]
        print(f"  [{item[0]}] {item[1]:<15} -> Word: '{item[2]}' | IPA: {item[3]:<18} | VN: '{item[4]}'")

    print("=" * 70)
    print("[SUCCESS] CROSS-SERVICE VERIFICATION PASSED 80/80 CLASSES!")
    print("=" * 70)

if __name__ == "__main__":
    main()
