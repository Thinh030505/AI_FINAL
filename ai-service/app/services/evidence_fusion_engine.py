from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger("ai-service.evidence_fusion")

class EvidenceFusionEngine:
    """
    Multimodal Evidence Fusion Engine.
    Fuses confidence scores across standard detectors, open-vocabulary detectors,
    anatomical body-region priors, and Vision-Language semantic verification.
    """
    _instance: Optional["EvidenceFusionEngine"] = None

    @classmethod
    def get_instance(cls) -> "EvidenceFusionEngine":
        if cls._instance is None:
            cls._instance = EvidenceFusionEngine()
        return cls._instance

    def fuse_object_confidence(
        self,
        base_confidence: float,
        source_models: List[str],
        body_region: Optional[str] = None,
        vlm_confirmed: bool = False,
        quality_score: float = 1.0
    ) -> float:
        """
        Calibrates and fuses confidence based on multi-source evidence:
        - Multi-model agreement (+0.08)
        - Body region alignment (+0.07)
        - VLM semantic confirmation (+0.08)
        - Image quality weighting
        """
        score = base_confidence

        # 1. Multi-model consensus bonus
        if len(source_models) > 1:
            score += 0.08

        # 2. Anatomical body region consistency bonus
        if body_region and body_region != "unknown":
            score += 0.06

        # 3. VLM Verification confirmation
        if vlm_confirmed:
            score += 0.08

        # 4. Blur / Quality degradation penalty
        if quality_score < 0.40:
            score *= 0.85

        return round(min(0.99, max(0.20, score)), 3)

    def verify_with_vlm_text(
        self,
        item_label: str,
        vlm_description: str,
        vlm_objects: List[str]
    ) -> bool:
        """
        Checks whether Gemini Vision's scene narrative or identified objects corroborate the item.
        """
        target = item_label.lower().strip()
        desc = vlm_description.lower()

        # Direct token match
        if target in desc:
            return True

        # Check in mainObjects
        for obj in vlm_objects:
            if target in obj.lower() or obj.lower() in target:
                return True

        # Check key synonyms
        synonyms = {
            "sunglasses": ["glasses", "sunglasses", "shades", "eyewear"],
            "airpods": ["airpods", "earbuds", "headphones", "earphones"],
            "smartwatch": ["smartwatch", "watch", "wristwatch"],
            "necklace": ["necklace", "chain", "pendant"],
            "backpack": ["backpack", "bag", "pack"],
            "ring": ["ring", "wedding band"]
        }

        for syn_key, syn_list in synonyms.items():
            if target in syn_list:
                if any(s in desc for s in syn_list):
                    return True

        return False

def get_evidence_fusion_engine() -> EvidenceFusionEngine:
    return EvidenceFusionEngine.get_instance()
