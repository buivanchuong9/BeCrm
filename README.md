# DermaHealth Backend

<p align="center">
	<img src="https://capsule-render.vercel.app/api?type=waving&height=220&color=0:050816,20:0B132B,45:1C2541,75:3A506B,100:5BC0BE&text=CareFollow%20Backend&fontColor=ffffff&fontSize=48&animation=twinkling&fontAlignY=36&desc=Colorful%20Docker-first%20NestJS%20API&descAlignY=60" alt="DermaHealth banner" />
</p>

<p align="center">
	<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=800&size=21&duration=1800&pause=700&color=22D3EE&center=true&vCenter=true&width=760&lines=Backend+c%E1%BB%A7a+B%C3%B9i+V%C4%83n+Ch%C6%B0%C6%A1ng;NestJS+%2B+Prisma+%2B+PostgreSQL+%2B+Redis;Docker+Compose+deploy+th%E1%BB%A7+c%C3%B4ng+nhanh+g%E1%BB%8Dn;ĐỘNG+HỎNG+TRẪM+CHÉM+HẾT" alt="Typing intro" />
</p>

<p align="center">
	<img src="https://github.com/SP-XD/SP-XD/blob/main/images/dev-working_rounded.gif?raw=true" width="120" alt="Animated developer icon" />
	<img src="https://media.giphy.com/media/juua9i2c2fA0AIp2iq/giphy.gif" width="120" alt="Animated coding icon" />
	<img src="https://media.giphy.com/media/SWoSkN6DxTszqIKEqv/giphy.gif" width="120" alt="Animated devops icon" />
</p>

<p align="center">
	<img src="https://capsule-render.vercel.app/api?type=rect&height=4&color=0:22D3EE,30:A78BFA,65:F43F5E,100:F59E0B&section=header" alt="Animated divider" />
</p>

![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)

<p align="center">
	<a href="#chạy-local-bằng-docker"><img src="https://img.shields.io/badge/Start-Local%20in%2060s-16A34A?style=for-the-badge&logo=rocket&logoColor=white" alt="Start local" /></a>
	<a href="#deploy-production-thủ-công-dễ-kiểm-soát"><img src="https://img.shields.io/badge/Deploy-Production-F97316?style=for-the-badge&logo=dockers&logoColor=white" alt="Deploy production" /></a>
	<a href="docs/DEPLOYMENT.md"><img src="https://img.shields.io/badge/Guide-Ubuntu%20Runbook-2563EB?style=for-the-badge&logo=readthedocs&logoColor=white" alt="Deployment guide" /></a>
	<a href="http://localhost:3000/api/docs/2.0.0"><img src="https://img.shields.io/badge/API-Swagger-0EA5E9?style=for-the-badge&logo=swagger&logoColor=white" alt="Swagger" /></a>
</p>

<p align="center">
	<img src="https://capsule-render.vercel.app/api?type=rect&height=3&color=0:14B8A6,25:22D3EE,55:A78BFA,80:F43F5E,100:F59E0B&section=header" alt="Gradient divider" />
</p>

Backend cho nền tảng CareFollow CRM.

Mục tiêu của repo này là dễ chạy, dễ deploy, dễ bàn giao cho team vận hành.
Luồng chính là Docker-first từ local lên production.

<table>
	<tr>
		<td><strong>⚡ Khởi động nhanh</strong><br/>Compose 1 lệnh là lên đủ API, DB, Redis, MinIO, Mailpit.</td>
		<td><strong>🧱 Production ổn định</strong><br/>Deploy script tách rõ build, migrate, health-check.</td>
	</tr>
	<tr>
		<td><strong>🔐 Security-first</strong><br/>Tách biến môi trường local/prod, không commit secret thật.</td>
		<td><strong>🧪 Dễ mở rộng chất lượng</strong><br/>Sẵn lệnh test unit, integration, e2e, security.</td>
	</tr>
</table>

## Bắt đầu trong 60 giây

```sh
docker compose up -d --build
open http://localhost:3000/api/docs/2.0.0
```

Muốn dừng toàn bộ stack:

```sh
docker compose down
```

## Tổng quan nhanh

- Kiến trúc NestJS modular monolith
- Prisma quản lý schema và migration
- JWT auth + RBAC
- Chuẩn response/error nhất quán toàn hệ thống
- Swagger/OpenAPI phục vụ tích hợp frontend và đối tác
- Luồng deploy production thủ công, đơn giản và dễ kiểm soát

## Công nghệ chính

| Thành phần | Phiên bản | Vai trò |
| --- | --- | --- |
| Node.js | 22 | Runtime mục tiêu |
| NestJS | 10 | Framework backend |
| Prisma | 5 | ORM + migration |
| PostgreSQL | 16 | Cơ sở dữ liệu chính |
| Redis | 7 | Cache, queue support |
| BullMQ | 5 | Nền tảng xử lý job |

## Cấu trúc thư mục

- src: mã nguồn ứng dụng
- prisma: schema, migrations, seed
- test: test unit/integration/e2e/security
- docker-compose.yml: stack local development
- docker-compose.prod.yml: stack production
- scripts/deploy-prod.sh: script deploy production

## Chạy local bằng Docker

Khởi động toàn bộ stack:

```sh
docker compose up -d --build
```

Các dịch vụ chính:

- API: http://localhost:3000
- Swagger UI (release 2.0.0): http://localhost:3000/api/docs/2.0.0
- OpenAPI JSON: http://localhost:3000/api/docs/2.0.0/openapi.json
- Legacy Swagger URL (temporary redirect): http://localhost:3000/api/docs
- PostgreSQL: localhost:5442
- Redis: localhost:6389
- MinIO: localhost:9000 (console 9001)
- Mailpit: localhost:1025 (UI 8025)

Dừng môi trường local:

```sh
docker compose down
```

## Bộ lệnh thường dùng

```sh
npm run build
npm run typecheck
npm run test
npm run test:integration
npm run test:e2e
npm run test:security
npm run openapi:generate
```

## Deploy production (thủ công, dễ kiểm soát)

Trên server, sau khi code mới đã được push lên main:

```sh
git pull --ff-only origin main
./scripts/deploy-prod.sh
```

Script deploy sẽ tự động:

- kiểm tra cấu hình compose production
- build lại image API
- đảm bảo PostgreSQL và Redis đang chạy
- chạy `prisma migrate deploy`
- recreate API container và chờ trạng thái healthy

Build sạch không dùng cache:

```sh
./scripts/deploy-prod.sh --no-cache
```

## Cấu hình môi trường

- Local: .env
- Production: .env.production

Không commit secrets thật vào repository. Secrets production chỉ lưu trên server.

Phiên bản tài liệu mặc định lấy từ `version` trong `package.json`. Khi phát hành
release mới (ví dụ `3.0.0`), bump package version trong commit release; sau
`git pull` và rebuild, Swagger tự xuất hiện tại `/api/docs/3.0.0`. Biến tùy chọn
`OPENAPI_VERSION` chỉ dùng khi cần override và không nên đặt cố định trên
production nếu muốn version tự đi theo code.

```sh
npm version 3.0.0 --no-git-tag-version
```

## Kiểm tra nhanh sau deploy

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 api
curl -i http://127.0.0.1:43000/health/live
curl -i http://127.0.0.1:43000/api/docs/2.0.0
curl -s http://127.0.0.1:43000/api/docs/2.0.0/openapi.json | jq '.info.version'
```

## Tài liệu liên quan

- docs/DEPLOYMENT.md: hướng dẫn deploy production chi tiết trên Ubuntu
- docs/openapi.json: tài liệu OpenAPI export

<p align="center">
  <img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExczVoYmIxdTV2eWd4dXQzc2QxMXhoM3gwbnluZXA0bnpwbzQ2NzM4NCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0MYt5jPR6QX5pnqM/giphy.gif" width="360" alt="Animated neon line" />
</p>

<p align="center">
	<img src="https://capsule-render.vercel.app/api?type=waving&height=110&color=0:F59E0B,30:F43F5E,65:A78BFA,100:22D3EE&section=footer&animation=twinkling" alt="Footer wave" />
</p>
