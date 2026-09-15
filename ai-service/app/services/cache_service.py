import time
import hashlib
import logging
from typing import Dict, Any, Optional
from collections import OrderedDict

logger = logging.getLogger("ai-service.cache")

class AnalysisCacheService:
    """
    High-performance in-memory LRU cache keyed by SHA-256 image content hash.
    Avoids re-running YOLO, SegFormer, OCR, and Gemini Vision for identical images.
    """
    def __init__(self, max_entries: int = 500, default_ttl_seconds: int = 3600):
        self._max_entries = max_entries
        self._ttl = default_ttl_seconds
        self._cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()

    @staticmethod
    def compute_image_hash(image_bytes: bytes) -> str:
        return hashlib.sha256(image_bytes).hexdigest()

    def get(self, image_hash: str, mode: str = "balanced", force_ocr: bool = False) -> Optional[Dict[str, Any]]:
        cache_key = f"{image_hash}:{mode}:{force_ocr}"
        if cache_key not in self._cache:
            return None

        entry = self._cache[cache_key]
        now = time.time()
        if now - entry["timestamp"] > self._ttl:
            # Expired
            del self._cache[cache_key]
            logger.info(f"[CACHE] Expired entry evicted for key: {cache_key[:20]}...")
            return None

        # Move to end (LRU)
        self._cache.move_to_end(cache_key)
        logger.info(f"[CACHE] HIT for image hash {image_hash[:12]} (mode={mode}, forceOcr={force_ocr})")
        return entry["data"]

    def set(self, image_hash: str, mode: str, force_ocr: bool, data: Dict[str, Any]):
        cache_key = f"{image_hash}:{mode}:{force_ocr}"
        if cache_key in self._cache:
            self._cache.move_to_end(cache_key)
        self._cache[cache_key] = {
            "data": data,
            "timestamp": time.time(),
        }

        # Evict oldest if beyond capacity
        if len(self._cache) > self._max_entries:
            oldest_key, _ = self._cache.popitem(last=False)
            logger.debug(f"[CACHE] Capacity reached. Evicted oldest entry: {oldest_key[:20]}")

    def clear(self):
        self._cache.clear()

_analysis_cache_service: Optional[AnalysisCacheService] = None

def get_analysis_cache_service() -> AnalysisCacheService:
    global _analysis_cache_service
    if _analysis_cache_service is None:
        _analysis_cache_service = AnalysisCacheService()
    return _analysis_cache_service
