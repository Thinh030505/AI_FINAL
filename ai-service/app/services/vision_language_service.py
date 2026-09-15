import os
import json
import logging
import io
import asyncio
from dotenv import load_dotenv

load_dotenv()
from typing import Dict, Any, List, Optional
import httpx
from PIL import Image

logger = logging.getLogger("ai-service.vision_language")


class VisionLanguageResult:
    def __init__(
        self,
        scene_type: str,
        environment: str,
        weather: str,
        main_objects: List[str],
        background_elements: List[str],
        activities: List[str],
        description: str,
        is_fallback: bool = False,
    ):
        self.scene_type = scene_type
        self.environment = environment
        self.weather = weather
        self.main_objects = main_objects
        self.background_elements = background_elements
        self.activities = activities
        self.description = description
        self.is_fallback = is_fallback

    def to_dict(self) -> Dict[str, Any]:
        return {
            "sceneType": self.scene_type,
            "environment": self.environment,
            "weather": self.weather,
            "mainObjects": self.main_objects,
            "backgroundElements": self.background_elements,
            "activities": self.activities,
            "description": self.description,
            "isFallback": self.is_fallback,
        }


class VisionLanguageService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-flash-latest").strip()
        self.is_available = bool(self.api_key)
        if self.is_available:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel(self.model_name)
                logger.info(f"[VisionLanguage] Gemini Vision model configured successfully ({self.model_name}).")
            except Exception as e:
                logger.warning(f"[VisionLanguage] Failed to configure Gemini Vision: {e}. Fallback enabled.")
                self.is_available = False
        else:
            logger.info("[VisionLanguage] No GEMINI_API_KEY detected in env. Using Local Evidence Synthesizer fallback.")

    def _generate_fallback_description(
        self,
        objects: List[Dict[str, Any]],
        regions: List[Dict[str, Any]],
        ocr_text: Optional[str],
        inferred_scene: Dict[str, Any],
        people: Optional[List[Dict[str, Any]]] = None,
        relationships: Optional[List[Dict[str, Any]]] = None,
    ) -> VisionLanguageResult:
        """
        Local Evidence-Grounded Synthesizer:
        Generates a concise, strictly factual natural language description and metadata
        directly grounded in verified machine vision outputs without hallucination.
        """
        main_objects = list({obj.get("label", "").lower() for obj in objects if obj.get("label")})
        background_elements = [
            r.get("label", "").lower()
            for r in regions
            if r.get("regionPercentage", 0) >= 2.0
        ]
        scene_type = inferred_scene.get("sceneType", "scene")
        environment = inferred_scene.get("environment", "unknown")
        weather = inferred_scene.get("weather", "clear")

        # Build concise natural language summary
        parts = []
        if scene_type != "general scene":
            parts.append(f"A {environment} {scene_type} scene")
        elif environment != "unknown":
            parts.append(f"An {environment} scene")
        else:
            parts.append("An image")

        if background_elements:
            top_bg = ", ".join(background_elements[:3])
            parts.append(f"featuring {top_bg}")

        if main_objects:
            objs = ", ".join(main_objects[:4])
            parts.append(f"with prominent objects including {objs}")

        # Add person details if present
        if people:
            p_desc = []
            for p in people[:2]:
                clothing_strs = [c.get("displayName") for c in p.get("clothing", []) if c.get("displayName")]
                acc_strs = [
                    a.get("display_name", a.get("label"))
                    for a_list in [p.get("head_accessories", []), p.get("neck_accessories", []), p.get("wrist_accessories", [])]
                    for a in a_list
                ]
                details = []
                if clothing_strs:
                    details.append(f"wearing {', '.join(clothing_strs[:2])}")
                if acc_strs:
                    details.append(f"with {', '.join(acc_strs[:2])}")
                if details:
                    p_desc.append(" ".join(details))
            if p_desc:
                parts.append(f"showing person {' and '.join(p_desc)}")

        if ocr_text and len(ocr_text.strip()) > 0:
            preview_txt = ocr_text.strip().replace("\n", " ")[:60]
            parts.append(f'and recognized text: "{preview_txt}"')

        description = " ".join(parts).strip() + "."

        return VisionLanguageResult(
            scene_type=scene_type,
            environment=environment,
            weather=weather,
            main_objects=main_objects,
            background_elements=background_elements,
            activities=[],
            description=description,
            is_fallback=True,
        )

    async def understand_image(
        self,
        image_url: Any,
        objects: List[Dict[str, Any]],
        regions: List[Dict[str, Any]],
        ocr_text: Optional[str],
        inferred_scene: Dict[str, Any],
        people: Optional[List[Dict[str, Any]]] = None,
        relationships: Optional[List[Dict[str, Any]]] = None,
    ) -> VisionLanguageResult:
        # If API key is available, attempt Gemini Vision with strict Evidence Grounding
        if self.is_available:
            try:
                if isinstance(image_url, Image.Image):
                    img = image_url.convert("RGB")
                elif hasattr(image_url, "pil_image"):
                    img = image_url.pil_image.convert("RGB")
                elif isinstance(image_url, bytes):
                    img = Image.open(io.BytesIO(image_url)).convert("RGB")
                elif isinstance(image_url, str) and os.path.exists(image_url):
                    img = Image.open(image_url).convert("RGB")
                else:
                    headers = {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    }
                    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
                        resp = await client.get(image_url, headers=headers)
                        if resp.status_code != 200:
                            raise ValueError(f"HTTP {resp.status_code}")
                        img_bytes = resp.content
                    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

                # Optimize input image resolution for Gemini (cap longest side to 1280px)
                w, h = img.size
                if max(w, h) > 1280:
                    scale = 1280.0 / max(w, h)
                    img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.BILINEAR)

                # Format Concise Machine Vision Evidence
                obj_summary = [f"{o.get('label')}" for o in objects[:8]]
                region_summary = [f"{r.get('label')}" for r in regions[:4]]
                ocr_snippet = ocr_text[:100] if ocr_text else "None"

                people_summary = []
                if people:
                    for p in people[:3]:
                        clothing = [c.get("displayName") for c in p.get("clothing", [])]
                        accs = [
                            a.get("display_name", a.get("label"))
                            for a_list in [p.get("head_accessories", []), p.get("ear_accessories", []), p.get("neck_accessories", []), p.get("wrist_accessories", []), p.get("hand_accessories", [])]
                            for a in a_list
                        ]
                        people_summary.append({
                            "personId": p.get("personId"),
                            "clothing": clothing,
                            "accessories": accs
                        })

                rel_summary = [r.get("description") for r in (relationships or [])[:5]]

                prompt = f"""You are an expert visual evidence verifier.
Analyze this image and return strictly valid JSON (no markdown formatting, no code fences):
{{
  "sceneType": "{inferred_scene.get('sceneType', 'general scene')}",
  "environment": "indoor or outdoor",
  "weather": "clear, overcast, rainy, or indoor/na",
  "mainObjects": {json.dumps(obj_summary)},
  "backgroundElements": {json.dumps(region_summary)},
  "activities": [],
  "description": "2 to 3 factual sentences describing the scene, visible people, their clothing and verified accessories."
}}
Structured Evidence Detected by Machine Vision:
- Objects: {', '.join(obj_summary) or 'none'}
- Regions: {', '.join(region_summary) or 'none'}
- People & Accessories: {json.dumps(people_summary)}
- Relationships: {', '.join(rel_summary) or 'none'}
- Text: {ocr_snippet}

CRITICAL RULES:
1. Do not hallucinate or invent objects not visible.
2. Verify if detected accessories (glasses, earbuds, necklace, watch, ring, bag, phone) are genuinely visible.
3. If an accessory is uncertain, do not assert it as definite fact."""

                response = await asyncio.to_thread(self.model.generate_content, [prompt, img])
                text_content = response.text.strip()
                if text_content.startswith("```json"):
                    text_content = text_content[7:]
                if text_content.endswith("```"):
                    text_content = text_content[:-3]
                text_content = text_content.strip()

                parsed = json.loads(text_content)
                return VisionLanguageResult(
                    scene_type=parsed.get("sceneType", inferred_scene.get("sceneType", "scene")),
                    environment=parsed.get("environment", inferred_scene.get("environment", "unknown")),
                    weather=parsed.get("weather", "clear"),
                    main_objects=parsed.get("mainObjects", []),
                    background_elements=parsed.get("backgroundElements", []),
                    activities=parsed.get("activities", []),
                    description=parsed.get("description", ""),
                    is_fallback=False,
                )
            except Exception as e:
                logger.warning(f"[VisionLanguage] Gemini call failed: {e}. Falling back to local evidence synthesizer.")

        # Local evidence synthesizer fallback
        return self._generate_fallback_description(objects, regions, ocr_text, inferred_scene, people, relationships)


_vision_language_service: Optional[VisionLanguageService] = None


def get_vision_language_service() -> VisionLanguageService:
    global _vision_language_service
    if _vision_language_service is None:
        _vision_language_service = VisionLanguageService()
    return _vision_language_service


vision_language_service = get_vision_language_service()
