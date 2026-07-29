from dataclasses import dataclass
from pathlib import Path
import os


AI_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Settings:
    model_path: Path = Path(
        os.getenv("AI_MODEL_PATH", AI_ROOT / "model" / "train_combine_ensemble.pth")
    )
    labels_path: Path = Path(os.getenv("AI_LABELS_PATH", AI_ROOT / "model" / "labels.json"))
    tokenizer_path: Path = Path(
        os.getenv("AI_TOKENIZER_PATH", AI_ROOT / "model" / "phobert-tokenizer")
    )
    api_key: str = os.getenv("AI_INTERNAL_API_KEY", "")
    max_image_bytes: int = int(os.getenv("AI_MAX_IMAGE_BYTES", str(10 * 1024 * 1024)))
    max_image_pixels: int = int(os.getenv("AI_MAX_IMAGE_PIXELS", "25000000"))
    top_k: int = int(os.getenv("AI_TOP_K", "3"))
    text_max_length: int = int(os.getenv("AI_TEXT_MAX_LENGTH", "128"))
    torch_threads: int = int(os.getenv("AI_TORCH_THREADS", "2"))
    require_cuda: bool = os.getenv("AI_REQUIRE_CUDA", "true").lower() == "true"
    max_concurrent_cases: int = int(os.getenv("AI_MAX_CONCURRENT_CASES", "1"))
    quality_min_score: float = float(os.getenv("AI_QUALITY_MIN_SCORE", "0.55"))
    min_top_probability: float = float(os.getenv("AI_MIN_TOP_PROBABILITY", "0.60"))
    min_probability_margin: float = float(os.getenv("AI_MIN_PROBABILITY_MARGIN", "0.15"))
    min_brightness: float = float(os.getenv("AI_MIN_BRIGHTNESS", "0.12"))
    max_brightness: float = float(os.getenv("AI_MAX_BRIGHTNESS", "0.95"))
    min_blur_variance: float = float(os.getenv("AI_MIN_BLUR_VARIANCE", "0.001"))
    approved_preprocessing_version: str = os.getenv(
        "AI_APPROVED_PREPROCESSING_VERSION", "imagenet-phobert-eval-224-v1"
    )


settings = Settings()
