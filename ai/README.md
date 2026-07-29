# DermaHealth AI service

Service inference nội bộ cho checkpoint đa phương thức EfficientNet-B0 + PhoBERT,
15 lớp. Mặc định mỗi lần quét trả Top 3 tín hiệu.

Production chạy bằng NVIDIA CUDA và `AI_REQUIRE_CUDA=true`; service sẽ từ chối
khởi động nếu container không nhìn thấy GPU. `docker-compose.prod.yml` chỉ cấp
một GPU cho service và không publish port 8000 ra Internet.

## Điều bắt buộc trước khi dùng lâm sàng

Checkpoint `train_combine_ensemble.pth` phải chứa `model_state`, `class_names`,
`num_classes` và `embed_dim`. Service dùng chính `class_names` đóng gói cùng
checkpoint, không suy đoán mapping nhãn từ tên thư mục. Tokenizer PhoBERT được
vendor trong `model/phobert-tokenizer` để production không tải model từ Internet
khi khởi động.

Preprocessing ảnh hiện dùng resize 256, center crop 224 và ImageNet normalization.
Text được tokenize bằng PhoBERT tối đa 128 token. Phải đối chiếu hai cấu hình này
với code train trước khi phê duyệt model; sai preprocessing vẫn có thể cho response
hợp lệ nhưng dự đoán sai.

API nhận JPEG/PNG/WebP, tối đa 10 MB và 25 triệu pixel theo mặc định. Có thể điều
chỉnh bằng `AI_MAX_IMAGE_BYTES` và `AI_MAX_IMAGE_PIXELS`, nhưng tăng giới hạn làm
tăng rủi ro cạn RAM khi nhiều request chạy đồng thời.

## Chạy riêng khi phát triển

```bash
cd ai
python -m venv .venv
.venv/bin/pip install -r requirements.txt
AI_REQUIRE_CUDA=false AI_INTERNAL_API_KEY=dev-secret \
  .venv/bin/uvicorn app.main:app --reload
```

Kiểm tra:

```bash
curl http://localhost:8000/health/ready -H 'X-AI-API-Key: dev-secret'
curl -X POST http://localhost:8000/v1/analyze \
  -H 'X-AI-API-Key: dev-secret' -F 'file=@skin.jpg'
```

## Multi-image + Grad-CAM

Public NestJS API gọi endpoint nội bộ này; không expose port 8000 ra Internet:

```bash
curl -X POST http://localhost:8000/v1/analyze-case \
  -H 'X-AI-API-Key: dev-secret' \
  -H 'X-Request-Id: 8ea25d36-6c2c-4c26-a98c-a5f34172584d' \
  -F 'closeup=@closeup.jpg' \
  -F 'overview=@overview.jpg' \
  -F 'alternate=@alternate.jpg' \
  -F 'bodyRegion=arm' \
  -F 'durationDays=4' \
  -F 'symptoms=["fever","rapid_spreading"]' \
  -F 'note=Tổn thương ngứa tăng sau khi đổi thuốc'
```

Mỗi ảnh được inference độc lập. Grad-CAM dùng convolution layer cuối được khám
phá từ model (`conv_head` với checkpoint hiện tại), hook được tháo sau request và
case được serialize qua lock/semaphore để không trộn activation/gradient. Overlay
là PNG 224x224 thật; nó chỉ biểu diễn vùng ảnh ảnh hưởng đến prediction, không
phải segmentation mask hay bằng chứng model giải thích đúng.

Aggregation `closeup_primary_heuristic_v1` không lấy trung bình probability.
Close-up là nguồn chính; ảnh không đạt quality gate bị loại và bất đồng top-1 làm
case từ chối. Baseline này chưa được clinical validation trên cohort multi-view.

Metrics low-cardinality, có API key:

```bash
curl http://localhost:8000/metrics -H 'X-AI-API-Key: dev-secret'
```

## Biến môi trường an toàn

- `AI_MAX_CONCURRENT_CASES=1`
- `AI_QUALITY_MIN_SCORE=0.55`
- `AI_MIN_TOP_PROBABILITY=0.60`
- `AI_MIN_PROBABILITY_MARGIN=0.15`
- `AI_MIN_BRIGHTNESS=0.12`
- `AI_MAX_BRIGHTNESS=0.95`
- `AI_MIN_BLUR_VARIANCE=0.001`
- `AI_TOP_K=3`
- `AI_TEXT_MAX_LENGTH=128`
- `AI_APPROVED_PREPROCESSING_VERSION=imagenet-phobert-eval-224-v1`

Không thay threshold dựa trên cảm tính. Các giá trị phải được hiệu chỉnh bằng bộ
validation và phê duyệt như một model/config release mới.

Trên Ubuntu production, xác minh model đang dùng GPU:

```bash
docker exec dermahealth-ai python -c \
  "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"
```
