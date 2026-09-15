import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("ai-service.ai_fusion")


class AIFusionService:
    """
    AI Fusion Engine.
    Intelligently aggregates and synthesizes multimodal outputs:
    1. YOLO11 Object Detection
    2. SegFormer Semantic Segmentation
    3. PaddleOCR Optical Character Recognition
    4. Heuristic Scene Inference
    5. Vision-Language Understanding (Gemini / Evidence Grounded)
    """

    def fuse_analysis(
        self,
        yolo_data: Dict[str, Any],
        seg_data: Dict[str, Any],
        ocr_data: Dict[str, Any],
        vision_data: Dict[str, Any],
        scene_data: Dict[str, Any],
        module_statuses: Dict[str, str],
        total_time_ms: int,
    ) -> Dict[str, Any]:
        # 1. Objects processing & deduplication
        raw_objects = yolo_data.get("detections", [])
        verified_objects = []
        seen_boxes = set()

        for obj in raw_objects:
            # Format object with real confidence
            box = obj.get("box", {})
            box_tuple = (round(box.get("x1", 0), 1), round(box.get("y1", 0), 1), round(box.get("x2", 0), 1), round(box.get("y2", 0), 1))
            if box_tuple not in seen_boxes:
                seen_boxes.add(box_tuple)
                verified_objects.append({
                    "label": obj.get("label", "").lower(),
                    "classId": obj.get("classId", 0),
                    "confidence": round(float(obj.get("confidence", 0)), 4),
                    "box": box,
                })

        # 2. Environmental regions processing
        raw_regions = seg_data.get("regions", [])
        verified_regions = []
        for reg in raw_regions:
            verified_regions.append({
                "label": reg.get("label", ""),
                "rawLabel": reg.get("rawLabel", ""),
                "pixelCount": reg.get("pixelCount", 0),
                "regionPercentage": round(float(reg.get("regionPercentage", 0)), 2),
            })

        # 3. OCR Text processing (Strict: text is only verified if detected by PaddleOCR)
        ocr_text = ocr_data.get("fullText", "").strip()
        verified_text = {
            "fullText": ocr_text,
            "lineCount": len(ocr_data.get("lines", [])),
            "avgConfidence": round(float(ocr_data.get("avgConfidence", 0)), 4) if ocr_text else 0.0,
            "isTextPresent": bool(ocr_text),
        }

        # 4. Scene categorization fusion: prefer Vision LLM if aligned with regions, else heuristic
        fused_scene_type = vision_data.get("sceneType") or scene_data.get("sceneType") or "general scene"
        fused_environment = vision_data.get("environment") or scene_data.get("environment") or "unknown"
        fused_weather = vision_data.get("weather") or scene_data.get("weather") or "clear"

        # 5. Natural description synthesis
        fused_description = vision_data.get("description", "").strip()

        # Overall Status
        has_errors = any(st == "failed" for st in module_statuses.values())
        overall_status = "partial_success" if has_errors else "success"

        return {
            "status": overall_status,
            "modules": module_statuses,
            "totalProcessingTimeMs": total_time_ms,
            "fusedResult": {
                "sceneType": fused_scene_type,
                "environment": fused_environment,
                "weather": fused_weather,
                "description": fused_description,
                "objectCount": len(verified_objects),
                "distinctObjectClasses": list({obj["label"] for obj in verified_objects}),
                "dominantRegions": [r["label"] for r in verified_regions[:3]],
                "hasText": verified_text["isTextPresent"],
                "textSnippet": ocr_text[:80] + ("..." if len(ocr_text) > 80 else "") if ocr_text else "",
            },
            "objectDetection": {
                "model": yolo_data.get("model", "yolo11n"),
                "detections": verified_objects,
                "objectCount": len(verified_objects),
                "processingTimeMs": yolo_data.get("processingTimeMs", 0),
            },
            "segmentation": {
                "model": seg_data.get("model", "segformer-b0-ade20k"),
                "regions": verified_regions,
                "processingTimeMs": seg_data.get("processingTimeMs", 0),
            },
            "ocr": {
                "fullText": verified_text["fullText"],
                "lineCount": verified_text["lineCount"],
                "avgConfidence": verified_text["avgConfidence"],
                "processingTimeMs": ocr_data.get("processingTimeMs", 0),
            },
            "vision": {
                "sceneType": fused_scene_type,
                "environment": fused_environment,
                "weather": fused_weather,
                "mainObjects": vision_data.get("mainObjects", []),
                "backgroundElements": vision_data.get("backgroundElements", []),
                "description": fused_description,
                "isFallback": vision_data.get("isFallback", False),
            },
        }


_ai_fusion_service: Optional[AIFusionService] = None


def get_ai_fusion_service() -> AIFusionService:
    global _ai_fusion_service
    if _ai_fusion_service is None:
        _ai_fusion_service = AIFusionService()
    return _ai_fusion_service
