# DermaHealth AI service

Service inference nội bộ cho checkpoint EfficientNet-B0, 31 lớp.

Production chạy bằng NVIDIA CUDA và `AI_REQUIRE_CUDA=true`; service sẽ từ chối
khởi động nếu container không nhìn thấy GPU. `docker-compose.prod.yml` chỉ cấp
một GPU cho service và không publish port 8000 ra Internet.

## Điều bắt buộc trước khi dùng lâm sàng

`model/labels.json` hiện chỉ chứa nhãn kỹ thuật `class_00..class_30`, vì checkpoint
chỉ có `state_dict` và không chứa mapping nhãn. Hãy thay file này bằng đúng thứ tự
`class_to_idx` lúc train. Không được đoán hoặc sắp xếp tên bệnh theo alphabet nếu
training dataset đã dùng thứ tự khác.

Preprocessing hiện dùng cấu hình eval chuẩn của timm/ImageNet: resize 256, center
crop 224 và ImageNet normalization. Nếu pipeline train khác, cập nhật
`app/model.py`; sai preprocessing vẫn cho response hợp lệ nhưng dự đoán sai.

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

Trên Ubuntu production, xác minh model đang dùng GPU:

```bash
docker exec dermahealth-ai python -c \
  "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"
```
