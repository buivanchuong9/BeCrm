FROM python:3.12-slim

ARG PYTORCH_INDEX_URL=https://download.pytorch.org/whl/cpu

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility

WORKDIR /service
COPY ai/requirements.txt ./requirements.txt
RUN pip install --index-url "${PYTORCH_INDEX_URL}" \
      torch==2.9.1 torchvision==0.24.1 \
    && pip install -r requirements.txt

COPY ai/app ./app
COPY ai/model ./model

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
