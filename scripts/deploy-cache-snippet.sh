# --- Dán khối này vào script deploy (sau build, trước/sau up -d) ---

# Xóa cache build Docker (tránh image/layer cũ)
sudo docker builder prune -f
sudo docker image prune -f

# Build sạch + container mới (không giữ layer cũ)
sudo docker compose build --no-cache carefollow-be
sudo docker compose up -d --force-recreate --renew-anon-volumes carefollow-be

# Nếu có nginx proxy — restart để không giữ response cũ
sudo docker compose restart nginx 2>/dev/null || true

# Ép Swagger load spec mới (bust cache query ?t=)
sudo docker compose exec carefollow-be sh -c '
  PORT=${PORT:-3000}
  apk add --no-cache curl >/dev/null 2>&1 || true
  rm -f /tmp/swagger-cj
  curl -s -c /tmp/swagger-cj -b /tmp/swagger-cj \
    -X POST "http://127.0.0.1:${PORT}/api/docs/" \
    -d "username=buivanchuong&password=123456@" -o /dev/null
  curl -s -b /tmp/swagger-cj "http://127.0.0.1:${PORT}/api/docs-json?t=$(date +%s)" \
    | grep -o "\"version\":\"[^\"]*\"" | head -1
'

# Trên trình duyệt: tab ẩn danh hoặc Cmd+Shift+R tại /api/docs
# (Swagger UI cache phía browser — server không xóa hết được)
