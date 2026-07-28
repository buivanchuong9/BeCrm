from dataclasses import dataclass
from pathlib import Path
import os


AI_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Settings:
    model_path: Path = Path(
        os.getenv("AI_MODEL_PATH", AI_ROOT / "model" / "best_efficientnet_b0.pth")
    )
    labels_path: Path = Path(os.getenv("AI_LABELS_PATH", AI_ROOT / "model" / "labels.json"))
    api_key: str = os.getenv("AI_INTERNAL_API_KEY", "")
    max_image_bytes: int = int(os.getenv("AI_MAX_IMAGE_BYTES", str(10 * 1024 * 1024)))
    max_image_pixels: int = int(os.getenv("AI_MAX_IMAGE_PIXELS", "25000000"))
    top_k: int = int(os.getenv("AI_TOP_K", "5"))
    torch_threads: int = int(os.getenv("AI_TORCH_THREADS", "2"))
    require_cuda: bool = os.getenv("AI_REQUIRE_CUDA", "true").lower() == "true"


settings = Settings()
