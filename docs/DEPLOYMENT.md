# Deployment

There are two supported deployment flows for this backend.

## 1. GitHub Actions on push to `main`

The tracked workflow at `.github/workflows/deploy.yml` runs on every push to `main` and can also be started manually.

Required secrets:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PORT`
- `DEPLOY_PATH`

That workflow SSHes into the server, updates the checked-out repository, rebuilds the production containers, and runs Prisma migrations.

## 2. Server-side `git pull`

If you want deployment to happen when the server itself runs `git pull origin main`, configure the checked-out repository on the server to use the tracked hooks directory once:

```sh
./scripts/install-deploy-hook.sh
git pull
```

After that, a successful `git pull` will trigger `.githooks/post-merge`, which runs `scripts/deploy-prod.sh`.

The script does the same production steps as the GitHub Actions workflow:

- `docker compose -f docker-compose.prod.yml up -d --build`
- `docker compose -f docker-compose.prod.yml run --rm api npm run db:migrate`
