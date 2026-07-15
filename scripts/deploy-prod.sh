#!/usr/bin/env sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
COMPOSE_FILE="$ROOT_DIR/docker-compose.prod.yml"
ENV_FILE=${ENV_FILE:-"$ROOT_DIR/.env.production"}

cd "$ROOT_DIR"

if [ ! -s "$ENV_FILE" ]; then
  echo "Missing production environment file: $ENV_FILE" >&2
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
  compose build --no-cache api
elif [ "$#" -gt 0 ]; then
  echo "Usage: $0 [--no-cache]" >&2
  exit 2
else
  compose build api
fi

# Keep the data services available, apply forward-only migrations, then replace
# the API container with the image that was just built.
compose up -d postgres redis
compose run --rm api npm run db:migrate
compose up -d --force-recreate api

attempt=0
while [ "$attempt" -lt 30 ]; do
  status=$(docker_cmd inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' dermahealth-api 2>/dev/null || true)
  if [ "$status" = "healthy" ]; then
    compose ps
    echo "Deployment completed: dermahealth-api is healthy."
    exit 0
  fi

  attempt=$((attempt + 1))
  sleep 2
done

echo "Deployment failed: dermahealth-api did not become healthy." >&2
compose ps >&2
compose logs --tail=100 api >&2
exit 1
