from __future__ import annotations

import io
from dataclasses import dataclass

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

from .calibration_markers import MARKER_DICTIONARY_NAME, MARKER_REGISTRY

try:
    import cv2
except ImportError:  # pragma: no cover - opencv is a hard dependency in production
    cv2 = None


@dataclass(frozen=True)
class CalibrationResult:
    marker_id: int
    px_per_mm: float
    physical_size_mm: float
    label: str


def _aruco_detector() -> "cv2.aruco.ArucoDetector":
    dictionary = cv2.aruco.getPredefinedDictionary(getattr(cv2.aruco, MARKER_DICTIONARY_NAME))
    return cv2.aruco.ArucoDetector(dictionary, cv2.aruco.DetectorParameters())


def detect_marker(image_bytes: bytes) -> CalibrationResult | None:
    """Detects a registered CareFollow calibration marker in the ORIGINAL
    (un-resized, EXIF-oriented) photo and returns its pixel-per-mm scale in
    that original image's own pixel space.

    Must be called on the original photo bytes, before any resize/crop
    (comparison.py's WORK_SIZE canvas) - once an image is resized, real
    physical scale can no longer be recovered from it.

    Never fabricates a size: returns None if opencv is unavailable, the
    photo can't be decoded, no marker is found, or the marker(s) found
    aren't in MARKER_REGISTRY (an unrecognized marker is not assumed to be
    any particular size). If multiple registered markers are found, the
    one with the largest apparent size is used, since a bigger apparent
    marker generally means a clearer, less distorted detection.
    """
    if cv2 is None:
        return None
    try:
        with Image.open(io.BytesIO(image_bytes)) as source:
            oriented = ImageOps.exif_transpose(source).convert("L")
            gray = np.asarray(oriented)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        return None

    corners, ids, _ = _aruco_detector().detectMarkers(gray)
    if ids is None or len(ids) == 0:
        return None

    candidates: list[tuple[float, int]] = []
    for marker_corners, marker_id in zip(corners, ids.flatten()):
        spec = MARKER_REGISTRY.get(int(marker_id))
        if spec is None:
            continue
        points = marker_corners.reshape(4, 2)
        side_px = float(np.mean(np.linalg.norm(points - np.roll(points, -1, axis=0), axis=1)))
        if side_px <= 0:
            continue
        candidates.append((side_px, spec.marker_id))

    if not candidates:
        return None

    side_px, marker_id = max(candidates, key=lambda item: item[0])
    spec = MARKER_REGISTRY[marker_id]
    return CalibrationResult(
        marker_id=spec.marker_id,
        px_per_mm=side_px / spec.physical_size_mm,
        physical_size_mm=spec.physical_size_mm,
        label=spec.label,
    )
