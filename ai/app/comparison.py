from __future__ import annotations

import base64
import hashlib
import io
from dataclasses import dataclass

import numpy as np
from PIL import Image, ImageFilter, ImageOps, UnidentifiedImageError

from .calibration import detect_marker


WORK_SIZE = 384
MIN_REGISTRATION_SCORE = 0.55
MIN_COMPARABILITY_SCORE = 60


class DuplicateImageError(ValueError):
    pass


class ComparisonImageError(ValueError):
    pass


@dataclass(frozen=True)
class PreparedComparisonImage:
    image: Image.Image
    rgb: np.ndarray
    gray: np.ndarray
    brightness: float
    sharpness: float
    exposure: float
    # Dimensions of the EXIF-oriented photo BEFORE the ImageOps.fit crop to
    # WORK_SIZE below - needed to convert a calibration marker's px-per-mm
    # (measured in this original space) into the working canvas's own
    # px-per-mm, since ImageOps.fit center-crops to a min(width, height)
    # square and then rescales that square to WORK_SIZE.
    original_width: int
    original_height: int


def _data_url(image: Image.Image) -> str:
    payload = io.BytesIO()
    image.save(payload, format="PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(payload.getvalue()).decode("ascii")


def _load_image(payload: bytes) -> PreparedComparisonImage:
    try:
        with Image.open(io.BytesIO(payload)) as source:
            source.verify()
        with Image.open(io.BytesIO(payload)) as source:
            oriented = ImageOps.exif_transpose(source).convert("RGB")
            if oriented.width < 224 or oriented.height < 224:
                raise ComparisonImageError("Ảnh phải có kích thước tối thiểu 224 × 224 px.")
            original_width, original_height = oriented.width, oriented.height
            normalized = ImageOps.fit(
                oriented,
                (WORK_SIZE, WORK_SIZE),
                method=Image.Resampling.LANCZOS,
                centering=(0.5, 0.5),
            )
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ComparisonImageError("Tệp tải lên không phải ảnh hợp lệ.") from exc

    rgb = np.asarray(normalized, dtype=np.float32) / 255.0
    gray = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    laplacian = (
        -4.0 * gray[1:-1, 1:-1]
        + gray[:-2, 1:-1]
        + gray[2:, 1:-1]
        + gray[1:-1, :-2]
        + gray[1:-1, 2:]
    )
    sharpness = float(np.clip(np.var(laplacian) / 0.012, 0.0, 1.0))
    brightness = float(gray.mean())
    clipped = float(np.mean((gray < 0.035) | (gray > 0.965)))
    exposure = float(np.clip(1.0 - clipped * 3.0 - abs(brightness - 0.52) * 1.2, 0.0, 1.0))
    return PreparedComparisonImage(
        normalized, rgb, gray, brightness, sharpness, exposure, original_width, original_height,
    )


def _phase_translation(reference: np.ndarray, moving: np.ndarray) -> tuple[int, int, float]:
    window_y = np.hanning(reference.shape[0])[:, None]
    window_x = np.hanning(reference.shape[1])[None, :]
    reference_fft = np.fft.fft2((reference - reference.mean()) * window_y * window_x)
    moving_fft = np.fft.fft2((moving - moving.mean()) * window_y * window_x)
    cross = reference_fft * np.conj(moving_fft)
    cross /= np.maximum(np.abs(cross), 1e-8)
    correlation = np.abs(np.fft.ifft2(cross))
    peak_y, peak_x = np.unravel_index(np.argmax(correlation), correlation.shape)
    if peak_y > reference.shape[0] // 2:
        peak_y -= reference.shape[0]
    if peak_x > reference.shape[1] // 2:
        peak_x -= reference.shape[1]
    peak_strength = float(correlation.max() / max(correlation.mean(), 1e-8))
    return int(peak_x), int(peak_y), peak_strength


def _shift_rgb(rgb: np.ndarray, dx: int, dy: int) -> tuple[np.ndarray, np.ndarray]:
    height, width = rgb.shape[:2]
    shifted = np.zeros_like(rgb)
    valid = np.zeros((height, width), dtype=bool)
    source_x0 = max(0, -dx)
    source_x1 = min(width, width - dx)
    source_y0 = max(0, -dy)
    source_y1 = min(height, height - dy)
    target_x0 = source_x0 + dx
    target_x1 = source_x1 + dx
    target_y0 = source_y0 + dy
    target_y1 = source_y1 + dy
    if source_x1 > source_x0 and source_y1 > source_y0:
        shifted[target_y0:target_y1, target_x0:target_x1] = rgb[source_y0:source_y1, source_x0:source_x1]
        valid[target_y0:target_y1, target_x0:target_x1] = True
    return shifted, valid


def _correlation(reference: np.ndarray, moving: np.ndarray, valid: np.ndarray) -> float:
    left = reference[valid]
    right = moving[valid]
    if left.size < 1024 or left.std() < 1e-5 or right.std() < 1e-5:
        return 0.0
    return float(np.clip(np.corrcoef(left, right)[0, 1], 0.0, 1.0))


def _majority_filter(mask: np.ndarray, iterations: int = 2) -> np.ndarray:
    current = mask.astype(np.uint8)
    for _ in range(iterations):
        padded = np.pad(current, 1)
        neighbors = sum(
            padded[y:y + current.shape[0], x:x + current.shape[1]]
            for y in range(3)
            for x in range(3)
        )
        current = (neighbors >= 5).astype(np.uint8)
    return current.astype(bool)


def _largest_component(mask: np.ndarray) -> np.ndarray:
    height, width = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    best: list[tuple[int, int]] = []
    center_y, center_x = height / 2, width / 2
    best_score = -1.0
    for start_y, start_x in zip(*np.nonzero(mask & ~visited)):
        if visited[start_y, start_x]:
            continue
        stack = [(int(start_y), int(start_x))]
        visited[start_y, start_x] = True
        points: list[tuple[int, int]] = []
        while stack:
            y, x = stack.pop()
            points.append((y, x))
            for next_y, next_x in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= next_y < height and 0 <= next_x < width and mask[next_y, next_x] and not visited[next_y, next_x]:
                    visited[next_y, next_x] = True
                    stack.append((next_y, next_x))
        if not points:
            continue
        mean_y = sum(point[0] for point in points) / len(points)
        mean_x = sum(point[1] for point in points) / len(points)
        distance = np.hypot(mean_y - center_y, mean_x - center_x) / np.hypot(center_y, center_x)
        score = len(points) * max(0.35, 1.0 - distance)
        if score > best_score:
            best_score = score
            best = points
    result = np.zeros_like(mask, dtype=bool)
    if best:
        rows, columns = zip(*best)
        result[np.asarray(rows), np.asarray(columns)] = True
    return result


def _propose_mask(rgb: np.ndarray, valid: np.ndarray | None = None) -> tuple[np.ndarray | None, float]:
    red_excess = rgb[..., 0] - 0.52 * rgb[..., 1] - 0.48 * rgb[..., 2]
    saturation = rgb.max(axis=2) - rgb.min(axis=2)
    usable = valid if valid is not None else np.ones(red_excess.shape, dtype=bool)
    samples = red_excess[usable]
    if samples.size < 1024:
        return None, 0.0
    threshold = max(
        0.045,
        float(np.percentile(samples, 75)),
        float(np.median(samples) + max(0.025, np.std(samples) * 0.45)),
    )
    candidate = usable & (red_excess >= threshold) & (saturation >= 0.08)
    candidate = _majority_filter(candidate)
    component = _largest_component(candidate)
    area_ratio = float(component.mean())
    if area_ratio < 0.003 or area_ratio > 0.60:
        return None, 0.0
    contrast = float(np.clip((red_excess[component].mean() - np.median(samples)) / 0.18, 0.0, 1.0))
    size_score = float(np.clip(area_ratio / 0.035, 0.0, 1.0))
    return component, round(0.65 * contrast + 0.35 * size_score, 4)


def _working_px_per_mm(px_per_mm_original: float | None, original_width: int, original_height: int) -> float | None:
    """Converts a px-per-mm scale measured on the original photo into the
    equivalent scale inside the WORK_SIZE working canvas produced by
    ImageOps.fit (a center crop to a min(width, height) square, then a
    resize of that square to WORK_SIZE)."""
    if px_per_mm_original is None:
        return None
    crop_side_px = min(original_width, original_height)
    if crop_side_px <= 0:
        return None
    return px_per_mm_original * (WORK_SIZE / crop_side_px)


def _mask_overlay(mask: np.ndarray, color: tuple[int, int, int]) -> Image.Image:
    expanded = Image.fromarray((mask.astype(np.uint8) * 255), mode="L").filter(ImageFilter.MaxFilter(7))
    contracted = Image.fromarray((mask.astype(np.uint8) * 255), mode="L").filter(ImageFilter.MinFilter(5))
    outline = np.asarray(expanded, dtype=np.int16) - np.asarray(contracted, dtype=np.int16)
    rgba = np.zeros((*mask.shape, 4), dtype=np.uint8)
    rgba[mask, :3] = color
    rgba[mask, 3] = 46
    rgba[outline > 0, :3] = color
    rgba[outline > 0, 3] = 235
    return Image.fromarray(rgba, mode="RGBA")


def _difference_map(baseline: np.ndarray, target: np.ndarray) -> Image.Image:
    persistent = baseline & target
    resolved = baseline & ~target
    expanded = target & ~baseline
    rgba = np.zeros((*baseline.shape, 4), dtype=np.uint8)
    rgba[persistent] = (245, 183, 51, 142)
    rgba[resolved] = (39, 174, 96, 190)
    rgba[expanded] = (224, 68, 79, 210)
    return Image.fromarray(rgba, mode="RGBA")


def count_mask_pixels(payload: bytes) -> dict[str, object]:
    """Real pixel-counting for a clinician-supplied mask correction/confirmation
    image. Contract: any pixel with alpha > 0 (RGBA/LA/palette-with-transparency
    sources) is inside the mask; otherwise any pixel with luminance > 127 (no
    alpha channel) is inside the mask. Never fabricates an area — an all-background
    upload is rejected rather than silently reported as a zero-area mask."""
    try:
        with Image.open(io.BytesIO(payload)) as source:
            source.verify()
        with Image.open(io.BytesIO(payload)) as source:
            oriented = ImageOps.exif_transpose(source)
            has_alpha = oriented.mode in ("RGBA", "LA") or (
                oriented.mode == "P" and "transparency" in oriented.info
            )
            if has_alpha:
                alpha = np.asarray(oriented.convert("RGBA"))[..., 3]
                mask = alpha > 0
            else:
                gray = np.asarray(oriented.convert("L"))
                mask = gray > 127
            width, height = oriented.size
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ComparisonImageError("Tệp mask tải lên không phải ảnh hợp lệ.") from exc

    pixel_area = int(mask.sum())
    if pixel_area == 0:
        raise ComparisonImageError(
            "Mask tải lên không chứa vùng tổn thương nào (toàn bộ nền)."
        )
    return {"pixelArea": pixel_area, "width": width, "height": height}


def compare_lesion_images(baseline_bytes: bytes, followup_bytes: bytes) -> dict[str, object]:
    if hashlib.sha256(baseline_bytes).digest() == hashlib.sha256(followup_bytes).digest():
        raise DuplicateImageError(
            "Ảnh theo dõi trùng hoàn toàn với ảnh ban đầu. Vui lòng chọn ảnh được chụp tại thời điểm khác."
        )

    baseline = _load_image(baseline_bytes)
    followup = _load_image(followup_bytes)

    # Marker detection must run on the ORIGINAL bytes, never on `baseline`/
    # `followup` above - those are already cropped/resized to WORK_SIZE,
    # which destroys real-world scale. Each photo self-calibrates from its
    # own in-frame marker, so this works even when the two photos were
    # taken at different distances or angles.
    baseline_calibration = detect_marker(baseline_bytes)
    followup_calibration = detect_marker(followup_bytes)
    baseline_px_per_mm = _working_px_per_mm(
        baseline_calibration.px_per_mm if baseline_calibration else None,
        baseline.original_width, baseline.original_height,
    )
    followup_px_per_mm = _working_px_per_mm(
        followup_calibration.px_per_mm if followup_calibration else None,
        followup.original_width, followup.original_height,
    )

    dx, dy, phase_strength = _phase_translation(baseline.gray, followup.gray)
    excessive_shift = abs(dx) > WORK_SIZE * 0.28 or abs(dy) > WORK_SIZE * 0.28
    aligned_rgb, valid = _shift_rgb(followup.rgb, dx, dy)
    aligned_gray = 0.299 * aligned_rgb[..., 0] + 0.587 * aligned_rgb[..., 1] + 0.114 * aligned_rgb[..., 2]
    registration_score = 0.0 if excessive_shift else _correlation(baseline.gray, aligned_gray, valid)

    lighting_consistency = float(np.clip(1.0 - abs(baseline.brightness - followup.brightness) * 2.8, 0.0, 1.0))
    sharpness_score = min(baseline.sharpness, followup.sharpness)
    exposure_score = min(baseline.exposure, followup.exposure)
    same_region_score = float(np.clip(0.6 * registration_score + 0.4 * lighting_consistency, 0.0, 1.0))

    baseline_mask, baseline_mask_confidence = _propose_mask(baseline.rgb)
    target_mask, target_mask_confidence = _propose_mask(aligned_rgb, valid)
    scale_consistency = 0.0
    if baseline_mask is not None and target_mask is not None:
        baseline_height, baseline_width = np.ptp(np.argwhere(baseline_mask), axis=0) + 1
        target_height, target_width = np.ptp(np.argwhere(target_mask), axis=0) + 1
        scale_ratio = min(
            target_height / max(baseline_height, 1), baseline_height / max(target_height, 1),
            target_width / max(baseline_width, 1), baseline_width / max(target_width, 1),
        )
        scale_consistency = float(np.clip(scale_ratio, 0.0, 1.0))

    comparability = int(round(100 * (
        0.20 * sharpness_score
        + 0.14 * exposure_score
        + 0.18 * lighting_consistency
        + 0.30 * registration_score
        + 0.10 * scale_consistency
        + 0.08 * same_region_score
    )))
    masks_ready = baseline_mask is not None and target_mask is not None
    comparable = (
        comparability >= MIN_COMPARABILITY_SCORE
        and registration_score >= MIN_REGISTRATION_SCORE
        and same_region_score >= 0.52
        and masks_ready
    )

    limitations: list[str] = [
        "Mask là vùng đề xuất bán tự động và phải được bác sĩ xác nhận trước khi dùng làm bằng chứng lâm sàng.",
        "Đăng ký ảnh hiện hỗ trợ hiệu chỉnh tịnh tiến; ảnh khác góc hoặc tỷ lệ đáng kể cần chụp lại.",
    ]
    if baseline_px_per_mm and followup_px_per_mm:
        limitations.append(
            "Diện tích cm² được hiệu chỉnh bằng thẻ chuẩn phát hiện trong từng ảnh; vẫn có sai số nếu thẻ không đặt sát mặt phẳng tổn thương."
        )
    else:
        limitations.append(
            "Diện tích là tương đối theo ảnh đã chuẩn hóa; không phải cm² vì chưa phát hiện được vật chuẩn kích thước trong ảnh."
        )
    quality_reasons: list[str] = []
    if sharpness_score < 0.45:
        quality_reasons.append("Một trong hai ảnh thiếu nét.")
    if lighting_consistency < 0.60:
        quality_reasons.append("Ánh sáng giữa hai lần chụp không đồng nhất.")
    if registration_score < MIN_REGISTRATION_SCORE:
        quality_reasons.append("Không thể căn chỉnh hai ảnh với độ tin cậy đủ dùng.")
    if same_region_score < 0.52:
        quality_reasons.append("Chưa xác nhận được cùng vùng cơ thể hoặc cùng tổn thương.")
    if not masks_ready:
        quality_reasons.append("Không tạo được vùng tổn thương đề xuất ổn định trên cả hai ảnh.")
    if exposure_score < 0.55:
        quality_reasons.append(
            "Một trong hai ảnh bị cháy sáng hoặc thiếu sáng nghiêm trọng, có thể che khuất vùng tổn thương."
        )

    # Physical-area calibration deliberately does NOT require `comparable`:
    # it only needs each photo's own mask + own in-frame marker, neither of
    # which depends on registration between the two photos (a translation
    # shift doesn't change a mask's pixel count, and each marker calibrates
    # its own photo independently). Requiring `comparable` here would let a
    # marker's own strong edges - which can themselves confuse the
    # translation-registration estimate - suppress the very feature meant
    # to make cross-photo comparison more reliable.
    baseline_pixels = int(baseline_mask.sum()) if masks_ready else None
    target_pixels = int(target_mask.sum()) if masks_ready else None
    mask_confidence = (
        round(min(baseline_mask_confidence, target_mask_confidence), 4) if masks_ready else None
    )

    derived_assets: list[dict[str, object]] = []
    metrics: list[dict[str, object]] = []

    # Per-image mask overlays are independent of pair registration: a mask is
    # just a proposed lesion region on ONE photo, computed before the two
    # photos are ever compared to each other. Gating it behind `comparable`
    # (as ALIGNED/DIFFERENCE_MAP correctly are, since those require a valid
    # registration to mean anything) hid real, valid per-image evidence any
    # time registration failed - even though nothing about that evidence
    # depended on registration succeeding.
    if masks_ready:
        derived_assets.extend([
            {"role": "baseline", "type": "MASK", "dataUrl": _data_url(_mask_overlay(baseline_mask, (46, 196, 182))), "width": WORK_SIZE, "height": WORK_SIZE},
            {"role": "followup", "type": "MASK", "dataUrl": _data_url(_mask_overlay(target_mask, (46, 196, 182))), "width": WORK_SIZE, "height": WORK_SIZE},
        ])

    if masks_ready and baseline_px_per_mm and followup_px_per_mm:
        metrics.append({
            "key": "lesion-area-physical-cm2",
            "label": "Diện tích tổn thương (đã hiệu chỉnh bằng vật chuẩn)",
            "category": "MORPHOLOGY",
            "baseline": round(baseline_pixels / (baseline_px_per_mm ** 2) / 100.0, 2),
            "current": round(target_pixels / (followup_px_per_mm ** 2) / 100.0, 2),
            "unit": "cm²",
            "source": "IMAGE_ANALYSIS",
            "confidence": mask_confidence,
            "measurementMethod": "Hiệu chỉnh bằng thẻ đo DermaHealth phát hiện trong ảnh (dermahealth-calibration-card/v1)",
            "missingReason": None,
        })
    else:
        metrics.append({
            "key": "lesion-area-physical-cm2",
            "label": "Diện tích tổn thương (đã hiệu chỉnh bằng vật chuẩn)",
            "category": "MORPHOLOGY",
            "baseline": None,
            "current": None,
            "unit": "cm²",
            "source": "IMAGE_ANALYSIS",
            "confidence": None,
            "measurementMethod": "Hiệu chỉnh bằng thẻ đo DermaHealth phát hiện trong ảnh (dermahealth-calibration-card/v1)",
            "missingReason": (
                "Không tạo được vùng tổn thương đề xuất ổn định trên cả hai ảnh."
                if not masks_ready
                else "Ảnh chưa có thẻ đo DermaHealth nên chưa thể quy đổi sang cm²."
            ),
        })

    assessment = "INDETERMINATE"
    summary = "Chưa đủ bằng chứng hình ảnh để kết luận tiến triển."
    if comparable and baseline_mask is not None and target_mask is not None:
        current_index = round(target_pixels / max(baseline_pixels, 1) * 100.0, 1)
        delta = round(current_index - 100.0, 1)
        confidence = round(min(registration_score, baseline_mask_confidence, target_mask_confidence), 4)
        assessment = "IMPROVING" if delta <= -8 else "WORSENING" if delta >= 8 else "STABLE"
        summary = (
            f"Diện tích tương đối {'giảm' if delta < 0 else 'tăng' if delta > 0 else 'không đổi'} "
            f"{abs(delta):.1f}% so với mốc ban đầu; kết quả đang chờ bác sĩ xác nhận mask."
        )
        metrics.append({
            "key": "lesion-area-index",
            "label": "Diện tích tương đối theo ảnh đã chuẩn hóa",
            "category": "MORPHOLOGY",
            "baseline": 100.0,
            "current": current_index,
            "unit": "%",
            "source": "IMAGE_ANALYSIS",
            "confidence": confidence,
            "measurementMethod": "Đếm pixel trong mask sau đăng ký ảnh; mốc ban đầu = 100%",
            "missingReason": None,
            "baselinePixelArea": baseline_pixels,
            "followupPixelArea": target_pixels,
            "relativeAreaChange": delta,
        })
        aligned_baseline = baseline.image
        aligned_followup = Image.fromarray(np.uint8(np.clip(aligned_rgb, 0, 1) * 255), mode="RGB")
        derived_assets.extend([
            {"role": "baseline", "type": "ALIGNED", "dataUrl": _data_url(aligned_baseline), "width": WORK_SIZE, "height": WORK_SIZE},
            {"role": "followup", "type": "ALIGNED", "dataUrl": _data_url(aligned_followup), "width": WORK_SIZE, "height": WORK_SIZE},
            {"role": "followup", "type": "DIFFERENCE_MAP", "dataUrl": _data_url(_difference_map(baseline_mask, target_mask)), "width": WORK_SIZE, "height": WORK_SIZE},
        ])
    else:
        metrics.append({
            "key": "lesion-area-index",
            "label": "Diện tích tương đối theo ảnh đã chuẩn hóa",
            "category": "MORPHOLOGY",
            "baseline": None,
            "current": None,
            "unit": "%",
            "source": "IMAGE_ANALYSIS",
            "confidence": None,
            "measurementMethod": "Đếm pixel trong mask sau đăng ký ảnh; mốc ban đầu = 100%",
            "missingReason": "Ảnh chưa đủ tương đồng hoặc mask chưa đủ tin cậy để tính diện tích.",
        })

    return {
        "model": "semi-automatic-lesion-progress",
        "modelVersion": "1.0.0",
        "algorithmVersion": "translation-registration-redness-mask-calibration/1.1.0",
        "assessment": assessment,
        "visualChangeSummary": summary,
        "limitations": limitations,
        "quality": {
            "comparabilityScore": comparability,
            "sharpness": round(sharpness_score * 100),
            "lightingConsistency": round(lighting_consistency * 100),
            "angleConsistency": None,
            "scaleConsistency": round(scale_consistency * 100) if masks_ready else None,
            # No real occlusion detector (foreign object / hair / bandage) exists yet.
            # Never derive this from exposure clipping — that is a distinct signal
            # already captured honestly by `exposure_score` and `quality_reasons` above.
            "occlusion": None,
            "registrationQuality": "GOOD" if registration_score >= 0.72 else "FAIR" if registration_score >= MIN_REGISTRATION_SCORE else "POOR",
            "comparisonDisposition": "COMPARABLE" if comparable else "NOT_COMPARABLE",
            "qualityPolicyVersion": "lesion-comparability/1.0.0",
            "qualityReasons": quality_reasons,
            "registration": {"kind": "translation", "dx": dx, "dy": dy, "score": round(registration_score, 4), "phasePeakStrength": round(phase_strength, 3)},
            "likelySameBodyRegion": round(same_region_score, 4),
            "likelySameLesion": round(min(same_region_score, max(baseline_mask_confidence, target_mask_confidence)), 4),
        },
        "derivedAssets": derived_assets,
        "metrics": metrics,
        "newRegionDetected": None,
        "requiresClinicianMaskReview": masks_ready,
    }
