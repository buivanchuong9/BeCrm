import io
import unittest

from PIL import Image, ImageDraw

from app.comparison import DuplicateImageError, compare_lesion_images


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


if __name__ == "__main__":
    unittest.main()
