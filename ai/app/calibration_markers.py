from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class MarkerSpec:
    """One physical calibration marker CareFollow has printed/issued.

    Detection (calibration.py) looks up whatever ArUco id it finds here; an
    id that is not registered is treated the same as "no marker" - it is
    never assumed to be any particular size. Adding a new printed batch or
    size later (e.g. a smaller at-home sticker) is just a new entry here;
    it requires no change to the detection algorithm itself.

    The same entries drive scripts/generate_marker_template.py, so the
    printed artifact and the detector can never disagree about size.
    """

    marker_id: int
    physical_size_mm: float
    label: str
    batch: str


MARKER_DICTIONARY_NAME = "DICT_4X4_50"

MARKER_REGISTRY: dict[int, MarkerSpec] = {
    0: MarkerSpec(
        marker_id=0,
        physical_size_mm=20.0,
        label="CareFollow calibration card v1 (20mm)",
        batch="bootstrap",
    ),
}
