from __future__ import annotations

import base64
import hashlib
import io
import json
import math
import threading
import time
from dataclasses import dataclass
from pathlib import Path

import timm
import torch
import torch.nn.functional as functional
from PIL import Image, ImageFilter, ImageOps, UnidentifiedImageError
from torchvision import transforms
from torchvision.transforms import functional as vision_functional

from .settings import Settings
from .metrics import metrics


EXPECTED_CLASSES = 31
PLACEHOLDER_PREFIX = "class_"
PREPROCESSING_VERSION = "imagenet-eval-224-v1"


class ModelConfigurationError(RuntimeError):
    pass


class InvalidImageError(ValueError):
    pass


@dataclass(frozen=True)
class Prediction:
    class_index: int
    label: str | None
    probability: float


@dataclass(frozen=True)
class PreparedImage:
    display_image: Image.Image
    tensor: torch.Tensor
    width: int
    height: int


@dataclass(frozen=True)
class ImageQuality:
    usable: bool
    score: float
    issues: list[str]


class SkinClassifier:
    def __init__(self, config: Settings):
        self.config = config
        Image.MAX_IMAGE_PIXELS = config.max_image_pixels
        if config.require_cuda and not torch.cuda.is_available():
            raise ModelConfigurationError(
                "CUDA is required but PyTorch cannot access an NVIDIA GPU. "
                "Check the host driver, NVIDIA Container Toolkit and Compose GPU reservation."
            )
        if config.approved_preprocessing_version != PREPROCESSING_VERSION:
            raise ModelConfigurationError(
                "Configured preprocessing version is not approved for this service build."
            )

        self.device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        self._model_lock = threading.Lock()
        torch.set_num_threads(config.torch_threads)

        labels_bytes = config.labels_path.read_bytes()
        self.labels = self._load_labels(config.labels_path)
        self.labels_configured = not any(
            label == f"{PLACEHOLDER_PREFIX}{index:02d}"
            for index, label in enumerate(self.labels)
        )
        self.labels_version = hashlib.sha256(labels_bytes).hexdigest()[:12]
        self.model = timm.create_model(
            "efficientnet_b0", pretrained=False, num_classes=len(self.labels)
        )
        state = torch.load(config.model_path, map_location="cpu", weights_only=True)
        if not isinstance(state, dict):
            raise ModelConfigurationError("Checkpoint must contain a PyTorch state_dict.")
        self.model.load_state_dict(state, strict=True)
        self.model.to(self.device)
        self.model.eval()
        self.model_version = hashlib.sha256(config.model_path.read_bytes()).hexdigest()[:12]
        self.target_layer_name, self.target_layer = self._find_target_convolution()

        self.resize = transforms.Resize(256)
        self.crop = transforms.CenterCrop(224)
        self.normalize = transforms.Normalize(
            mean=(0.485, 0.456, 0.406),
            std=(0.229, 0.224, 0.225),
        )
        self._smoke_test()

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

    def _find_target_convolution(self) -> tuple[str, torch.nn.Module]:
        candidates = [
            (name, module)
            for name, module in self.model.named_modules()
            if isinstance(module, torch.nn.Conv2d)
        ]
        if not candidates:
            raise ModelConfigurationError("No convolution layer is available for Grad-CAM.")
        return candidates[-1]

    def _smoke_test(self) -> None:
        sample = torch.zeros((1, 3, 224, 224), device=self.device)
        with torch.inference_mode():
            output = self.model(sample)
        if output.shape != (1, EXPECTED_CLASSES) or not torch.isfinite(output).all():
            raise ModelConfigurationError("Model startup smoke inference failed.")

    def prepare_image(self, image_bytes: bytes) -> PreparedImage:
        try:
            with Image.open(io.BytesIO(image_bytes)) as source:
                source.verify()
            with Image.open(io.BytesIO(image_bytes)) as source:
                oriented = ImageOps.exif_transpose(source).convert("RGB")
                width, height = oriented.size
                if width * height > self.config.max_image_pixels:
                    raise InvalidImageError(
                        f"Image exceeds the {self.config.max_image_pixels} pixel limit."
                    )
                if width < 32 or height < 32:
                    raise InvalidImageError("Image dimensions must be at least 32x32 pixels.")
                # Reconstructing RGB pixels strips EXIF and other source metadata.
                sanitized = Image.frombytes("RGB", oriented.size, oriented.tobytes())
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
            raise InvalidImageError("The uploaded file is not a valid image.") from exc

        display = self.crop(self.resize(sanitized))
        tensor = self.normalize(vision_functional.to_tensor(display)).unsqueeze(0)
        return PreparedImage(display, tensor.to(self.device), width, height)

    def assess_quality(self, prepared: PreparedImage) -> ImageQuality:
        grayscale = vision_functional.to_tensor(ImageOps.grayscale(prepared.display_image))
        brightness = float(grayscale.mean())
        laplace_kernel = torch.tensor(
            [[0.0, 1.0, 0.0], [1.0, -4.0, 1.0], [0.0, 1.0, 0.0]]
        ).reshape(1, 1, 3, 3)
        blur_variance = float(functional.conv2d(grayscale.unsqueeze(0), laplace_kernel).var())
        issues: list[str] = []
        if brightness < self.config.min_brightness:
            issues.append("too_dark")
        if brightness > self.config.max_brightness:
            issues.append("overexposed")
        if blur_variance < self.config.min_blur_variance:
            issues.append("blurry")
        if min(prepared.width, prepared.height) < 224:
            issues.append("low_resolution")

        brightness_score = max(0.0, 1.0 - abs(brightness - 0.53) / 0.53)
        sharpness_score = min(1.0, blur_variance / (self.config.min_blur_variance * 4))
        resolution_score = min(1.0, min(prepared.width, prepared.height) / 512)
        score = round(
            0.35 * brightness_score + 0.45 * sharpness_score + 0.20 * resolution_score, 4
        )
        return ImageQuality(score >= self.config.quality_min_score and not issues, score, issues)

    def predict_prepared(self, prepared: PreparedImage) -> list[Prediction]:
        with torch.inference_mode():
            probabilities = torch.softmax(self.model(prepared.tensor), dim=1)[0]
        if not torch.isfinite(probabilities).all():
            raise ModelConfigurationError("Model output contains NaN or Infinity.")
        count = min(self.config.top_k, len(self.labels))
        values, indices = probabilities.topk(count)
        return [
            Prediction(
                class_index=index,
                label=self.labels[index] if self.labels_configured else None,
                probability=round(float(value), 6),
            )
            for value, index in zip(values.cpu().tolist(), indices.cpu().tolist())
        ]

    def generate_grad_cam(
        self, prepared: PreparedImage, target_class_index: int
    ) -> dict[str, object]:
        activation: torch.Tensor | None = None
        gradient: torch.Tensor | None = None

        def capture_activation(_module, _inputs, output):
            nonlocal activation
            activation = output

        def capture_gradient(_module, _grad_input, grad_output):
            nonlocal gradient
            gradient = grad_output[0]

        forward_handle = self.target_layer.register_forward_hook(capture_activation)
        backward_handle = self.target_layer.register_full_backward_hook(capture_gradient)
        try:
            self.model.zero_grad(set_to_none=True)
            logits = self.model(prepared.tensor)
            logits[0, target_class_index].backward()
            if activation is None or gradient is None:
                raise ModelConfigurationError("Grad-CAM hooks did not capture model tensors.")
            weights = gradient.detach().mean(dim=(2, 3), keepdim=True)
            heatmap = torch.relu((weights * activation.detach()).sum(dim=1, keepdim=True))
            heatmap = functional.interpolate(
                heatmap, size=(224, 224), mode="bilinear", align_corners=False
            )[0, 0]
            maximum = float(heatmap.max())
            if not math.isfinite(maximum):
                raise ModelConfigurationError("Grad-CAM output contains NaN or Infinity.")
            heatmap = heatmap / maximum if maximum > 1e-12 else torch.zeros_like(heatmap)
            data_url = self._overlay_data_url(prepared.display_image, heatmap.cpu())
            return {
                "method": "grad_cam",
                "targetLayer": self.target_layer_name,
                "targetClassIndex": target_class_index,
                "width": 224,
                "height": 224,
                "mimeType": "image/png",
                "dataUrl": data_url,
                "allZero": maximum <= 1e-12,
            }
        finally:
            forward_handle.remove()
            backward_handle.remove()
            self.model.zero_grad(set_to_none=True)
            if self.device.type == "cuda":
                torch.cuda.empty_cache()

    @staticmethod
    def _overlay_data_url(image: Image.Image, heatmap: torch.Tensor) -> str:
        heat = Image.fromarray((heatmap.numpy() * 255).astype("uint8"), mode="L")
        # A compact blue->yellow->red map implemented without a heavy OpenCV dependency.
        red = heat.point(lambda value: min(255, value * 2))
        green = heat.point(lambda value: max(0, 255 - abs(value - 128) * 2))
        blue = heat.point(lambda value: max(0, 255 - value * 2))
        colored = Image.merge("RGB", (red, green, blue))
        overlay = Image.blend(image.convert("RGB"), colored, alpha=0.42)
        output = io.BytesIO()
        overlay.save(output, format="PNG", optimize=True)
        return "data:image/png;base64," + base64.b64encode(output.getvalue()).decode("ascii")

    def analyze_image(self, image_bytes: bytes, role: str) -> dict[str, object]:
        started = time.monotonic()
        prepared = self.prepare_image(image_bytes)
        quality = self.assess_quality(prepared)
        metrics.observe_stage("prepare_and_quality", time.monotonic() - started)
        started = time.monotonic()
        predictions = self.predict_prepared(prepared)
        metrics.observe_stage("inference", time.monotonic() - started)
        started = time.monotonic()
        heatmap = self.generate_grad_cam(prepared, predictions[0].class_index)
        metrics.observe_stage("grad_cam", time.monotonic() - started)
        original_output = io.BytesIO()
        prepared.display_image.save(original_output, format="JPEG", quality=88, optimize=True)
        sanitized_original = (
            "data:image/jpeg;base64,"
            + base64.b64encode(original_output.getvalue()).decode("ascii")
        )
        return {
            "role": role,
            "width": prepared.width,
            "height": prepared.height,
            "quality": {
                "usable": quality.usable,
                "score": quality.score,
                "issues": quality.issues,
            },
            "original": {
                "width": 224,
                "height": 224,
                "mimeType": "image/jpeg",
                "dataUrl": sanitized_original,
            },
            "predictions": [
                {
                    "classIndex": prediction.class_index,
                    **({"label": prediction.label} if prediction.label is not None else {}),
                    "probability": prediction.probability,
                }
                for prediction in predictions
            ],
            "heatmap": heatmap,
        }

    def analyze_images(self, images: list[tuple[str, bytes]]) -> list[dict[str, object]]:
        # Hooks and backward passes share a single model instance; serialize cases to
        # prevent cross-request activation/gradient corruption.
        with self._model_lock:
            results: list[dict[str, object]] = []
            for role, payload in images:
                try:
                    results.append(self.analyze_image(payload, role))
                except (InvalidImageError, ModelConfigurationError) as exc:
                    issue = (
                        "invalid_image"
                        if isinstance(exc, InvalidImageError)
                        else "model_output_invalid"
                    )
                    results.append(
                        {
                            "role": role,
                            "width": 0,
                            "height": 0,
                            "quality": {
                                "usable": False,
                                "score": 0.0,
                                "issues": [issue],
                            },
                            "original": None,
                            "predictions": [],
                            "heatmap": None,
                        }
                    )
            return results

    def predict(self, image_bytes: bytes) -> tuple[list[Prediction], int, int]:
        prepared = self.prepare_image(image_bytes)
        with self._model_lock:
            predictions = self.predict_prepared(prepared)
        return predictions, prepared.width, prepared.height
