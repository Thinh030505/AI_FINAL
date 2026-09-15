import os
import gc
import logging
from typing import Dict, Any, Optional
import psutil
import torch

logger = logging.getLogger("ai-service.gpu_manager")

class GPUModelManager:
    """
    Manages GPU memory (VRAM) and CPU RAM allocations for Deep Multimodal Models.
    Tailored for NVIDIA RTX 4050 6GB Laptop GPU & multi-threaded CPU environments.
    - Pins fast core models in memory.
    - Lazy-loads heavy open-vocabulary/segmentation models.
    - Automatically cleans caches on memory pressure.
    """
    _instance: Optional["GPUModelManager"] = None

    def __init__(self):
        self.has_cuda = torch.cuda.is_available()
        self.device_name = torch.cuda.get_device_name(0) if self.has_cuda else "CPU"
        self.device = "cuda:0" if self.has_cuda else "cpu"
        self._loaded_models: Dict[str, Any] = {}
        self._pinned_models = {"yolo11n", "yolo11n_pose", "segformer"}
        logger.info(f"[GPUModelManager] Initialized on device: {self.device} ({self.device_name})")

    @classmethod
    def get_instance(cls) -> "GPUModelManager":
        if cls._instance is None:
            cls._instance = GPUModelManager()
        return cls._instance

    def get_device(self) -> str:
        return self.device

    def get_memory_stats(self) -> Dict[str, Any]:
        """
        Returns active VRAM and RAM telemetry.
        """
        ram_info = psutil.virtual_memory()
        stats = {
            "device": self.device,
            "deviceName": self.device_name,
            "hasCuda": self.has_cuda,
            "ramTotalMb": round(ram_info.total / (1024 * 1024), 1),
            "ramAvailableMb": round(ram_info.available / (1024 * 1024), 1),
            "ramPercent": ram_info.percent,
            "vramAllocatedMb": 0.0,
            "vramReservedMb": 0.0,
            "vramFreeMb": 0.0,
            "vramTotalMb": 0.0,
        }

        if self.has_cuda:
            try:
                free_bytes, total_bytes = torch.cuda.mem_get_info()
                stats["vramFreeMb"] = round(free_bytes / (1024 * 1024), 1)
                stats["vramTotalMb"] = round(total_bytes / (1024 * 1024), 1)
                stats["vramAllocatedMb"] = round(torch.cuda.memory_allocated() / (1024 * 1024), 1)
                stats["vramReservedMb"] = round(torch.cuda.memory_reserved() / (1024 * 1024), 1)
            except Exception as e:
                logger.warning(f"[GPUModelManager] Could not read VRAM stats: {e}")

        return stats

    def register_model(self, model_key: str, model_instance: Any, is_pinned: bool = False):
        self._loaded_models[model_key] = model_instance
        if is_pinned:
            self._pinned_models.add(model_key)
        logger.info(f"[GPUModelManager] Registered model '{model_key}' (pinned={is_pinned})")

    def get_model(self, model_key: str) -> Optional[Any]:
        return self._loaded_models.get(model_key)

    def unload_unpinned_models(self):
        """
        Frees unpinned heavy models from VRAM when running memory-conservative tasks.
        """
        to_unload = [k for k in self._loaded_models.keys() if k not in self._pinned_models]
        for k in to_unload:
            del self._loaded_models[k]
            logger.info(f"[GPUModelManager] Unloaded unpinned model: {k}")

        gc.collect()
        if self.has_cuda:
            torch.cuda.empty_cache()

def get_gpu_manager() -> GPUModelManager:
    return GPUModelManager.get_instance()
