# Triển khai production trên Ubuntu

Backend production chạy bằng `docker-compose.prod.yml`:

- API container: `dermahealth-api`
- AI inference container: `dermahealth-ai` (NVIDIA GPU bắt buộc)
- API trên host: `127.0.0.1:43000`
- PostgreSQL và Redis chỉ nằm trong Docker network
- Swagger UI cố định: `/api/docs`
- OpenAPI JSON cố định: `/api/docs/openapi.json`
- URL theo release (tùy chọn): `/api/docs/2.8.1`

Swagger runtime được sinh từ source code khi API khởi động, không đọc trực tiếp
`docs/openapi.json`. Mọi response HTML, JavaScript, CSS và OpenAPI JSON dưới
`/api/docs` đều trả `Cache-Control: no-store` cùng các header chống cache tương
ứng.

Version chỉ lấy từ `version` trong `package.json`, không có biến môi trường
override nên không thể bị kẹt ở badge cũ. Sau `git pull` và rebuild, link
`/api/docs` luôn giữ nguyên và trực tiếp phục vụ bản mới nhất;
`/api/docs/<version>` chỉ là URL tùy chọn. Business API vẫn giữ nguyên dưới
`/api/v1`.

## 1. Chuẩn bị server một lần

Cài Docker Engine và Docker Compose plugin, sau đó cho user hiện tại quyền dùng
Docker:

```sh
sudo usermod -aG docker "$USER"
```

Đăng xuất SSH và đăng nhập lại. Nếu chưa đăng nhập lại thì script deploy sẽ tự
dùng `sudo docker`.

### 1.1 Chuẩn bị NVIDIA GPU runtime

Production không fallback sang CPU. Server phải có NVIDIA GPU, driver Linux hỗ
trợ CUDA 12.x và NVIDIA Container Toolkit. Kiểm tra driver trước:

```sh
nvidia-smi
```

Cài NVIDIA Container Toolkit theo repository chính thức, sau đó cấu hình Docker:

```sh
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
  | sudo gpg --dearmor --yes \
      -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -sL https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list \
  | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \
  | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

Xác minh Docker nhìn thấy GPU trước khi deploy:

```sh
docker run --rm --gpus all ubuntu:24.04 nvidia-smi
```

Nếu lệnh này lỗi thì không chạy deploy; sửa driver/toolkit trước. Runbook chính
thức: <https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html>.

Clone repo đúng một cấp thư mục:

```sh
mkdir -p ~/BE_Y_Te
cd ~/BE_Y_Te
git clone https://github.com/buivanchuong9/BeCrm.git BeCrm
cd ~/BE_Y_Te/BeCrm
```

## 2. Tạo `.env.production` mới

Khối lệnh này ghi đè `.env.production` và sinh mới database password, JWT
keypair, password pepper và field-encryption key:

```sh
cd ~/BE_Y_Te/BeCrm
umask 077

mkdir -p "$HOME/.config/dermahealth"

openssl genpkey \
  -algorithm RSA \
  -pkeyopt rsa_keygen_bits:2048 \
  -out "$HOME/.config/dermahealth/access_private.pem"

openssl pkey \
  -in "$HOME/.config/dermahealth/access_private.pem" \
  -pubout \
  -out "$HOME/.config/dermahealth/access_public.pem"

DB_PASSWORD="$(openssl rand -hex 24)"
PASSWORD_PEPPER="$(openssl rand -hex 32)"
FIELD_ENCRYPTION_KEY="$(openssl rand -base64 32 | tr -d '\n')"
AI_API_KEY="$(openssl rand -hex 32)"
ACCESS_PRIVATE_KEY="$(awk '{printf "%s\\n", $0}' "$HOME/.config/dermahealth/access_private.pem")"
ACCESS_PUBLIC_KEY="$(awk '{printf "%s\\n", $0}' "$HOME/.config/dermahealth/access_public.pem")"

cat > .env.production <<EOF
NODE_ENV=production
PORT=3000
API_BASE_PATH=/api/v1

FRONTEND_ORIGINS=https://dermahealth.fitdnu.id.vn
APP_PUBLIC_URL=https://dermahealth.fitdnu.id.vn
REQUEST_BODY_LIMIT=1mb
TRUST_PROXY_HOPS=1
RATE_LIMIT_TTL_MS=60000
RATE_LIMIT_MAX=100

POSTGRES_USER=app
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=dermahealth
DATABASE_URL=postgresql://app:${DB_PASSWORD}@postgres:5432/dermahealth?schema=public

REDIS_URL=redis://redis:6379

ACCESS_TOKEN_PRIVATE_KEY=${ACCESS_PRIVATE_KEY}
ACCESS_TOKEN_PUBLIC_KEY=${ACCESS_PUBLIC_KEY}
ACCESS_TOKEN_TTL=10m
REFRESH_TOKEN_TTL=30d
REFRESH_TOKEN_TTL_NOT_REMEMBERED=24h

COOKIE_DOMAIN=dermahealth.fitdnu.id.vn
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax

PASSWORD_PEPPER=${PASSWORD_PEPPER}
FIELD_ENCRYPTION_KEY=${FIELD_ENCRYPTION_KEY}

SMS_PROVIDER=disabled
AI_PROVIDER=deterministic
AI_MODEL_VERSION=efficientnet-b0-31class
AI_SERVICE_URL=http://ai:8000
AI_TIMEOUT_MS=30000
AI_MAX_RESPONSE_BYTES=5000000
AI_API_KEY=${AI_API_KEY}
AI_GPU_DEVICE=0
PYTORCH_INDEX_URL=https://download.pytorch.org/whl/cu126
AI_MAX_CONCURRENT_CASES=1
AI_QUALITY_MIN_SCORE=0.55
AI_MIN_TOP_PROBABILITY=0.60
AI_MIN_PROBABILITY_MARGIN=0.15
AI_APPROVED_PREPROCESSING_VERSION=imagenet-eval-224-v1
LOG_LEVEL=info
EOF

chmod 600 .env.production
unset DB_PASSWORD PASSWORD_PEPPER FIELD_ENCRYPTION_KEY AI_API_KEY
unset ACCESS_PRIVATE_KEY ACCESS_PUBLIC_KEY
```

### Nâng cấp server đã có `.env.production` từ trước v2.8.0

Không tạo lại toàn bộ file vì sẽ làm thay đổi password pepper/JWT/database
secret đang dùng. Chỉ bổ sung cấu hình AI còn thiếu:

```sh
cd ~/BE_Y_Te/BeCrm
umask 077

if ! grep -q '^AI_API_KEY=.' .env.production; then
  sed -i '/^AI_API_KEY=/d' .env.production
  printf '\nAI_API_KEY=%s\n' "$(openssl rand -hex 32)" >> .env.production
fi

grep -q '^AI_MODEL_VERSION=' .env.production \
  || printf 'AI_MODEL_VERSION=efficientnet-b0-31class\n' >> .env.production
grep -q '^AI_SERVICE_URL=' .env.production \
  || printf 'AI_SERVICE_URL=http://ai:8000\n' >> .env.production
grep -q '^AI_TIMEOUT_MS=' .env.production \
  || printf 'AI_TIMEOUT_MS=30000\n' >> .env.production
grep -q '^AI_GPU_DEVICE=' .env.production \
  || printf 'AI_GPU_DEVICE=0\n' >> .env.production
grep -q '^PYTORCH_INDEX_URL=' .env.production \
  || printf 'PYTORCH_INDEX_URL=https://download.pytorch.org/whl/cu126\n' >> .env.production

chmod 600 .env.production
```

Kiểm tra tên biến mà không in secret:

```sh
grep -E '^(AI_MODEL_VERSION|AI_SERVICE_URL|AI_TIMEOUT_MS|AI_GPU_DEVICE|PYTORCH_INDEX_URL)=' \
  .env.production
grep -q '^AI_API_KEY=.' .env.production && echo 'AI_API_KEY OK'
```

Nếu frontend nằm trên domain khác, sửa `FRONTEND_ORIGINS` thành origin thật của
frontend. Lệnh `db:seed` chỉ khởi tạo metadata nền tảng (permission và feature
flag), không tạo organization, user, bệnh nhân hay dữ liệu lâm sàng mẫu.

`PASSWORD_PEPPER` phải được giữ nguyên suốt vòng đời database. Nếu sinh lại
pepper trong khi tái sử dụng volume PostgreSQL cũ, toàn bộ mật khẩu hiện hữu sẽ
không còn kiểm tra được; cần khôi phục pepper cũ hoặc đặt lại mật khẩu cho từng
tài khoản bằng quy trình bên dưới.

Kiểm tra read-only trạng thái các Owner production đang lưu trong database
(không in password hash hay secret):

```sh
docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  run --rm api npm run admin:check-owners
```

Nếu và chỉ nếu lần triển khai đầu tiên chưa có Owner, chạy bootstrap một lần.
Danh sách Owner và organization phải là dữ liệu thật do người vận hành truyền
vào; code không chứa sẵn tài khoản hay tenant mẫu. Lệnh từ chối chạy nếu database
đã có bất kỳ membership `super_administrator` active nào và ghi audit event cho
từng tài khoản:

```sh
read -r -s -p "Initial Owner password: " SUPER_ADMIN_PASSWORD
export SUPER_ADMIN_PASSWORD
export OWNER_BOOTSTRAP_CONFIRM=CREATE_INITIAL_PLATFORM_OWNERS
export OWNER_BOOTSTRAP_ORGANIZATION_CODE=my-clinic
export OWNER_BOOTSTRAP_ORGANIZATION_NAME='My Clinic'
export OWNER_BOOTSTRAP_ORGANIZATION_TIMEZONE=Asia/Ho_Chi_Minh
export INITIAL_PLATFORM_OWNERS_JSON='[{"email":"owner@example.com","displayName":"Platform Owner"}]'

docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  run --rm \
  -e SUPER_ADMIN_PASSWORD \
  -e OWNER_BOOTSTRAP_CONFIRM \
  -e OWNER_BOOTSTRAP_ORGANIZATION_CODE \
  -e OWNER_BOOTSTRAP_ORGANIZATION_NAME \
  -e OWNER_BOOTSTRAP_ORGANIZATION_TIMEZONE \
  -e INITIAL_PLATFORM_OWNERS_JSON \
  api npm run admin:bootstrap-owners

unset SUPER_ADMIN_PASSWORD OWNER_BOOTSTRAP_CONFIRM INITIAL_PLATFORM_OWNERS_JSON
unset OWNER_BOOTSTRAP_ORGANIZATION_CODE OWNER_BOOTSTRAP_ORGANIZATION_NAME
unset OWNER_BOOTSTRAP_ORGANIZATION_TIMEZONE
```

Mật khẩu bootstrap chỉ là credential ban đầu. Sau khi kiểm tra đăng nhập, đặt
mật khẩu riêng cho từng Owner bằng quy trình `admin:set-password` bên dưới.

Đổi mật khẩu cho một Owner hiện hữu bằng biến môi trường dùng một lần. Lệnh
này xác nhận tài khoản có membership `super_administrator`, băm mật khẩu bằng
Argon2id + `PASSWORD_PEPPER`, thu hồi mọi refresh session và ghi audit event:

```sh
read -r -p "Super-admin email: " SUPER_ADMIN_EMAIL
read -r -s -p "New password: " SUPER_ADMIN_PASSWORD
export SUPER_ADMIN_EMAIL SUPER_ADMIN_PASSWORD

docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  run --rm \
  -e SUPER_ADMIN_EMAIL \
  -e SUPER_ADMIN_PASSWORD \
  api npm run admin:set-password

unset SUPER_ADMIN_EMAIL SUPER_ADMIN_PASSWORD
```

Không ghi mật khẩu vào `.env.production`, shell history, Compose hoặc Git.
Chạy quy trình trên riêng cho cả 4 email Owner; mỗi người phải dùng mật khẩu
riêng:

- `buivanchuong@dermahealth.vn`
- `nguyenmanhcuong@dermahealth.vn`
- `daovanduong@dermahealth.vn`
- `phamthihongchuc@dermahealth.vn`

Sau khi đặt xong, chạy lại `npm run admin:check-owners`. Nếu công cụ báo
`missing user` hoặc `missing active super_administrator membership`, không chạy
development seed trên production; phải provision tài khoản/membership qua quy
trình Owner được phê duyệt.

Kiểm tra các secret bắt buộc mà không in giá trị:

```sh
for key in \
  POSTGRES_PASSWORD DATABASE_URL REDIS_URL \
  ACCESS_TOKEN_PRIVATE_KEY ACCESS_TOKEN_PUBLIC_KEY \
  PASSWORD_PEPPER FIELD_ENCRYPTION_KEY AI_API_KEY
do
  if grep -q "^${key}=." .env.production; then
    echo "$key OK"
  else
    echo "$key MISSING"
  fi
done
```

## 3. Deploy lần đầu

`--no-cache` bảo đảm image được dựng hoàn toàn mới:

```sh
cd ~/BE_Y_Te/BeCrm
./scripts/deploy-prod.sh --no-cache
```

Script sẽ tự động:

1. Đọc và kiểm tra `.env.production`.
2. Build image CUDA AI và image API.
3. Khởi động PostgreSQL, Redis và AI.
4. Chờ AI load model trên `cuda:0` và báo `healthy`.
5. Chạy `prisma migrate deploy`.
6. Recreate API bằng image mới.
7. Chờ đến khi container API báo `healthy`.

## 4. Deploy các lần tiếp theo

Sau khi code mới đã được push lên nhánh `main`, trên Ubuntu chỉ cần:

```sh
cd ~/BE_Y_Te/BeCrm
git pull --ff-only origin main
./scripts/deploy-prod.sh
```

Docker tự vô hiệu hóa cache cho các layer có source code thay đổi. Chỉ dùng
`--no-cache` khi nghi ngờ cache hoặc dependency/image nền bị cũ:

```sh
./scripts/deploy-prod.sh --no-cache
```

Với thay đổi chỉ thuộc source/API như Swagger và không có migration mới, có thể
rebuild duy nhất API, giữ nguyên toàn bộ container/volume database:

```sh
cd ~/BE_Y_Te/BeCrm
git pull --ff-only origin main

sudo docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  build --no-cache api

sudo docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  up -d --force-recreate api
```

Khi chuẩn bị release `3.0.0`, cập nhật version trong source trước khi commit:

```sh
npm version 3.0.0 --no-git-tag-version
```

Sau khi server pull và rebuild API, `/api/docs` và `/api/docs/openapi.json` tự
hiển thị version mới. Không cần thay link và không đổi business route `/api/v1`.

## 5. Kiểm tra sau deploy

```sh
docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  ps

docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  logs --tail=200 api

curl -i http://127.0.0.1:43000/health/live
curl -s http://127.0.0.1:43000/api/docs/openapi.json | jq '.info.version'

curl -sSI http://127.0.0.1:43000/api/docs/swagger-ui-init.js \
  | grep -iE 'cache-control|pragma|expires'

curl -sSI http://127.0.0.1:43000/api/docs/openapi.json \
  | grep -iE 'cache-control|pragma|expires'

docker inspect \
  --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' \
  dermahealth-api

docker inspect \
  --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' \
  dermahealth-ai

docker exec dermahealth-ai python -c \
  "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"
```

Nếu user chưa có quyền Docker, thêm `sudo` trước `docker compose` trong các lệnh
kiểm tra.

Ảnh/tài liệu upload được lưu trong volume `dermahealth_object_storage` khi
production chưa cấu hình S3. Volume này tồn tại qua recreate/redeploy container
nhưng phải được đưa vào lịch backup cùng PostgreSQL. Kiểm tra volume:

```sh
docker volume inspect dermahealth_dermahealth_object_storage
```

## 6. Nginx

Nginx phải proxy domain public tới API mới tại `127.0.0.1:43000`, không phải
backend cũ ở port `3000`:

```sh
sudo nginx -T 2>&1 | grep -nE '127\.0\.0\.1:(3000|43000)'
sudo nginx -t
sudo systemctl reload nginx
```

Swagger production:

```text
https://dermahealth.fitdnu.id.vn/api/docs
```

OpenAPI JSON production:

```text
https://dermahealth.fitdnu.id.vn/api/docs/openapi.json
```

## 7. Xóa database và dựng lại hoàn toàn

Cảnh báo: thao tác này xóa vĩnh viễn PostgreSQL, Redis và toàn bộ ảnh/tài liệu
upload trong volume của project `dermahealth`.

```sh
cd ~/BE_Y_Te/BeCrm

docker compose \
  --env-file .env.production \
  -f docker-compose.prod.yml \
  down --volumes --remove-orphans --rmi local

./scripts/deploy-prod.sh --no-cache
```

Nếu user chưa có quyền Docker, thêm `sudo` trước lệnh `docker compose`.
