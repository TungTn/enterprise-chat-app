# Enterprise Chat - Internal Company Chat Platform

Nền tảng giao tiếp & trao đổi nội bộ thời gian thực bảo mật cao dành cho doanh nghiệp, được thiết kế theo kiến trúc Microservice/Modular Monolith sẵn sàng tự lưu trữ (Self-hosted / On-premise) hoặc triển khai Private Cloud.

---

## 🏛 Kiến trúc Hệ thống (Architecture)

- **Backend:** NestJS 10 (TypeScript), Prisma ORM, Socket.io với `@socket.io/redis-adapter` hỗ trợ scale ngang.
- **Database:** PostgreSQL 16 (Relational DB lưu trữ Users, Departments, Messages, Conversations, Audit Logs).
- **In-Memory Cache & Pub/Sub:** Redis 7 (Quản lý User Presence online/away/offline, phân phối sự kiện chat đa server, Rate Limiting).
- **Object Storage:** MinIO S3-compatible (Lưu trữ và chia sẻ tài liệu doanh nghiệp qua Presigned URL bảo mật).
- **Frontend Web & Desktop:** Next.js 15, React 19, Tailwind CSS, Lucide Icons, đóng gói ứng dụng Desktop bằng Electron / Tauri.

```
enterprise-chat-app/
├── apps/
│   ├── server/             # NestJS API & WebSocket Gateway
│   │   ├── prisma/         # Schema, migrations & seed script
│   │   └── src/            # Auth, Users, Channels, Chat, Files modules
│   ├── web/                # Next.js 15 Web Client (Slack/Teams UI)
│   └── desktop/            # Electron / Tauri Desktop Packaging
├── packages/
│   └── shared-types/       # Enums, DTOs & Interfaces dùng chung
├── docker/                 # Nginx proxy config & Production Dockerfiles
├── docker-compose.yml      # Local dev database, redis, minio
├── docker-compose.prod.yml # Production full-stack containerization
└── plans/                  # Kế hoạch triển khai quản lý bởi ClaudeKit
```

---

## 🚀 Khởi động Nhanh (Quick Start)

### 1. Cài đặt Dependencies
```bash
pnpm install
pnpm --filter @enterprise-chat/shared-types build
```

### 2. Khởi chạy Hạ tầng Dữ liệu (Docker)
```bash
docker compose up -d
```
*(Khởi động PostgreSQL trên port 5432, Redis trên port 6379, MinIO trên port 9000/9001).*

### 3. Đồng bộ Database & Seed Dữ liệu Mẫu
```bash
pnpm --filter @enterprise-chat/server exec prisma generate
pnpm --filter @enterprise-chat/server exec prisma migrate dev --name init
pnpm --filter @enterprise-chat/server db:seed
```

### 4. Khởi chạy Ứng dụng
```bash
# Terminal 1: Chạy Backend Server
pnpm dev:server

# Terminal 2: Chạy Web Client
pnpm dev:web

# Terminal 3 (Tùy chọn): Chạy Native Desktop Window
cd apps/desktop && pnpm start
```

Mở trình duyệt tại: [http://localhost:3000](http://localhost:3000).

---

## 👥 Tài khoản Demo Đã Cài Đặt Sẵn

Mật khẩu chung cho tất cả tài khoản: `Company@123`

| Họ và tên | Email | Vai trò (Role) | Phòng ban |
|---|---|---|---|
| Nguyễn Văn Quản Trị | `admin@company.com` | `SUPER_ADMIN` | Ban Giám Đốc |
| Trần Trọng Kỹ Thuật | `lead.tech@company.com` | `DEPARTMENT_MANAGER` | Công Nghệ & Kỹ Thuật |
| Lê Hoàng Lập Trình | `developer@company.com` | `EMPLOYEE` | Công Nghệ & Kỹ Thuật |
| Phạm Thị Nhân Sự | `hr@company.com` | `EMPLOYEE` | Phòng Nhân Sự |

---

## 🛡 Tính Năng Nổi Bật (Key Features)

- **Nhắn tin thời gian thực (<50ms):** Sử dụng Socket.io cluster qua Redis Pub/Sub, không lo nghẽn mạng hay trễ tin.
- **Kênh thông minh:** Kênh toàn công ty (`#thong-bao-cong-ty`), Kênh phòng ban riêng tư (`#engineering-core`), và Chat 1-1 trực tiếp giữa đồng nghiệp.
- **Bảo mật & Phân quyền RBAC:** Phân cấp rõ ràng giữa SuperAdmin, Trưởng bộ phận, và Nhân viên. Tự động kiểm tra quyền trên cả HTTP API và WebSocket events.
- **Chia sẻ tài liệu tối ưu:** Sử dụng MinIO S3 Presigned URL đẩy tải file trực tiếp giữa client và storage, không tốn RAM của API server.
- **Trải nghiệm Desktop:** Hỗ trợ thông báo Toast hệ thống, biểu tượng khay hệ thống (System Tray), tự động kết nối lại khi mạng gián đoạn.

---

## 📚 Tài Liệu Kỹ Thuật & Quy Chuẩn (Documentation)

Chi tiết quy chuẩn phát triển và tài liệu kiến trúc được lưu trữ tại thư mục [`docs/`](./docs):

- **[Quy Chuẩn Lập Trình & Tiêu Chuẩn Bảo Mật](./docs/code-standards.md)** (`docs/code-standards.md`): Quy định bắt buộc về RBAC, phòng chống BOLA/IDOR trong WebSocket, xử lý race condition, refresh token rotation và các cổng kiểm thử (Verification Gates).
- **[Kiến Trúc Hệ Thống & Luồng Dữ Liệu](./docs/system-architecture.md)** (`docs/system-architecture.md`): Sơ đồ kiến trúc tổng thể, luồng WebSocket qua Redis Adapter, S3 direct presign flow và ma trận phân quyền.
- **[Tổng Quan Mã Nguồn Monorepo](./docs/codebase-summary.md)** (`docs/codebase-summary.md`): Mô tả cấu trúc gói, danh mục module NestJS backend, ứng dụng Next.js và Electron desktop.

