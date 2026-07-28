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

if ! grep -q '^AI_API_KEY=.' "$ENV_FILE"; then
  echo "Missing AI_API_KEY in $ENV_FILE." >&2
  echo "Generate one with: openssl rand -hex 32" >&2
  echo "Then add it as AI_API_KEY=<generated-value> and rerun deployment." >&2
  exit 1
fi

if ! grep -Eq '^DATABASE_URL=.*@postgres:5432/' "$ENV_FILE"; then
  echo "DATABASE_URL in $ENV_FILE must use the Compose service host postgres:5432." >&2
  echo "Do not use 127.0.0.1, localhost, or a host-published development port." >&2
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

service_status() {
  service=$1
  container_id=$(compose ps -a -q "$service" 2>/dev/null || true)
  if [ -z "$container_id" ]; then
    echo "missing"
    return
  fi

  docker_cmd inspect \
    --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
    "$container_id" 2>/dev/null || echo "unknown"
}

wait_for_service() {
  service=$1
  max_attempts=$2
  delay_seconds=$3
  attempt=0

  while [ "$attempt" -lt "$max_attempts" ]; do
    status=$(service_status "$service")
    if [ "$status" = "healthy" ]; then
      return 0
    fi
    if [ "$status" = "exited" ] || [ "$status" = "dead" ]; then
      return 1
    fi

    attempt=$((attempt + 1))
    sleep "$delay_seconds"
  done

  return 1
}

show_service_diagnostics() {
  service=$1
  echo "Diagnostics for service '$service':" >&2
  compose ps --all "$service" >&2 || true
  compose logs --tail=200 "$service" >&2 || true

  container_id=$(compose ps -a -q "$service" 2>/dev/null || true)
  if [ -n "$container_id" ]; then
    docker_cmd inspect \
      --format 'container={{.Name}} status={{.State.Status}} exitCode={{.State.ExitCode}} error={{.State.Error}}' \
      "$container_id" >&2 || true
    docker_cmd inspect \
      --format '{{if .State.Health}}{{range .State.Health.Log}}{{println .End "exit=" .ExitCode .Output}}{{end}}{{end}}' \
      "$container_id" >&2 || true
  fi
}

# Validate interpolation and the Compose model before changing running services.
compose config >/dev/null

# Fail before the multi-gigabyte CUDA build when an existing data service is
# already unhealthy. This read-only preflight does not recreate a production
# database merely to test it.
postgres_status=$(service_status postgres)
if [ "$postgres_status" != "missing" ] && [ "$postgres_status" != "healthy" ]; then
  echo "Deployment stopped: the existing PostgreSQL container is $postgres_status." >&2
  show_service_diagnostics postgres
  exit 1
fi
redis_status=$(service_status redis)
if [ "$redis_status" != "missing" ] && [ "$redis_status" != "healthy" ]; then
  echo "Deployment stopped: the existing Redis container is $redis_status." >&2
  show_service_diagnostics redis
  exit 1
fi

if [ "${1:-}" = "--no-cache" ]; then
  # Build the small API image first. A package-registry or base-image failure
  # should fail fast before spending time and several GB exporting CUDA layers.
  compose build --no-cache api
  compose build --no-cache ai
elif [ "$#" -gt 0 ]; then
  echo "Usage: $0 [--no-cache]" >&2
  exit 2
else
  compose build api
  compose build ai
fi

# Keep data services available, start the GPU inference service, apply
# forward-only migrations, then replace the API container with the images that
# were just built. The AI service intentionally fails startup when CUDA is not
# visible, preventing an accidental CPU fallback in production.
compose up -d postgres redis
if ! wait_for_service postgres 120 2; then
  echo "Deployment stopped: PostgreSQL did not become healthy; no migration was run." >&2
  show_service_diagnostics postgres
  exit 1
fi
if ! wait_for_service redis 60 2; then
  echo "Deployment stopped: Redis did not become healthy." >&2
  show_service_diagnostics redis
  exit 1
fi

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
