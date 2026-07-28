from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile, status

from .model import InvalidImageError, SkinClassifier
from .settings import settings


classifier: SkinClassifier | None = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    global classifier
    classifier = SkinClassifier(settings)
    yield
    classifier = None


app = FastAPI(
    title="DermaHealth AI Inference",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)


def authorize(x_ai_api_key: Annotated[str | None, Header()] = None) -> None:
    if settings.api_key and x_ai_api_key != settings.api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


@app.get("/health/live")
def live():
    if classifier is None:
        raise HTTPException(status_code=503, detail="Model is not loaded")
    return {"status": "ok", "device": str(classifier.device)}


@app.get("/health/ready")
def ready(_: None = Depends(authorize)):
    if classifier is None:
        raise HTTPException(status_code=503, detail="Model is not loaded")
    return {
        "status": "ready",
        "model": "efficientnet_b0",
        "modelVersion": classifier.model_version,
        "classes": len(classifier.labels),
        "labelsConfigured": classifier.labels_configured,
        "device": str(classifier.device),
    }


@app.post("/v1/analyze")
async def analyze(
    file: Annotated[UploadFile, File()],
    _: None = Depends(authorize),
):
    if classifier is None:
        raise HTTPException(status_code=503, detail="Model is not loaded")
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=415, detail="Only JPEG, PNG and WebP images are accepted")

    payload = await file.read(settings.max_image_bytes + 1)
    if not payload:
        raise HTTPException(status_code=400, detail="Image is empty")
    if len(payload) > settings.max_image_bytes:
        raise HTTPException(status_code=413, detail="Image exceeds the configured size limit")

    try:
        predictions, width, height = classifier.predict(payload)
    except InvalidImageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "model": "efficientnet_b0",
        "modelVersion": classifier.model_version,
        "labelsConfigured": classifier.labels_configured,
        "image": {"width": width, "height": height},
        "predictions": [
            {
                "classIndex": prediction.class_index,
                "label": prediction.label,
                "probability": prediction.probability,
            }
            for prediction in predictions
        ],
        "disclaimer": (
            "Kết quả chỉ dùng để sàng lọc, không thay thế chẩn đoán của bác sĩ."
        ),
    }
