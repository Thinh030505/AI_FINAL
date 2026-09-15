import os
import sys
import time
import json
import psutil
import asyncio
from PIL import Image

# Ensure app package is importable
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.services.object_detection_service import get_object_detection_service
from app.services.segmentation_service import get_segmentation_service
from app.services.ocr_service import get_ocr_service
from app.services.preprocessing_service import PreprocessingService
from app.services.scene_inference_service import get_scene_inference_service
from app.services.vision_language_service import get_vision_language_service
from app.services.ai_fusion_service import get_ai_fusion_service

process = psutil.Process(os.getpid())

def get_ram_mb():
    return round(process.memory_info().rss / (1024 * 1024), 2)

TEST_IMAGES = [
    ("Beach", r"D:\hocWeb\P_AI\test-images\beach.jpg"),
    ("Street", r"D:\hocWeb\P_AI\test-images\street.jpg"),
    ("Receipt", r"D:\hocWeb\P_AI\test-images\receipt.jpg"),
    ("Person+Phone", r"D:\hocWeb\P_AI\test-images\person_phone.jpg"),
    ("Office", r"D:\hocWeb\P_AI\test-images\office.jpg"),
    ("Text-heavy", r"D:\hocWeb\P_AI\test-images\text_heavy.png"),
    ("Low-text", r"D:\hocWeb\P_AI\test-images\low_text.jpg"),
    ("Object-poor", r"D:\hocWeb\P_AI\test-images\object_poor.jpg"),
]

async def run_baseline_benchmarks():
    ram_init = get_ram_mb()
    print(f"=== PHASE 9 BASELINE BENCHMARK (BEFORE OPTIMIZATION) ===")
    print(f"Initial Process RSS RAM: {ram_init} MB\n")

    # Pre-warm singletons
    print("Initializing services...")
    yolo_svc = get_object_detection_service()
    seg_svc = get_segmentation_service()
    ocr_svc = get_ocr_service()
    scene_svc = get_scene_inference_service()
    vl_svc = get_vision_language_service()
    fusion_svc = get_ai_fusion_service()
    ram_after_models = get_ram_mb()
    print(f"RAM after models initialized: {ram_after_models} MB (+{round(ram_after_models - ram_init, 2)} MB)\n")

    results = []

    for name, path in TEST_IMAGES:
        print(f"--- Benchmarking [{name}] ({os.path.basename(path)}) ---")
        if not os.path.exists(path):
            print(f"Error: File not found: {path}")
            continue

        with open(path, "rb") as f:
            image_bytes = f.read()

        t_total_start = time.perf_counter()

        # 1. YOLO
        t0 = time.perf_counter()
        try:
            yolo_res = yolo_svc.detect_objects(image_bytes)
            yolo_ms = round((time.perf_counter() - t0) * 1000, 2)
            yolo_detections = [d.dict() for d in yolo_res.detections]
        except Exception as e:
            yolo_ms = round((time.perf_counter() - t0) * 1000, 2)
            yolo_detections = []
            print(f"YOLO error: {e}")

        # 2. SegFormer
        t0 = time.perf_counter()
        try:
            # Current pipeline passes path/url to _fetch_image
            seg_res = await seg_svc.segment_image(path)
            seg_ms = round((time.perf_counter() - t0) * 1000, 2)
            seg_regions = [r.dict() for r in seg_res.regions]
        except Exception as e:
            seg_ms = round((time.perf_counter() - t0) * 1000, 2)
            seg_regions = []
            print(f"SegFormer error: {e}")

        # 3. PaddleOCR (Dual pass)
        t0 = time.perf_counter()
        try:
            img_pass1 = PreprocessingService.preprocess_image_bytes(image_bytes, mode="adaptive")
            def pass2_func():
                return PreprocessingService.preprocess_image_bytes(image_bytes, mode="contrast")
            ocr_res = ocr_svc.run_smart_ocr(img_pass1, pass2_func)
            ocr_ms = round((time.perf_counter() - t0) * 1000, 2)
            ocr_text = ocr_res.fullText
            ocr_lines = [l.dict() for l in ocr_res.lines]
        except Exception as e:
            ocr_ms = round((time.perf_counter() - t0) * 1000, 2)
            ocr_text = ""
            ocr_lines = []
            print(f"OCR error: {e}")

        # 4. Scene Inference
        scene_res = scene_svc.infer_scene(
            regions=seg_regions,
            objects=yolo_detections,
            has_ocr_text=bool(ocr_text)
        )
        scene_dict = scene_res.to_dict()

        # 5. Vision-Language (Gemini)
        t0 = time.perf_counter()
        try:
            vl_res = await vl_svc.understand_image(
                image_url=path,
                objects=yolo_detections,
                regions=seg_regions,
                ocr_text=ocr_text,
                inferred_scene=scene_dict
            )
            vision_ms = round((time.perf_counter() - t0) * 1000, 2)
            vision_dict = vl_res.to_dict()
        except Exception as e:
            vision_ms = round((time.perf_counter() - t0) * 1000, 2)
            vision_dict = {}
            print(f"Vision error: {e}")

        # 6. Fusion
        t0 = time.perf_counter()
        fused = fusion_svc.fuse_analysis(
            yolo_data={"model": "yolo11n", "detections": yolo_detections, "processingTimeMs": yolo_ms},
            seg_data={"model": "segformer-b0-ade20k", "regions": seg_regions, "processingTimeMs": seg_ms},
            ocr_data={"fullText": ocr_text, "lines": ocr_lines, "avgConfidence": 0.9, "processingTimeMs": ocr_ms},
            vision_data=vision_dict,
            scene_data=scene_dict,
            module_statuses={"objectDetection": "success", "segmentation": "success", "ocr": "success", "vision": "success"},
            total_time_ms=0
        )
        fusion_ms = round((time.perf_counter() - t0) * 1000, 2)

        total_ms = round((time.perf_counter() - t_total_start) * 1000, 2)
        curr_ram = get_ram_mb()

        row = {
            "category": name,
            "filename": os.path.basename(path),
            "qualityCheckMs": 0.0,
            "routingMs": 0.0,
            "yoloMs": yolo_ms,
            "segFormerMs": seg_ms,
            "ocrMs": ocr_ms,
            "visionMs": vision_ms,
            "fusionMs": fusion_ms,
            "totalMs": total_ms,
            "ramMb": curr_ram,
            "detectedObjects": len(yolo_detections),
            "regionsCount": len(seg_regions),
            "ocrLines": len(ocr_lines),
            "sceneType": fused["fusedResult"]["sceneType"],
        }
        results.append(row)
        print(f"  -> Total: {total_ms}ms | YOLO: {yolo_ms}ms | Seg: {seg_ms}ms | OCR: {ocr_ms}ms | Vision: {vision_ms}ms | Fusion: {fusion_ms}ms | RAM: {curr_ram}MB")

    # Output Markdown table
    print("\n" + "="*80)
    print("BASELINE EMPIRICAL BENCHMARK TABLE (BEFORE)")
    print("="*80)
    headers = ["Category", "Image", "YOLO (ms)", "SegFormer (ms)", "OCR (ms)", "Gemini (ms)", "Fusion (ms)", "Total (ms)", "RAM (MB)"]
    print(f"| {' | '.join(headers)} |")
    print(f"|{'|'.join(['---' for _ in headers])}|")
    for r in results:
        print(f"| {r['category']} | {r['filename']} | {r['yoloMs']:.1f} | {r['segFormerMs']:.1f} | {r['ocrMs']:.1f} | {r['visionMs']:.1f} | {r['fusionMs']:.1f} | {r['totalMs']:.1f} | {r['ramMb']:.1f} |")

    # Save to JSON
    output_path = os.path.join(os.path.dirname(__file__), "benchmark_baseline_before.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "ramInitMb": ram_init,
            "ramAfterModelsMb": ram_after_models,
            "results": results
        }, f, indent=2, ensure_ascii=False)
    print(f"\nSaved baseline benchmark results to {output_path}")

if __name__ == "__main__":
    asyncio.run(run_baseline_benchmarks())
