# Deployment

This backend is deployed manually with Docker.

On the server, update the code, then rebuild the production containers and run migrations:

```sh
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml run --rm api npm run db:migrate
```

If you want the same commands in one place, use `scripts/deploy-prod.sh` directly.
