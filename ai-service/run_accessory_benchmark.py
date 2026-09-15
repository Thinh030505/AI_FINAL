import os
import sys
import time
import json
import asyncio
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("benchmark")

from app.models.image_analysis_model import ImageAnalysisRequest
from app.api.image_analysis_router import perform_image_analysis

BENCHMARK_IMAGES = [
    ("person_glasses.jpg", ["glasses"]),
    ("person_airpods.jpg", ["airpods"]),
    ("person_necklace.jpg", ["necklace"]),
    ("person_watch.jpg", ["watch"]),
    ("person_bracelet.jpg", ["bracelet"]),
    ("person_ring.jpg", ["ring"]),
    ("person_phone.jpg", ["cell phone", "phone"]),
    ("person_multi_accessories.jpg", ["glasses", "airpods", "necklace", "watch", "ring", "phone"]),
    ("person_far.jpg", ["person"]),
    ("person_low_light.jpg", ["person"]),
    ("person_occluded.jpg", ["person"]),
    ("multiple_people.jpg", ["person", "glasses"]),
]

async def run_suite(mode: str = "everything"):
    benchmark_dir = os.path.abspath("../test-images/accessories")
    logger.info(f"=== Running Deep Multimodal Benchmark Suite (Mode: {mode.upper()}) ===")
    
    results = []
    total_expected = 0
    total_detected = 0

    for fname, expected_classes in BENCHMARK_IMAGES:
        img_path = os.path.join(benchmark_dir, fname)
        if not os.path.exists(img_path):
            logger.warning(f"File not found: {img_path}")
            continue

        req = ImageAnalysisRequest(imageUrl=img_path, mode=mode, forceOcr=False)
        t0 = time.perf_counter()
        try:
            resp = await perform_image_analysis(req)
            elapsed = round((time.perf_counter() - t0) * 1000, 2)
            data = resp.data

            # Extract detected accessory labels
            detected_accs = [a.get("label", "").lower() for a in data.smallObjects]
            people_cnt = len(data.people)
            objs_cnt = len(data.objectDetection.get("detections", []))
            rel_cnt = len(data.relationships)

            # Check expected recall
            matched_classes = []
            for exp in expected_classes:
                if any(exp in det or det in exp for det in detected_accs) or any(exp in o.get("label", "").lower() for o in data.objectDetection.get("detections", [])):
                    matched_classes.append(exp)

            recall = round(len(matched_classes) / float(max(1, len(expected_classes))), 2)
            total_expected += len(expected_classes)
            total_detected += len(matched_classes)

            rec_info = {
                "file": fname,
                "peopleCount": people_cnt,
                "objectCount": objs_cnt,
                "accessoryCount": len(data.smallObjects),
                "relationshipCount": rel_cnt,
                "detectedAccessories": detected_accs,
                "expected": expected_classes,
                "matched": matched_classes,
                "recall": recall,
                "timings": data.timings.model_dump(),
                "totalMs": data.totalProcessingTimeMs
            }
            results.append(rec_info)
            logger.info(
                f"[{fname}] Recall: {recall*100:.0f}% ({len(matched_classes)}/{len(expected_classes)}) | "
                f"People: {people_cnt} | Accs: {len(data.smallObjects)} | "
                f"Rels: {rel_cnt} | Total: {data.totalProcessingTimeMs}ms"
            )

        except Exception as e:
            logger.error(f"[{fname}] Failed: {e}", exc_info=True)

    suite_recall = round(total_detected / float(max(1, total_expected)), 3)
    logger.info(f"\n==========================================")
    logger.info(f"BENCHMARK COMPLETED: Overall Recall = {suite_recall*100:.1f}% ({total_detected}/{total_expected})")
    logger.info(f"==========================================")

    # Save benchmark json artifact
    with open("accessory_benchmark_results.json", "w", encoding="utf-8") as f:
        json.dump({"mode": mode, "overallRecall": suite_recall, "cases": results}, f, indent=2)

if __name__ == "__main__":
    mode_arg = sys.argv[1] if len(sys.argv) > 1 else "everything"
    asyncio.run(run_suite(mode_arg))
