import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("ai-service.scene_inference")


class SceneInferenceResult:
    def __init__(
        self,
        scene_type: str,
        environment: str,
        weather: str = "clear",
        confidence_heuristic: str = "rule-based",
        supporting_evidence: Optional[List[str]] = None,
    ):
        self.scene_type = scene_type
        self.environment = environment
        self.weather = weather
        self.confidence_heuristic = confidence_heuristic
        self.supporting_evidence = supporting_evidence or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sceneType": self.scene_type,
            "environment": self.environment,
            "weather": self.weather,
            "confidence": self.confidence_heuristic,
            "inferenceMethod": "heuristic-rule-based",
            "supportingEvidence": self.supporting_evidence,
            "reasons": self.supporting_evidence,
        }


class SceneInferenceService:
    """
    Heuristic Rule-Based Scene Inference Service.
    Combines Machine Vision evidence:
    - SegFormer semantic environmental regions (sky, sea, sand, road, building, etc.)
    - YOLO detected object classes (umbrella, chair, car, person, laptop, etc.)
    - PaddleOCR text presence
    """

    def infer_scene(
        self,
        regions: List[Dict[str, Any]],
        objects: List[Dict[str, Any]],
        has_ocr_text: bool = False,
    ) -> SceneInferenceResult:
        # Extract labels from regions (with percentage >= 2%)
        top_region_labels = {
            r.get("label", "").lower()
            for r in regions
            if r.get("regionPercentage", 0) >= 2.0
        }
        # Extract labels from detected objects
        object_labels = {
            obj.get("label", "").lower()
            for obj in objects
        }

        evidence = []
        scene_type = "general scene"
        environment = "unknown"
        weather = "clear"

        # Determine Environment: Outdoor vs Indoor
        outdoor_indicators = {"sky", "water/sea", "sand", "road", "grass", "tree/foliage", "mountain", "sidewalk"}
        indoor_indicators = {"wall", "floor", "ceiling"}

        outdoor_matches = top_region_labels.intersection(outdoor_indicators)
        indoor_matches = top_region_labels.intersection(indoor_indicators)

        if "sky" in top_region_labels or len(outdoor_matches) > len(indoor_matches):
            environment = "outdoor"
        elif len(indoor_matches) > 0:
            environment = "indoor"
        else:
            environment = "outdoor" if len(outdoor_matches) > 0 else "unknown"

        # Rule 1: Beach Scene
        # sea/water + sand + sky, or sand + sea, or beach umbrella + sand/sea
        if (
            ("water/sea" in top_region_labels and "sand" in top_region_labels)
            or ("sand" in top_region_labels and ("umbrella" in object_labels or "chair" in object_labels))
            or ("water/sea" in top_region_labels and "sky" in top_region_labels and "sand" in top_region_labels)
        ):
            scene_type = "beach"
            environment = "outdoor"
            evidence.append("Detected water/sea and sand regions with coastal elements")
            if "umbrella" in object_labels or "chair" in object_labels:
                evidence.append("Detected beach umbrella or seating objects")

        # Rule 2: Street / Urban City Scene
        elif (
            ("road" in top_region_labels and "building" in top_region_labels)
            or ("road" in top_region_labels and any(v in object_labels for v in ["car", "bus", "truck", "motorcycle", "bicycle"]))
            or ("building" in top_region_labels and "car" in object_labels)
        ):
            scene_type = "street / urban"
            environment = "outdoor"
            evidence.append("Detected road/building regions and vehicular objects")

        # Rule 3: Park / Nature Scene
        elif (
            ("grass" in top_region_labels and "tree/foliage" in top_region_labels)
            or ("mountain" in top_region_labels and "sky" in top_region_labels)
            or ("tree/foliage" in top_region_labels and "sky" in top_region_labels and len(indoor_matches) == 0)
        ):
            scene_type = "nature / park"
            environment = "outdoor"
            evidence.append("Dominant grass, tree/foliage, and natural landscape regions")

        # Rule 4: Office / Indoor Workspace
        elif (
            (environment == "indoor" and any(o in object_labels for o in ["laptop", "mouse", "keyboard", "tv", "book"]))
            or (any(o in object_labels for o in ["chair", "desk", "laptop"]) and ("wall" in top_region_labels or "floor" in top_region_labels))
        ):
            scene_type = "indoor / office workspace"
            environment = "indoor"
            evidence.append("Indoor architectural regions combined with workspace/office equipment")

        # Rule 5: Document / Text-Heavy Scene
        elif has_ocr_text and len(top_region_labels) <= 1 and len(object_labels) == 0:
            scene_type = "document / text presentation"
            environment = "indoor"
            evidence.append("Presence of structured text lines with minimal environmental scenery")

        # Rule 6: General Room / Living Space
        elif environment == "indoor":
            scene_type = "indoor room"
            evidence.append("Enclosed space characterized by walls, flooring, or furniture")

        # Rule 7: General Outdoor
        elif environment == "outdoor":
            scene_type = "outdoor landscape"
            evidence.append("Open environment with natural or structural backdrop")

        # Weather inference
        if "sky" in top_region_labels:
            weather = "clear daylight"

        return SceneInferenceResult(
            scene_type=scene_type,
            environment=environment,
            weather=weather,
            confidence_heuristic="rule-based",
            supporting_evidence=evidence,
        )


_scene_inference_service: Optional[SceneInferenceService] = None


def get_scene_inference_service() -> SceneInferenceService:
    global _scene_inference_service
    if _scene_inference_service is None:
        _scene_inference_service = SceneInferenceService()
    return _scene_inference_service
