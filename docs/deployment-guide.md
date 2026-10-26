# Hướng Dẫn Triển Khai & Vận Hành Hệ Thống (Deployment & Operations Guide)

Tài liệu này cung cấp hướng dẫn toàn diện để thiết lập, triển khai và vận hành hệ thống **Enterprise Chat App** trên môi trường phát triển cục bộ (Local Development) và môi trường sản xuất (Production Deployment).

---

## 1. Yêu Cầu Hạ Tầng & Phần Cứng (Infrastructure Prerequisites)

### 1.1. Yêu Cầu Phần Cứng Khuyến Nghị

| Quy Mô Triển Khai | Số Người Dùng Đồng Thời | CPU | RAM | Dung Lượng Ổ Cứng (SSD) |
|-------------------|--------------------------|-----|-----|-------------------------|
| **Development** | 1 - 10 người | 2 Cores | 4 GB | 20 GB SSD |
| **Small Enterprise** | 50 - 500 người | 4 Cores | 8 GB | 100 GB SSD NVMe |
| **Medium/Large Enterprise** | 500 - 3,000 người | 8 Cores | 16 - 32 GB | 500 GB+ SSD NVMe (RAID 10) |

### 1.2. Yêu Cầu Phần Mềm Bắt Buộc
- **Hệ điều hành**: Linux (Ubuntu 22.04 LTS / Debian 12 / RHEL 9) hoặc Windows 11 / Windows Server 2022.
- **Node.js**: Phiên bản 20 LTS trở lên (`node -v` >= v20.10.0).
- **Package Manager**: `pnpm` phiên bản 9 trở lên (`pnpm -v` >= 9.0.0).
- **Container Engine**: Docker Engine 24+ và Docker Compose v2 (`docker compose version` >= v2.20.0).

---

## 2. Thiết Lập Môi Trường Phát Triển Cục Bộ (Local Development Setup)

### Bước 1: Clone Mã Nguồn & Cài Đặt Dependencies
```bash
git clone <repository_url> enterprise-chat-app
cd enterprise-chat-app

# Cài đặt toàn bộ dependencies trong pnpm workspace
pnpm install

# Biên dịch gói thư viện dùng chung trước tiên
pnpm --filter @enterprise-chat/shared-types build
```

### Bước 2: Khởi Chạy Hạ Tầng Cơ Sở Dữ Liệu Bằng Docker
Hệ thống cung cấp sẵn file `docker-compose.yml` định nghĩa PostgreSQL 16, Redis 7 và MinIO S3:
```bash
docker compose up -d
```
Kiểm tra trạng thái các container:
```bash
docker compose ps
```
- **PostgreSQL**: `localhost:5432` (User: `chat_admin`, Pass: `chat_secret_password`, DB: `enterprise_chat`)
- **Redis**: `localhost:6379`
- **MinIO S3**: `localhost:9000` (API) & `localhost:9001` (Bảng điều khiển Web Console với tài khoản `minio_admin` / `minio_secret_key`)

### Bước 3: Cấu Hình Biến Môi Trường (Environment Variables)
Tạo file `apps/server/.env` (tham khảo `apps/server/.env.example`):
```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://chat_admin:chat_secret_password@localhost:5432/enterprise_chat?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minio_admin
S3_SECRET_KEY=minio_secret_key
S3_BUCKET_NAME=enterprise-chat-files
JWT_SECRET=super_secret_jwt_access_key_development_2026!
JWT_REFRESH_SECRET=super_secret_jwt_refresh_key_development_2026!
```

### Bước 4: Đồng Bộ Schema & Nạp Dữ Liệu Mẫu (Seed Data)
```bash
# Sinh mã Prisma Client từ schema
pnpm --filter @enterprise-chat/server exec prisma generate

# Tạo migration và áp dụng vào PostgreSQL
pnpm --filter @enterprise-chat/server exec prisma migrate dev --name init

# Nạp tài khoản và dữ liệu phòng ban demo mẫu
pnpm --filter @enterprise-chat/server db:seed
```

### Bước 5: Khởi Chạy Các Ứng Dụng Khách & Máy Chủ

**Terminal 1 - Khởi chạy Backend Server (NestJS)**:
```bash
pnpm dev:server
# Server lắng nghe tại http://localhost:4000
```

**Terminal 2 - Khởi chạy Web Client (Next.js 15)**:
```bash
pnpm dev:web
# Truy cập giao diện tại http://localhost:3000
```

**Terminal 3 (Tùy chọn) - Khởi chạy Mobile Client (Expo / React Native)**:
```bash
cd apps/mobile
pnpm start
# Quét mã QR bằng ứng dụng Expo Go trên điện thoại, hoặc ấn 'a' để mở Android Emulator, 'i' để mở iOS Simulator
```

**Terminal 4 (Tùy chọn) - Khởi chạy Desktop Client (Electron)**:
```bash
cd apps/desktop
pnpm start
```

---

## 3. Triển Khai Môi Trường Sản Xuất Bằng Docker (Production Deployment)

Hệ thống cung cấp kịch bản đóng gói hoàn chỉnh sẵn sàng cho Production tại `docker-compose.prod.yml`:

```mermaid
graph TD
    UserClient[Người Dùng Trình Duyệt / App] -->|Port 80/443| Nginx[Nginx Reverse Proxy]
    
    subgraph DockerNetwork [Docker Internal Network]
        Nginx -->|Định tuyến /api/ & /socket.io/| BackendServer[Enterprise Chat Server - NestJS]
        Nginx -->|Định tuyến /| WebClient[Enterprise Chat Web - Next.js]
        
        BackendServer --> Postgres[(PostgreSQL 16 DB)]
        BackendServer --> Redis[(Redis 7 Pub/Sub & Presence)]
        BackendServer --> MinIO[(MinIO S3 Storage)]
    end
```

### 3.1. Cấu Hình Nginx Reverse Proxy (`docker/nginx.conf`)
Nginx đóng vai trò tiếp nhận kết nối bảo mật HTTPS và WSS, xử lý định tuyến và nâng cấp giao thức WebSocket:
```nginx
upstream chat_backend {
    server server:4000;
    keepalive 64;
}

upstream web_frontend {
    server web:3000;
}

server {
    listen 80;
    server_name chat.yourcompany.com;

    # Định tuyến WebSocket Gateway
    location /socket.io/ {
        proxy_pass http://chat_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Định tuyến REST API
    location /api/ {
        proxy_pass http://chat_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Định tuyến Giao Diện Web
    location / {
        proxy_pass http://web_frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3.2. Lệnh Khởi Chạy Production
```bash
# Build lại toàn bộ image và chạy ở chế độ nền
docker compose -f docker-compose.prod.yml up -d --build

# Xem nhật ký hoạt động của toàn bộ dịch vụ
docker compose -f docker-compose.prod.yml logs -f
```

---

## 4. Quản Trị MinIO Object Storage & CORS

Để người dùng có thể tải tệp tin dung lượng lớn trực tiếp từ trình duyệt Web lên MinIO thông qua Presigned PUT URL mà không bị lỗi trình duyệt chặn, cần cấu hình CORS cho bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]
```
Thực hiện qua MinIO Client (`mc`):
```bash
docker exec -it enterprise_chat_minio mc alias set local http://localhost:9000 minio_admin minio_secret_key
docker exec -it enterprise_chat_minio mc mb local/enterprise-chat-files --ignore-existing
docker exec -it enterprise_chat_minio mc anonymous set download local/enterprise-chat-files
```

---

## 5. Sao Lưu & Phục Hồi Cơ Sở Dữ Liệu (Backup & Restore)

### 5.1. Kịch Bản Sao Lưu Tự Động (`scripts/backup-db.ps1`)
Hệ thống có sẵn kịch bản sao lưu cơ sở dữ liệu định kỳ bằng PowerShell:
```powershell
./scripts/backup-db.ps1
```
Kịch bản tự động xuất file nén `dump_enterprise_chat_YYYYMMDD_HHmmss.sql` và lưu trữ an toàn trong thư mục `backups/`.

### 5.2. Lệnh Phục Hồi Dữ Liệu Thủ Công (Manual Restore)
```bash
# Phục hồi dữ liệu từ file dump vào container PostgreSQL
cat backup.sql | docker exec -i enterprise_chat_postgres psql -U chat_admin -d enterprise_chat
```

---

## 6. Giám Sát, Kiểm Tra Sức Khỏe & Xử Lý Sự Cố (Healthcheck & Troubleshooting)

### 6.1. Kiểm Tra Sức Khỏe Dịch Vụ
- **PostgreSQL**: `docker exec enterprise_chat_postgres pg_isready -U chat_admin -d enterprise_chat`
- **Redis**: `docker exec enterprise_chat_redis redis-cli ping` (Trả về `PONG`)
- **API Server**: `curl -I http://localhost:4000/api/health` hoặc kiểm tra port 4000 mở.

### 6.2. Các Lỗi Thường Gặp & Cách Khắc Phục

1. **Lỗi `WebSocket connection failed / 400 Bad Request`**:
   - *Nguyên nhân*: Nginx chưa cấu hình hoặc thiếu các header `Upgrade` và `Connection "upgrade"`.
   - *Khắc phục*: Kiểm tra lại khối `location /socket.io/` trong `docker/nginx.conf`.

2. **Lỗi `S3 SignatureDoesNotMatch` khi upload file**:
   - *Nguyên nhân*: Sai lệch đồng hồ hệ thống giữa máy chủ và container MinIO, hoặc biến `S3_ENDPOINT` không thể phân giải được từ máy khách.
   - *Khắc phục*: Đồng bộ giờ hệ thống bằng NTP (`timedatectl set-ntp on`) và kiểm tra URL presigned trả về cho client.

3. **Lỗi `PrismaClientKnownRequestError: P2002` (Unique constraint failed)**:
   - *Nguyên nhân*: Có 2 yêu cầu đồng thời tạo cuộc hội thoại 1-1 giữa cùng 2 người dùng (`directKey`).
   - *Khắc phục*: Backend đã có cơ chế tự động bắt mã `P2002` và truy vấn trả về cuộc hội thoại đã tồn tại.
