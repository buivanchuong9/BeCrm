import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import json
from typing import Annotated
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Response, UploadFile, status
from starlette.concurrency import run_in_threadpool

from .case_analysis import CaseContext, aggregate_case, triage
from .comparison import (
    ComparisonImageError,
    DuplicateImageError,
    compare_lesion_images,
    count_mask_pixels,
)
from .model import InvalidImageError, SkinClassifier
from .metrics import metrics, monotonic
from .settings import settings


classifier: SkinClassifier | None = None
case_semaphore = asyncio.Semaphore(settings.max_concurrent_cases)


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
        "model": classifier.model_name,
        "modelVersion": classifier.model_version,
        "classes": len(classifier.labels),
        "labelsConfigured": classifier.labels_configured,
        "device": str(classifier.device),
    }


@app.get("/metrics", response_class=Response)
def prometheus_metrics(_: None = Depends(authorize)):
    return Response(metrics.render(), media_type="text/plain; version=0.0.4")


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
        "model": classifier.model_name,
        "modelVersion": classifier.model_version,
        "labelsConfigured": classifier.labels_configured,
        "image": {"width": width, "height": height},
        "predictions": [
            {
                "classIndex": prediction.class_index,
                **({"label": prediction.label} if prediction.label is not None else {}),
                "probability": prediction.probability,
            }
            for prediction in predictions
        ],
        "disclaimer": (
            "Kết quả chỉ dùng để sàng lọc, không thay thế chẩn đoán của bác sĩ."
        ),
    }


async def read_image(file: UploadFile, role: str) -> tuple[str, bytes]:
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(
            status_code=415, detail=f"{role}: only JPEG, PNG and WebP images are accepted"
        )
    payload = await file.read(settings.max_image_bytes + 1)
    if not payload:
        raise HTTPException(status_code=400, detail=f"{role}: image is empty")
    if len(payload) > settings.max_image_bytes:
        raise HTTPException(status_code=413, detail=f"{role}: image exceeds size limit")
    return role, payload


@app.post("/v1/compare-lesion")
async def compare_lesion(
    baseline: Annotated[UploadFile, File()],
    followup: Annotated[UploadFile, File()],
    body_region: Annotated[str, Form(alias="bodyRegion")],
    _: None = Depends(authorize),
):
    if not body_region.strip() or len(body_region) > 100:
        raise HTTPException(status_code=400, detail="bodyRegion is required and too long")
    _, baseline_payload = await read_image(baseline, "baseline")
    _, followup_payload = await read_image(followup, "followup")
    try:
        async with case_semaphore:
            return await run_in_threadpool(
                compare_lesion_images,
                baseline_payload,
                followup_payload,
            )
    except DuplicateImageError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ComparisonImageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/v1/mask-pixel-count")
async def mask_pixel_count(
    file: Annotated[UploadFile, File()],
    _: None = Depends(authorize),
):
    _, payload = await read_image(file, "mask")
    try:
        return await run_in_threadpool(count_mask_pixels, payload)
    except ComparisonImageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/v1/analyze-case")
async def analyze_case(
    closeup: Annotated[UploadFile, File()],
    body_region: Annotated[str, Form(alias="bodyRegion")],
    overview: Annotated[UploadFile | None, File()] = None,
    alternate: Annotated[UploadFile | None, File()] = None,
    duration_days: Annotated[int | None, Form(alias="durationDays")] = None,
    symptoms_json: Annotated[str | None, Form(alias="symptoms")] = None,
    note: Annotated[str | None, Form()] = None,
    request_id: Annotated[str | None, Header(alias="X-Request-Id")] = None,
    _: None = Depends(authorize),
):
    if classifier is None:
        raise HTTPException(status_code=503, detail="Model is not loaded")
    if not body_region.strip() or len(body_region) > 100:
        raise HTTPException(status_code=400, detail="bodyRegion is required and too long")
    if duration_days is not None and (duration_days < 0 or duration_days > 36500):
        raise HTTPException(status_code=400, detail="durationDays is outside the accepted range")
    if note is not None and len(note.strip()) > 500:
        raise HTTPException(status_code=400, detail="note exceeds 500 characters")
    try:
        symptoms = json.loads(symptoms_json) if symptoms_json else []
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="symptoms must be a JSON string array") from exc
    if (
        not isinstance(symptoms, list)
        or len(symptoms) > 30
        or not all(isinstance(item, str) and 0 < len(item) <= 100 for item in symptoms)
    ):
        raise HTTPException(status_code=400, detail="symptoms must be a JSON string array")

    files: list[tuple[str, bytes]] = [await read_image(closeup, "closeup")]
    if overview is not None:
        files.insert(0, await read_image(overview, "overview"))
    if alternate is not None:
        files.append(await read_image(alternate, "alternate"))

    context = CaseContext(
        body_region.strip(),
        duration_days,
        symptoms,
        note.strip() if note else None,
    )
    started_at = monotonic()
    try:
        async with case_semaphore:
            results = await run_in_threadpool(
                classifier.analyze_images, files, context.model_text()
            )
    except InvalidImageError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    case_status, aggregate = aggregate_case(
        results, context, classifier.labels_configured, settings
    )
    metrics.observe_case(
        case_status,
        monotonic() - started_at,
        sum(not image["quality"]["usable"] for image in results),
        bool(aggregate["conflictingImages"]),
    )
    return {
        "caseId": str(uuid4()),
        "status": case_status,
        "model": classifier.model_name,
        "modelVersion": classifier.model_version,
        "device": str(classifier.device),
        "labelsVersion": classifier.labels_version,
        "calibrationVersion": None,
        "preprocessingVersion": classifier.config.approved_preprocessing_version,
        "labelsConfigured": classifier.labels_configured,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "requestId": request_id,
        "images": results,
        "aggregate": aggregate,
        "triage": triage(context),
        "disclaimer": "Kết quả hỗ trợ sàng lọc, không thay thế chẩn đoán của bác sĩ.",
    }
