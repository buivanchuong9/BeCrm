# BeCrm

## Deploy nhanh (khuyến nghị)

Trên server, tại thư mục có `docker-compose.yml`:

```bash
chmod +x scripts/deploy-carefollow-be.sh
./scripts/deploy-carefollow-be.sh
```

Lần đầu / DB trống / login `Tenant not found`:

```bash
TENANT_HOST=demo RUN_SEED=1 ./scripts/deploy-carefollow-be.sh
```

Biến môi trường tùy chọn:

| Biến | Mặc định | Ý nghĩa |
|------|----------|---------|
| `TENANT_HOST` | `localhost` | Header/body tenant (`demo` hoặc domain) |
| `RUN_SEED` | `0` | `1` = chạy `npm run db:seed` sau `db push` |
| `EXPECTED_API_VERSION` | `1.1.0` | Kiểm tra Swagger OpenAPI |
| `GIT_PULL` | `0` | `1` = `git pull` trước build |
| `SKIP_SMOKE` | `0` | `1` = bỏ login + E2E |

Script thực hiện: stop → build `--no-cache` → prune image → `prisma db push` → `up -d --force-recreate` → health → kiểm tra `setVersion` + `api/docs-json` → smoke login → (tuỳ chọn) `e2e-validation.mjs` → log.

## Master Build & Update Routine (thủ công)

```bash
sudo docker compose stop carefollow-be
sudo docker compose build --no-cache carefollow-be
sudo docker image prune -f
sudo docker compose run --rm carefollow-be npx prisma db push
sudo docker compose up -d --force-recreate carefollow-be
sudo docker compose logs --tail=30 carefollow-be
```

**Lưu ý:**

- Entrypoint: `node dist/src/main.js` (không phải `dist/main.js`).
- Trong container `PORT=3000`; nginx thường proxy `carefollow-be:43000` — cần khớp `docker-compose` với nginx.
- Swagger version: kiểm tra JSON `https://<domain>/api/docs-json`, hard refresh tab `/api/docs`.

## Test API sau deploy

```bash
# Map port (ví dụ 43000:3000)
export API_BASE=http://127.0.0.1:43000
export TENANT_HOST=localhost   # hoặc demo / domain production

node scripts/e2e-validation.mjs
node scripts/integration-api-test.mjs
```
