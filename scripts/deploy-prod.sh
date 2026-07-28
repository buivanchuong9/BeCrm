#!/usr/bin/env sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
COMPOSE_FILE="$ROOT_DIR/docker-compose.prod.yml"
ENV_FILE=${ENV_FILE:-"$ROOT_DIR/.env.production"}
export APP_ENV_FILE="$ENV_FILE"

cd "$ROOT_DIR"

if [ ! -s "$ENV_FILE" ]; then
  echo "Missing production environment file: $ENV_FILE" >&2
  exit 1
fi

MODEL_FILE="$ROOT_DIR/ai/model/best_efficientnet_b0.pth"
if [ ! -s "$MODEL_FILE" ]; then
  echo "Missing AI checkpoint: $MODEL_FILE" >&2
  exit 1
fi

if ! command -v nvidia-smi >/dev/null 2>&1; then
  echo "nvidia-smi is unavailable. Install the NVIDIA driver before deployment." >&2
  exit 1
fi

if ! nvidia-smi --query-gpu=name,driver_version --format=csv,noheader >/dev/null 2>&1; then
  echo "NVIDIA GPU/driver is not healthy; refusing to deploy a CPU fallback." >&2
  exit 1
fi

if docker info >/dev/null 2>&1; then
  USE_SUDO=0
elif command -v sudo >/dev/null 2>&1; then
  USE_SUDO=1
else
  echo "Docker is not accessible and sudo is unavailable." >&2
  exit 1
fi

docker_cmd() {
  if [ "$USE_SUDO" -eq 1 ]; then
    sudo docker "$@"
  else
    docker "$@"
  fi
}

compose() {
  docker_cmd compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

# Validate interpolation and the Compose model before changing running services.
compose config >/dev/null

if [ "${1:-}" = "--no-cache" ]; then
  compose build --no-cache ai api
elif [ "$#" -gt 0 ]; then
  echo "Usage: $0 [--no-cache]" >&2
  exit 2
else
  compose build ai api
fi

# Keep data services available, start the GPU inference service, apply
# forward-only migrations, then replace the API container with the images that
# were just built. The AI service intentionally fails startup when CUDA is not
# visible, preventing an accidental CPU fallback in production.
compose up -d postgres redis
compose up -d --force-recreate ai

attempt=0
while [ "$attempt" -lt 60 ]; do
  ai_status=$(docker_cmd inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' dermahealth-ai 2>/dev/null || true)
  if [ "$ai_status" = "healthy" ]; then
    break
  fi

  attempt=$((attempt + 1))
  sleep 2
done

if [ "${ai_status:-}" != "healthy" ]; then
  echo "Deployment failed: dermahealth-ai did not become healthy on NVIDIA GPU." >&2
  compose ps >&2
  compose logs --tail=150 ai >&2
  exit 1
fi

compose run --rm api npm run db:migrate
compose up -d --force-recreate api

attempt=0
while [ "$attempt" -lt 30 ]; do
  status=$(docker_cmd inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' dermahealth-api 2>/dev/null || true)
  if [ "$status" = "healthy" ]; then
    compose ps
    echo "Deployment completed: dermahealth-ai (GPU) and dermahealth-api are healthy."
    exit 0
  fi

  attempt=$((attempt + 1))
  sleep 2
done

echo "Deployment failed: dermahealth-api did not become healthy." >&2
compose ps >&2
compose logs --tail=100 api >&2
compose logs --tail=100 ai >&2
exit 1
