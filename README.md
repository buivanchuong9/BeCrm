# DermaHealth Backend

Everything in this backend runs in Docker.

## Local development

Start the full backend stack with Docker Compose:

```sh
docker compose up -d --build
```

This brings up:

- API
- PostgreSQL
- Redis
- MinIO
- Mailpit

## Production deployment

Use the production compose file on the server:

```sh
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml run --rm api npm run db:migrate
```

## Auto-deploy on server pull

If the server checks out this repo and runs `git pull origin main`, enable the tracked hook once:

```sh
./scripts/install-deploy-hook.sh
```

After that, every successful pull triggers the Docker deploy script automatically.
