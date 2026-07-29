from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .settings import Settings


TRIAGE_TERMS = {
    "breathing_difficulty": ("emergency", "Khó thở hoặc dấu hiệu phản ứng toàn thân"),
    "systemic_reaction": ("emergency", "Có phản ứng toàn thân"),
    "severe_pain": ("urgent", "Đau dữ dội"),
    "bleeding": ("urgent", "Tổn thương chảy máu"),
    "fever": ("urgent", "Có sốt"),
    "rapid_spreading": ("urgent", "Tổn thương lan nhanh"),
}


@dataclass(frozen=True)
class CaseContext:
    body_region: str
    duration_days: int | None
    symptoms: list[str]
    note: str | None = None

    def model_text(self) -> str:
        parts = [f"Vùng cơ thể: {self.body_region}."]
        if self.duration_days is not None:
            parts.append(f"Thời gian xuất hiện: {self.duration_days} ngày.")
        if self.symptoms:
            parts.append(f"Triệu chứng: {', '.join(self.symptoms)}.")
        if self.note:
            parts.append(f"Mô tả: {self.note}.")
        return " ".join(parts)


def aggregate_case(
    images: list[dict[str, Any]],
    context: CaseContext,
    labels_configured: bool,
    config: Settings,
) -> tuple[str, dict[str, Any]]:
    reasons: list[str] = []
    closeup = next((image for image in images if image["role"] == "closeup"), None)
    usable = [image for image in images if image["quality"]["usable"]]

    if not labels_configured:
        reasons.append("labels_not_configured")
    if closeup is None or not closeup["quality"]["usable"]:
        reasons.append("closeup_not_usable")

    primary = closeup if closeup and closeup["quality"]["usable"] else None
    if primary:
        predictions = primary["predictions"]
        if not predictions or predictions[0]["probability"] < config.min_top_probability:
            reasons.append("low_top_probability")
        if len(predictions) > 1:
            margin = predictions[0]["probability"] - predictions[1]["probability"]
            if margin < config.min_probability_margin:
                reasons.append("low_probability_margin")

    conflicting: list[str] = []
    agreement = 0.0
    if primary and usable:
        primary_class = primary["predictions"][0]["classIndex"]
        agreeing = 0
        for image in usable:
            if image["predictions"][0]["classIndex"] == primary_class:
                agreeing += 1
            else:
                conflicting.append(image["role"])
        agreement = round(agreeing / len(usable), 4)
        if conflicting:
            reasons.append("multi_image_conflict")

    abstained = bool(reasons)
    aggregate_predictions = (
        primary["predictions"] if primary and labels_configured and not abstained else []
    )
    invalid_optional = [
        image["role"]
        for image in images
        if image["role"] != "closeup" and not image["quality"]["usable"]
    ]
    if abstained:
        status = "abstained"
    elif conflicting or invalid_optional:
        status = "partial"
    else:
        status = "completed"

    return status, {
        "predictions": aggregate_predictions,
        "agreement": agreement,
        "conflictingImages": conflicting,
        "abstained": abstained,
        "abstainReasons": reasons,
        "aggregationMethod": "closeup_primary_heuristic_v1",
        "validationStatus": "not_clinically_validated",
    }


def triage(context: CaseContext) -> dict[str, Any]:
    detected: list[tuple[str, str]] = []
    symptoms = set(context.symptoms)
    for symptom, rule in TRIAGE_TERMS.items():
        if symptom in symptoms:
            detected.append(rule)
    if context.body_region.lower() in {"eye", "eyes", "periocular", "vùng mắt", "mat"}:
        detected.append(("urgent", "Tổn thương ở vùng mắt"))

    rank = {"routine": 0, "soon": 1, "urgent": 2, "emergency": 3}
    level = max((item[0] for item in detected), key=rank.get, default="routine")
    return {
        "level": level,
        "reasons": [reason for _, reason in detected],
        "basis": "clinical_context_rules_v1",
    }
