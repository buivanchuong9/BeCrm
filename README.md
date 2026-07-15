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

Use the production compose file on the server after pulling the latest code:

```sh
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml run --rm api npm run db:migrate
```

For convenience, you can run `scripts/deploy-prod.sh` instead of typing the two Docker commands separately.
