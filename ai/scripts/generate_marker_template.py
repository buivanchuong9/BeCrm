"""Generates a print-ready SVG for a DermaHealth calibration card.

Renders the marker as vector rectangles (not a rasterized/embedded PNG) so
print quality doesn't degrade at high DPI, and sizes the SVG in real
physical millimeters straight from MARKER_REGISTRY. Printed at "actual
size" / 100% scale (NOT "fit to page" or "shrink to fit"), the printed card
reproduces exactly the physical_size_mm that app/calibration.py assumes -
the printed artifact and the detector can never disagree about size,
because both read from the same registry entry.

The card also prints a 20mm tick-marked ruler next to the marker, so a
patient/clinic can self-check the print came out at true size with a
household ruler before ever using the card for a real measurement - this
is the one thing the app itself cannot verify after the fact.

Usage:
    python -m scripts.generate_marker_template [marker_id] [output_path]

Run from be/ai/. Defaults to marker_id=0 (the bootstrap 20mm card) and
writes calibration_marker_<id>.svg in the current directory.
"""
from __future__ import annotations

import sys
from pathlib import Path

import cv2

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.calibration_markers import MARKER_DICTIONARY_NAME, MARKER_REGISTRY  # noqa: E402

# White margin around the marker's own border - ArUco detection needs a
# quiet zone with no other dark content around the marker to find it reliably.
QUIET_ZONE_MM = 8.0
BORDER_BITS = 1
RULER_LENGTH_MM = 20.0
RULER_TICK_STEP_MM = 5.0

INSTRUCTIONS = [
    "In ở đúng 100% (KHÔNG chọn \"Vừa trang\"/\"Fit to page\") - kiểm tra lại bằng thước ở dưới.",
    "Đặt thẻ nằm cạnh tổn thương, cùng mặt phẳng với vùng da khi chụp.",
    "Không thu nhỏ, phóng to, cắt, gấp hoặc che khuất thẻ.",
]


def _ruler_svg(x0_mm: float, y0_mm: float) -> str:
    parts = [f'<line x1="{x0_mm}mm" y1="{y0_mm}mm" x2="{x0_mm + RULER_LENGTH_MM}mm" y2="{y0_mm}mm" stroke="black" stroke-width="0.3"/>']
    ticks = int(RULER_LENGTH_MM / RULER_TICK_STEP_MM) + 1
    for i in range(ticks):
        mm = i * RULER_TICK_STEP_MM
        x = x0_mm + mm
        parts.append(f'<line x1="{x}mm" y1="{y0_mm}mm" x2="{x}mm" y2="{y0_mm - 2.5}mm" stroke="black" stroke-width="0.3"/>')
        parts.append(
            f'<text x="{x}mm" y="{y0_mm + 4}mm" font-size="2.2" font-family="sans-serif" '
            f'text-anchor="middle">{int(mm)}</text>'
        )
    parts.append(
        f'<text x="{x0_mm + RULER_LENGTH_MM / 2}mm" y="{y0_mm - 4}mm" font-size="2.4" '
        f'font-family="sans-serif" text-anchor="middle" font-weight="bold">Thước kiểm tra tỉ lệ in (mm)</text>'
    )
    return "".join(parts)


def generate_svg(marker_id: int) -> str:
    spec = MARKER_REGISTRY.get(marker_id)
    if spec is None:
        raise ValueError(
            f"marker_id {marker_id} is not in MARKER_REGISTRY - register it in "
            "app/calibration_markers.py before generating a template for it."
        )

    dictionary = cv2.aruco.getPredefinedDictionary(getattr(cv2.aruco, MARKER_DICTIONARY_NAME))
    bits_per_side = dictionary.markerSize + 2 * BORDER_BITS
    bitmap = cv2.aruco.generateImageMarker(dictionary, marker_id, bits_per_side, borderBits=BORDER_BITS)

    cell_mm = spec.physical_size_mm / bits_per_side
    marker_origin_mm = QUIET_ZONE_MM
    page_width_mm = max(spec.physical_size_mm + 2 * QUIET_ZONE_MM, RULER_LENGTH_MM + 2 * QUIET_ZONE_MM)
    ruler_band_mm = 16.0
    instructions_band_mm = 5.0 * len(INSTRUCTIONS) + 3.0
    marker_band_mm = spec.physical_size_mm + 2 * QUIET_ZONE_MM
    page_height_mm = marker_band_mm + ruler_band_mm + instructions_band_mm

    rects: list[str] = []
    for row in range(bits_per_side):
        for col in range(bits_per_side):
            if bitmap[row, col] < 128:  # black cell
                x = marker_origin_mm + col * cell_mm
                y = marker_origin_mm + row * cell_mm
                rects.append(
                    f'<rect x="{x:.4f}mm" y="{y:.4f}mm" width="{cell_mm:.4f}mm" '
                    f'height="{cell_mm:.4f}mm" fill="black"/>'
                )

    ruler_y = marker_band_mm + ruler_band_mm - 6
    ruler_x0 = (page_width_mm - RULER_LENGTH_MM) / 2

    instructions_svg = "".join(
        f'<text x="{page_width_mm / 2}mm" y="{marker_band_mm + ruler_band_mm + 4 + i * 5}mm" '
        f'font-size="2.3" font-family="sans-serif" text-anchor="middle">{line}</text>'
        for i, line in enumerate(INSTRUCTIONS)
    )

    label = f"{spec.label} · id={marker_id}"
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'width="{page_width_mm}mm" height="{page_height_mm}mm" '
        f'viewBox="0 0 {page_width_mm} {page_height_mm}">\n'
        f'  <rect x="0" y="0" width="{page_width_mm}" height="{page_height_mm}" fill="white"/>\n'
        f'  {"".join(rects)}\n'
        f'  <text x="{marker_origin_mm + spec.physical_size_mm / 2}mm" y="{marker_band_mm - 1.5}mm" '
        f'font-size="2.4" font-family="sans-serif" text-anchor="middle">{label}</text>\n'
        f'  {_ruler_svg(ruler_x0, ruler_y)}\n'
        f'  {instructions_svg}\n'
        f'</svg>\n'
    )


def main() -> None:
    marker_id = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    output_path = (
        Path(sys.argv[2]) if len(sys.argv) > 2 else Path(f"calibration_marker_{marker_id}.svg")
    )
    output_path.write_text(generate_svg(marker_id), encoding="utf-8")
    spec = MARKER_REGISTRY[marker_id]
    print(
        f"Wrote {output_path} ({spec.physical_size_mm}mm marker, id={marker_id}, "
        f"batch={spec.batch}). Print at 100% scale (no 'fit to page')."
    )


if __name__ == "__main__":
    main()
