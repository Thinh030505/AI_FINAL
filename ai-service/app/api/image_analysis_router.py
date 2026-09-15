import os
import time
import logging
import asyncio
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status

from app.models.image_analysis_model import (
    ImageAnalysisRequest,
    ImageAnalysisResponse,
    ImageAnalysisData,
    ImageAnalysisTimings,
    FusedSummary,
)
from app.services.object_detection_service import get_object_detection_service
from app.services.segmentation_service import get_segmentation_service
from app.services.ocr_service import get_ocr_service
from app.services.preprocessing_service import PreprocessingService, ProcessedImageBundle
from app.services.scene_inference_service import get_scene_inference_service
from app.services.vision_language_service import get_vision_language_service
from app.services.ai_fusion_service import get_ai_fusion_service
from app.services.image_quality_service import get_image_quality_service
from app.services.ai_router_service import get_ai_router_service
from app.services.person_analysis_service import get_person_analysis_service
from app.services.open_vocab_service import get_open_vocab_service
from app.services.color_analysis_service import get_color_analysis_service
from app.services.spatial_relationship_engine import get_spatial_relationship_engine
from app.services.deduplicator_service import get_detection_deduplicator
from app.services.evidence_fusion_engine import get_evidence_fusion_engine

logger = logging.getLogger("ai-service.api.image_analysis")

router = APIRouter(tags=["Unified Image Analysis & Fusion"])

# Concurrency semaphore to guard against memory exhaustion under parallel requests
MAX_CONCURRENT_ANALYSES = int(os.getenv("MAX_CONCURRENT_ANALYSES", "2"))
_analysis_semaphore = asyncio.Semaphore(MAX_CONCURRENT_ANALYSES)


@router.post(
    "/image-analysis",
    response_model=ImageAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Unified Multimodal AI Image Understanding, Adaptive Routing & Fusion Pipeline"
)
async def perform_image_analysis(request: ImageAnalysisRequest):
    image_url = request.imageUrl.strip()
    if not (image_url.startswith("http://") or image_url.startswith("https://") or os.path.exists(image_url)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image URL. Must begin with http:// or https://"
        )

    async with _analysis_semaphore:
        start_total = time.perf_counter()

        module_statuses: Dict[str, str] = {
            "objectDetection": "pending",
            "segmentation": "pending",
            "ocr": "pending",
            "vision": "pending",
        }

        # 1. In-memory unified image fetch & decode (Phase 9: Reuse image data)
        try:
            bundle = await PreprocessingService.prepare_image_bundle(image_url)
        except Exception as e:
            logger.error(f"[UnifiedAnalysis] Failed to fetch/decode image asset: {e}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to fetch or decode image: {str(e)}"
            )

        # Phase 14: Check SHA-256 In-Memory Cache
        import hashlib
        from app.services.cache_service import get_analysis_cache_service
        image_hash = hashlib.sha256(bundle.original_bytes).hexdigest()
        cache_svc = get_analysis_cache_service()
        cached_payload = cache_svc.get(
            image_hash,
            mode=request.mode or "balanced",
            force_ocr=bool(request.forceOcr)
        )
        if cached_payload:
            logger.info(f"[AI_PIPELINE] CACHE_HIT hash={image_hash[:12]} mode={request.mode or 'balanced'}")
            return ImageAnalysisResponse(**cached_payload)

        image_width = bundle.width
        image_height = bundle.height

        # 2. Stage 1: Ultra-fast Non-blocking Image Quality Check (<5ms)
        quality_svc = get_image_quality_service()
        t_quality_start = time.perf_counter()
        try:
            quality_assessment = quality_svc.assess_quality(bundle.bgr)
            quality_ms = round((time.perf_counter() - t_quality_start) * 1000, 2)
            quality_dict = quality_assessment.to_dict()
        except Exception as e:
            quality_ms = round((time.perf_counter() - t_quality_start) * 1000, 2)
            quality_dict = {"warnings": [f"Quality check warning: {e}"], "processingTimeMs": quality_ms}

        # 3. Stage 2: Adaptive Router Decision (<5ms)
        router_svc = get_ai_router_service()
        t_router_start = time.perf_counter()
        try:
            routing_decision = router_svc.route_analysis(
                bundle.bgr,
                mode=request.mode,
                force_ocr=request.forceOcr
            )
            routing_ms = round((time.perf_counter() - t_router_start) * 1000, 2)
            routing_dict = routing_decision.to_dict()
        except Exception as e:
            routing_ms = round((time.perf_counter() - t_router_start) * 1000, 2)
            routing_dict = {
                "mode": request.mode or "balanced",
                "runYolo": True,
                "runSegFormer": True,
                "runOcr": True,
                "runVision": True,
                "reason": f"Router fallback: {e}",
                "processingTimeMs": routing_ms
            }

        # 4. Stages 3 & 4: Parallel Execution of Active Models (YOLO + SegFormer)
        yolo_dict = {"model": "yolo11n", "detections": [], "processingTimeMs": 0}
        seg_dict = {"model": "segformer-b0-ade20k", "regions": [], "processingTimeMs": 0}

        async def run_yolo_task():
            nonlocal yolo_dict
            t0 = time.perf_counter()
            if not routing_dict.get("runYolo", True):
                module_statuses["objectDetection"] = "skipped"
                return 0.0

            try:
                yolo_svc = get_object_detection_service()
                # Run CPU inference in thread pool to avoid blocking event loop
                yolo_res = await asyncio.to_thread(yolo_svc.detect_objects, bundle.bgr)
                elapsed = round((time.perf_counter() - t0) * 1000, 2)
                yolo_dict = {
                    "model": yolo_res.model,
                    "detections": [d.dict() for d in yolo_res.detections],
                    "processingTimeMs": yolo_res.processingTimeMs or elapsed,
                }
                module_statuses["objectDetection"] = "success"
                return elapsed
            except Exception as e:
                elapsed = round((time.perf_counter() - t0) * 1000, 2)
                logger.warning(f"[UnifiedAnalysis] YOLO error: {e}")
                module_statuses["objectDetection"] = "failed"
                return elapsed

        async def run_segformer_task():
            nonlocal seg_dict, image_width, image_height
            t0 = time.perf_counter()
            if not routing_dict.get("runSegFormer", True):
                module_statuses["segmentation"] = "skipped"
                return 0.0

            try:
                seg_svc = get_segmentation_service()
                # Pass in-memory PIL image directly
                seg_res = await seg_svc.segment_image(bundle.pil_image)
                elapsed = round((time.perf_counter() - t0) * 1000, 2)
                if seg_res.imageWidth and seg_res.imageHeight:
                    image_width = seg_res.imageWidth
                    image_height = seg_res.imageHeight
                seg_dict = {
                    "model": seg_res.model,
                    "regions": [r.dict() for r in seg_res.regions],
                    "processingTimeMs": seg_res.processingTimeMs or elapsed,
                }
                module_statuses["segmentation"] = "success"
                return elapsed
            except Exception as e:
                elapsed = round((time.perf_counter() - t0) * 1000, 2)
                logger.warning(f"[UnifiedAnalysis] Segmentation error: {e}")
                module_statuses["segmentation"] = "failed"
                return elapsed

        # Execute YOLO & SegFormer concurrently
        yolo_ms, seg_ms = await asyncio.gather(run_yolo_task(), run_segformer_task())

        # 5. Stage 5: Person-First Intelligence & Body Region Routing
        people_list = []
        all_small_objects = []
        colors_list = []
        person_crop_ms = 0.0
        body_region_ms = 0.0
        open_vocab_ms = 0.0

        open_vocab_detections = []
        if routing_dict.get("runOpenVocab", False):
            t_ov_start = time.perf_counter()
            try:
                ov_svc = get_open_vocab_service()
                open_vocab_detections = await asyncio.to_thread(
                    ov_svc.detect_open_vocabulary,
                    bundle.original_bgr,
                    None,
                    0.25,
                    routing_dict.get("imgsz", 960)
                )
                open_vocab_ms = round((time.perf_counter() - t_ov_start) * 1000, 2)
            except Exception as e:
                open_vocab_ms = round((time.perf_counter() - t_ov_start) * 1000, 2)
                logger.warning(f"[UnifiedAnalysis] OpenVocab warning: {e}")

        if routing_dict.get("runPersonAnalysis", True):
            t_person_start = time.perf_counter()
            person_svc = get_person_analysis_service()
            person_detections = [d for d in yolo_dict.get("detections", []) if d.get("label") == "person"]

            for p_idx, p_det in enumerate(person_detections):
                p_box = p_det.get("box", {})
                raw_box = [p_box.get("x1", 0), p_box.get("y1", 0), p_box.get("x2", 0), p_box.get("y2", 0)]
                orig_box = bundle.map_bbox_to_original(raw_box, image_width, image_height)

                try:
                    p_record = await asyncio.to_thread(
                        person_svc.analyze_person,
                        bundle=bundle,
                        person_bbox_orig=orig_box,
                        person_confidence=p_det.get("confidence", 0.90),
                        person_idx=p_idx + 1,
                        open_vocab_detections=open_vocab_detections
                    )
                    people_list.append(p_record)

                    for acc_grp in [
                        p_record.get("head_accessories", []),
                        p_record.get("ear_accessories", []),
                        p_record.get("neck_accessories", []),
                        p_record.get("wrist_accessories", []),
                        p_record.get("hand_accessories", []),
                        p_record.get("carried_objects", [])
                    ]:
                        all_small_objects.extend(acc_grp)
                except Exception as e:
                    logger.warning(f"[UnifiedAnalysis] Person analysis error: {e}")

            person_crop_ms = round((time.perf_counter() - t_person_start) * 1000, 2)
            body_region_ms = round(person_crop_ms * 0.4, 2)  # Pose estimation fraction

        # 6. Stage 6: Spatial Relationship Reasoning & Color Extraction
        spatial_svc = get_spatial_relationship_engine()
        try:
            relationships = spatial_svc.extract_relationships(
                people=people_list,
                objects=yolo_dict.get("detections", []),
                regions=seg_dict.get("regions", [])
            )
        except Exception as e:
            logger.warning(f"[UnifiedAnalysis] Spatial relationship warning: {e}")
            relationships = []

        # Color Analysis collection
        for p in people_list:
            for cl in p.get("clothing", []):
                colors_list.append({
                    "target": f"person_{p.get('personId')}_{cl.get('type')}",
                    "dominantColor": cl.get("color"),
                    "secondaryColor": cl.get("secondaryColor"),
                    "displayName": cl.get("displayName")
                })

        # Deduplication of small objects & accessories
        dedup_svc = get_detection_deduplicator()
        deduped_small_objects = dedup_svc.deduplicate(all_small_objects)

        # 7. Stage 7: Conditional OCR (Skip on natural scenes/landscapes unless forced or text-heavy)
        ocr_dict = {"fullText": "", "lines": [], "avgConfidence": 0.0, "processingTimeMs": 0}
        ocr_ms = 0.0

        if routing_dict.get("runOcr", False):
            t_ocr_start = time.perf_counter()
            try:
                img_pass1 = PreprocessingService.preprocess_image_bytes(bundle.original_bytes, mode="adaptive")

                def pass2_func():
                    return PreprocessingService.preprocess_image_bytes(bundle.original_bytes, mode="contrast")

                ocr_svc = get_ocr_service()
                ocr_res = await asyncio.to_thread(ocr_svc.run_smart_ocr, img_pass1, pass2_func)
                ocr_ms = round((time.perf_counter() - t_ocr_start) * 1000, 2)
                ocr_dict = {
                    "fullText": ocr_res.fullText,
                    "lines": [l.dict() for l in ocr_res.lines],
                    "avgConfidence": ocr_res.avgConfidence,
                    "processingTimeMs": ocr_res.processingTimeMs or ocr_ms,
                }
                module_statuses["ocr"] = "success"
            except Exception as e:
                ocr_ms = round((time.perf_counter() - t_ocr_start) * 1000, 2)
                logger.warning(f"[UnifiedAnalysis] OCR error: {e}")
                module_statuses["ocr"] = "failed"
        else:
            module_statuses["ocr"] = "skipped"
            ocr_dict = {
                "fullText": "",
                "lines": [],
                "avgConfidence": 0.0,
                "processingTimeMs": 0,
            }

        # 8. Stage 8: Heuristic Scene Inference
        scene_dict = {"sceneType": "general scene", "environment": "unknown", "weather": "clear"}
        try:
            scene_svc = get_scene_inference_service()
            scene_res = scene_svc.infer_scene(
                regions=seg_dict.get("regions", []),
                objects=yolo_dict.get("detections", []),
                has_ocr_text=bool(ocr_dict.get("fullText")),
            )
            scene_dict = scene_res.to_dict()
        except Exception as e:
            logger.warning(f"[UnifiedAnalysis] Scene inference warning: {e}")

        # 9. Stage 9: Vision-Language Understanding (Grounding with people, accessories & relationships)
        vision_dict = {"sceneType": "", "environment": "", "weather": "", "mainObjects": [], "backgroundElements": [], "description": "", "isFallback": True}
        t_vision_start = time.perf_counter()
        try:
            vl_svc = get_vision_language_service()
            resized_pil = bundle.get_resized_pil(1280)
            vl_res = await vl_svc.understand_image(
                image_url=resized_pil,
                objects=yolo_dict.get("detections", []),
                regions=seg_dict.get("regions", []),
                ocr_text=ocr_dict.get("fullText"),
                inferred_scene=scene_dict,
                people=people_list,
                relationships=[r.to_dict() for r in relationships]
            )
            vision_ms = round((time.perf_counter() - t_vision_start) * 1000, 2)
            vision_dict = vl_res.to_dict()
            module_statuses["vision"] = "fallback" if vl_res.is_fallback else "success"
        except Exception as e:
            vision_ms = round((time.perf_counter() - t_vision_start) * 1000, 2)
            logger.warning(f"[UnifiedAnalysis] Vision understanding error: {e}")
            module_statuses["vision"] = "failed"

        # 10. Stage 10: Multimodal Evidence Fusion & Calibration
        evidence_engine = get_evidence_fusion_engine()
        for item in deduped_small_objects:
            vlm_confirmed = evidence_engine.verify_with_vlm_text(
                item_label=item.get("label", ""),
                vlm_description=vision_dict.get("description", ""),
                vlm_objects=vision_dict.get("mainObjects", [])
            )
            item["verified_by_vlm"] = vlm_confirmed
            item["confidence"] = evidence_engine.fuse_object_confidence(
                base_confidence=item.get("confidence", 0.70),
                source_models=item.get("source_models", ["detector"]),
                body_region=item.get("body_region"),
                vlm_confirmed=vlm_confirmed,
                quality_score=quality_dict.get("blurScore", 100.0) / 100.0
            )

        t_fusion_start = time.perf_counter()
        total_time_ms = int((time.perf_counter() - start_total) * 1000)

        fusion_svc = get_ai_fusion_service()
        fused_output = fusion_svc.fuse_analysis(
            yolo_data=yolo_dict,
            seg_data=seg_dict,
            ocr_data=ocr_dict,
            vision_data=vision_dict,
            scene_data=scene_dict,
            module_statuses=module_statuses,
            total_time_ms=total_time_ms,
        )
        fusion_ms = round((time.perf_counter() - t_fusion_start) * 1000, 2)
        final_total_ms = round((time.perf_counter() - start_total) * 1000, 2)

        timings = ImageAnalysisTimings(
            qualityCheckMs=quality_ms,
            routingMs=routing_ms,
            objectDetectionMs=yolo_ms,
            personCropMs=person_crop_ms,
            bodyRegionMs=body_region_ms,
            openVocabMs=open_vocab_ms,
            segmentationMs=seg_ms,
            ocrMs=ocr_ms,
            visionMs=vision_ms,
            fusionMs=fusion_ms,
            totalMs=final_total_ms,
        )

        fused_summary = FusedSummary(**fused_output["fusedResult"])

        deep_inventory = {
            "scene": scene_dict,
            "people": people_list,
            "objects": yolo_dict.get("detections", []),
            "small_objects": deduped_small_objects,
            "environment_regions": seg_dict.get("regions", []),
            "text": ocr_dict.get("lines", []),
            "relationships": [r.to_dict() for r in relationships],
            "colors": colors_list,
            "semantic_summary": vision_dict.get("description", ""),
            "uncertain_findings": [],
            "warnings": quality_dict.get("warnings", [])
        }

        analysis_data = ImageAnalysisData(
            status=fused_output["status"],
            modules=module_statuses,
            analysisMode=routing_dict.get("mode", request.mode or "balanced"),
            qualityAssessment=quality_dict,
            routingDecision=routing_dict,
            timings=timings,
            totalProcessingTimeMs=int(final_total_ms),
            imageWidth=image_width,
            imageHeight=image_height,
            fusedResult=fused_summary,
            objectDetection=fused_output["objectDetection"],
            segmentation=fused_output["segmentation"],
            ocr=fused_output["ocr"],
            vision=fused_output["vision"],
            people=people_list,
            smallObjects=deduped_small_objects,
            relationships=[r.to_dict() for r in relationships],
            colors=colors_list,
            deepInventory=deep_inventory
        )

        resp = ImageAnalysisResponse(
            success=True,
            message="Multimodal AI image analysis, adaptive routing and fusion completed successfully",
            data=analysis_data
        )

        # Store in cache (Phase 14)
        cache_svc.set(
            image_hash,
            mode=request.mode or "balanced",
            force_ocr=bool(request.forceOcr),
            data=resp.model_dump()
        )

        # Structured Pipeline Telemetry
        logger.info(
            f"[AI_PIPELINE] mode={analysis_data.analysisMode} "
            f"quality={quality_ms}ms router={routing_ms}ms "
            f"yolo={yolo_ms}ms ({len(yolo_dict.get('detections', []))} objs) "
            f"personCrop={person_crop_ms}ms ({len(people_list)} people) "
            f"openVocab={open_vocab_ms}ms ({len(deduped_small_objects)} accs) "
            f"seg={seg_ms}ms ({len(seg_dict.get('regions', []))} regs) "
            f"ocr={ocr_ms}ms ({len(ocr_dict.get('lines', []))} lines) "
            f"vision={vision_ms}ms fusion={fusion_ms}ms total={final_total_ms}ms"
        )

        return resp
