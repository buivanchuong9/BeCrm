#!/usr/bin/env sh

set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

git -C "$ROOT_DIR" config core.hooksPath .githooks
chmod +x "$ROOT_DIR/scripts/deploy-prod.sh" "$ROOT_DIR/.githooks/post-merge"

printf '%s\n' 'Deploy hook installed. Future `git pull origin main` runs will trigger auto deploy.'
