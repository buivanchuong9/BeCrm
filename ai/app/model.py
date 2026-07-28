from __future__ import annotations

import hashlib
import io
import json
from dataclasses import dataclass
from pathlib import Path

import timm
import torch
from PIL import Image, ImageOps, UnidentifiedImageError
from torchvision import transforms

from .settings import Settings


EXPECTED_CLASSES = 31
PLACEHOLDER_PREFIX = "class_"


class ModelConfigurationError(RuntimeError):
    pass


class InvalidImageError(ValueError):
    pass


@dataclass(frozen=True)
class Prediction:
    class_index: int
    label: str
    probability: float


class SkinClassifier:
    def __init__(self, config: Settings):
        self.config = config
        Image.MAX_IMAGE_PIXELS = config.max_image_pixels
        if config.require_cuda and not torch.cuda.is_available():
            raise ModelConfigurationError(
                "CUDA is required but PyTorch cannot access an NVIDIA GPU. "
                "Check the host driver, NVIDIA Container Toolkit and Compose GPU reservation."
            )
        self.device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        torch.set_num_threads(config.torch_threads)

        self.labels = self._load_labels(config.labels_path)
        self.labels_configured = not any(
            label == f"{PLACEHOLDER_PREFIX}{index:02d}"
            for index, label in enumerate(self.labels)
        )
        self.model = timm.create_model(
            "efficientnet_b0", pretrained=False, num_classes=len(self.labels)
        )
        state = torch.load(config.model_path, map_location="cpu", weights_only=True)
        if not isinstance(state, dict):
            raise ModelConfigurationError("Checkpoint must contain a PyTorch state_dict.")
        self.model.load_state_dict(state, strict=True)
        self.model.to(self.device)
        self.model.eval()
        if self.device.type == "cuda":
            # Fail during startup instead of on the first clinical request.
            torch.empty(1, device=self.device)
        self.model_version = hashlib.sha256(config.model_path.read_bytes()).hexdigest()[:12]

        # These are the standard ImageNet/timm EfficientNet-B0 evaluation transforms.
        # They MUST be changed if training used different resize or normalization values.
        self.transform = transforms.Compose(
            [
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=(0.485, 0.456, 0.406),
                    std=(0.229, 0.224, 0.225),
                ),
            ]
        )

    @staticmethod
    def _load_labels(path: Path) -> list[str]:
        try:
            labels = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise ModelConfigurationError(f"Cannot read labels file: {path}") from exc
        if (
            not isinstance(labels, list)
            or len(labels) != EXPECTED_CLASSES
            or not all(isinstance(label, str) and label.strip() for label in labels)
            or len(set(labels)) != len(labels)
        ):
            raise ModelConfigurationError(
                f"labels.json must contain exactly {EXPECTED_CLASSES} unique, non-empty strings."
            )
        return labels

    def predict(self, image_bytes: bytes) -> tuple[list[Prediction], int, int]:
        try:
            with Image.open(io.BytesIO(image_bytes)) as source:
                source.verify()
            with Image.open(io.BytesIO(image_bytes)) as source:
                image = ImageOps.exif_transpose(source).convert("RGB")
                width, height = image.size
                if width < 32 or height < 32:
                    raise InvalidImageError("Image dimensions must be at least 32x32 pixels.")
                tensor = self.transform(image).unsqueeze(0).to(self.device)
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
            raise InvalidImageError("The uploaded file is not a valid image.") from exc

        with torch.inference_mode():
            probabilities = torch.softmax(self.model(tensor), dim=1)[0]
            count = min(self.config.top_k, len(self.labels))
            values, indices = probabilities.topk(count)

        predictions = [
            Prediction(
                class_index=index,
                label=self.labels[index],
                probability=round(float(value), 6),
            )
            for value, index in zip(values.cpu().tolist(), indices.cpu().tolist())
        ]
        return predictions, width, height
