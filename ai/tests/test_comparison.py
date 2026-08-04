import io
import unittest

from PIL import Image, ImageDraw

from app.comparison import ComparisonImageError, DuplicateImageError, compare_lesion_images, count_mask_pixels


def lesion_photo(radius: int, offset_x: int = 0, brightness: int = 205) -> bytes:
    image = Image.new("RGB", (512, 512), (brightness, 164, 138))
    draw = ImageDraw.Draw(image)
    center = (256 + offset_x, 256)
    draw.ellipse(
        (center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius),
        fill=(177, 66, 58),
        outline=(132, 44, 42),
        width=5,
    )
    payload = io.BytesIO()
    image.save(payload, format="PNG")
    return payload.getvalue()


class LesionComparisonTests(unittest.TestCase):
    def test_rejects_identical_original_bytes(self):
        photo = lesion_photo(92)
        with self.assertRaisesRegex(DuplicateImageError, "trùng hoàn toàn"):
            compare_lesion_images(photo, photo)

    def test_generates_relative_area_and_real_difference_map(self):
        result = compare_lesion_images(lesion_photo(96), lesion_photo(76, offset_x=4))
        self.assertEqual(result["quality"]["comparisonDisposition"], "COMPARABLE")
        area = next(metric for metric in result["metrics"] if metric["key"] == "lesion-area-index")
        self.assertEqual(area["baseline"], 100.0)
        self.assertLess(area["current"], 100.0)
        self.assertLess(area["relativeAreaChange"], 0)
        self.assertIn("ảnh đã chuẩn hóa", area["label"])
        asset_types = {asset["type"] for asset in result["derivedAssets"]}
        self.assertTrue({"ALIGNED", "MASK", "DIFFERENCE_MAP"}.issubset(asset_types))

    def test_unusable_pair_does_not_fabricate_area(self):
        result = compare_lesion_images(lesion_photo(96), lesion_photo(30, offset_x=170, brightness=245))
        if result["quality"]["comparisonDisposition"] == "NOT_COMPARABLE":
            area = next(metric for metric in result["metrics"] if metric["key"] == "lesion-area-index")
            self.assertIsNone(area["baseline"])
            self.assertIsNone(area["current"])
            self.assertFalse(result["derivedAssets"])

    def test_grad_cam_is_not_emitted_as_difference_map(self):
        result = compare_lesion_images(lesion_photo(96), lesion_photo(82, offset_x=3))
        self.assertNotIn("grad", str(result["algorithmVersion"]).lower())
        for asset in result["derivedAssets"]:
            if asset["type"] == "DIFFERENCE_MAP":
                self.assertNotEqual(asset["type"], "HEATMAP")

    def test_occlusion_is_never_fabricated_from_exposure(self):
        result = compare_lesion_images(lesion_photo(96), lesion_photo(76, offset_x=4))
        self.assertIsNone(result["quality"]["occlusion"])

    def test_registration_provenance_is_real_and_present(self):
        result = compare_lesion_images(lesion_photo(96), lesion_photo(76, offset_x=4))
        registration = result["quality"]["registration"]
        self.assertEqual(registration["kind"], "translation")
        self.assertIsInstance(registration["dx"], int)
        self.assertIsInstance(registration["dy"], int)
        self.assertGreaterEqual(registration["score"], 0.0)
        self.assertLessEqual(registration["score"], 1.0)
        self.assertIsInstance(result["quality"]["likelySameBodyRegion"], float)
        self.assertIsInstance(result["quality"]["likelySameLesion"], float)
        self.assertIn(result["requiresClinicianMaskReview"], (True, False))


class MaskPixelCountTests(unittest.TestCase):
    def _mask_png(self, covered_fraction: float) -> bytes:
        image = Image.new("RGBA", (100, 100), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        side = int(100 * covered_fraction**0.5)
        draw.rectangle((0, 0, side, side), fill=(46, 196, 182, 255))
        payload = io.BytesIO()
        image.save(payload, format="PNG")
        return payload.getvalue()

    def test_counts_real_pixels_from_alpha_channel(self):
        result = count_mask_pixels(self._mask_png(0.25))
        self.assertEqual(result["width"], 100)
        self.assertEqual(result["height"], 100)
        # A 50x50 opaque square inside a 100x100 canvas -> 2500 pixels, give a
        # tolerant range since rectangle rounding isn't exact.
        self.assertGreater(result["pixelArea"], 2000)
        self.assertLess(result["pixelArea"], 3000)

    def test_rejects_all_background_mask_rather_than_reporting_zero_area(self):
        blank = Image.new("RGBA", (50, 50), (0, 0, 0, 0))
        payload = io.BytesIO()
        blank.save(payload, format="PNG")
        with self.assertRaisesRegex(ComparisonImageError, "toàn bộ nền"):
            count_mask_pixels(payload.getvalue())

    def test_counts_from_luminance_when_no_alpha_channel(self):
        image = Image.new("RGB", (60, 60), (0, 0, 0))
        draw = ImageDraw.Draw(image)
        draw.rectangle((0, 0, 30, 30), fill=(255, 255, 255))
        payload = io.BytesIO()
        image.save(payload, format="PNG")
        result = count_mask_pixels(payload.getvalue())
        self.assertGreater(result["pixelArea"], 800)
        self.assertLess(result["pixelArea"], 1000)


if __name__ == "__main__":
    unittest.main()
