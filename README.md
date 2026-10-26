# Enterprise Chat - Internal Company Chat Platform

Nền tảng giao tiếp & trao đổi nội bộ thời gian thực bảo mật cao dành cho doanh nghiệp, được thiết kế theo kiến trúc Modular Monolith trên nền tảng pnpm workspace, sẵn sàng tự lưu trữ (Self-hosted / On-premise) hoặc triển khai Private Cloud.

---

## 🏛 Kiến Trúc Hệ Thống (Architecture Overview)

- **Backend Server (`apps/server`)**: NestJS 10 (TypeScript), Prisma 6 ORM, Socket.io 4 với `@socket.io/redis-adapter` hỗ trợ mở rộng ngang đa node cluster.
- **Cơ Sở Dữ Liệu**: PostgreSQL 16 (lưu trữ Users, Departments, Messages, Conversations, Polls, Audit Logs).
- **Bộ Nhớ Đệm & Pub/Sub**: Redis 7 (Quản lý User Presence online/away/busy/offline, phân phối sự kiện chat cluster đa máy chủ, Rate Limiting).
- **Lưu Trữ Tệp Tin**: MinIO S3-compatible (Lưu trữ và chia sẻ tài liệu doanh nghiệp qua Presigned URL bảo mật, tải trực tiếp client-to-storage).
- **Web Client (`apps/web`)**: Next.js 15, React 19, Tailwind CSS, Lucide Icons, Zustand, chế độ hiển thị kép (Full Workstation & Floating Widget), 5 bộ chủ đề (Themes).
- **Mobile Client (`apps/mobile`)**: React Native 0.76, Expo SDK 52, Expo Router v4, NativeWind hỗ trợ đa nền tảng iOS & Android.
- **Desktop Client (`apps/desktop`)**: Đóng gói native bằng Electron 33+, tích hợp khay hệ thống (System Tray) và thông báo Toast hệ điều hành.
- **Thư Viện Dùng Chung (`packages/shared-types`)**: Định nghĩa tập trung Enums, DTOs, Socket Events và Interfaces cho toàn bộ monorepo.

```
enterprise-chat-app/
├── apps/
│   ├── server/             # NestJS API & WebSocket Gateway
│   ├── web/                # Next.js 15 Web Client (Full View & Floating Widget)
│   ├── mobile/             # React Native / Expo Mobile App (iOS & Android)
│   └── desktop/            # Electron Desktop Shell (System Tray & OS Notifications)
├── packages/
│   └── shared-types/       # Enums, DTOs, Socket Events dùng chung
├── docker/                 # Nginx Reverse Proxy & Multi-stage Dockerfiles
├── docs/                   # Kho tài liệu kỹ thuật, kiến trúc & quy chuẩn
├── plans/                  # Kế hoạch chi tiết & lộ trình phát triển ClaudeKit
├── scripts/                # Kịch bản sao lưu & bảo trì hệ thống
├── tests/                  # Kịch bản kiểm thử tải K6 (WebSocket load test)
├── docker-compose.yml      # Hạ tầng phát triển (Postgres, Redis, MinIO)
└── docker-compose.prod.yml # Toàn bộ stack triển khai production
```

---

## 🚀 Khởi Động Nhanh (Quick Start)

### 1. Cài Đặt Dependencies
```bash
pnpm install
pnpm --filter @enterprise-chat/shared-types build
```

### 2. Khởi Chạy Hạ Tầng Dữ Liệu (Docker)
```bash
docker compose up -d
```
*(Khởi động PostgreSQL trên port `5432`, Redis trên port `6379`, MinIO trên port `9000/9001`).*

### 3. Đồng Bộ Database & Seed Dữ Liệu Mẫu
```bash
pnpm --filter @enterprise-chat/server exec prisma generate
pnpm --filter @enterprise-chat/server exec prisma migrate dev --name init
pnpm --filter @enterprise-chat/server db:seed
```

### 4. Khởi Chạy Các Ứng Dụng

```bash
# Terminal 1: Chạy Backend Server (NestJS - Port 4000)
pnpm dev:server

# Terminal 2: Chạy Web Client (Next.js - Port 3000)
pnpm dev:web

# Terminal 3 (Tùy chọn): Chạy Mobile Client (Expo - iOS / Android)
cd apps/mobile && pnpm start

# Terminal 4 (Tùy chọn): Chạy Native Desktop Window (Electron)
cd apps/desktop && pnpm start
```

Truy cập ứng dụng Web tại: [http://localhost:3000](http://localhost:3000).

---

## 👥 Tài Khoản Demo Mặc Định

Mật khẩu chung cho tất cả tài khoản demo: `Company@123`

| Họ và Tên | Email Đăng Nhập | Vai Trò (`UserRole`) | Phòng Ban |
|---|---|---|---|
| **Nguyễn Văn Quản Trị** | `admin@company.com` | `SUPER_ADMIN` | Ban Giám Đốc |
| **Trần Trọng Kỹ Thuật** | `lead.tech@company.com` | `DEPARTMENT_MANAGER` | Công Nghệ & Kỹ Thuật |
| **Lê Hoàng Lập Trình** | `developer@company.com` | `EMPLOYEE` | Công Nghệ & Kỹ Thuật |
| **Phạm Thị Nhân Sự** | `hr@company.com` | `EMPLOYEE` | Phòng Nhân Sự |

---

## 🛡 Tính Năng Nổi Bật (Key Features)

- **Nhắn tin thời gian thực (<50ms)**: Sử dụng Socket.io cluster qua Redis Pub/Sub, tối ưu hóa độ trễ và khả năng mở rộng.
- **Kênh thông minh & Phân quyền**: Kênh toàn công ty (`#thong-bao-cong-ty`), Kênh phòng ban riêng tư (`#engineering-core`), và Chat 1-1 trực tiếp với khóa chống trùng lặp `directKey`.
- **Bảo mật & Phân quyền RBAC**: Phân cấp 5 vai trò (`SUPER_ADMIN`, `ORG_ADMIN`, `DEPARTMENT_MANAGER`, `EMPLOYEE`, `GUEST`). Chống BOLA và IDOR ở cả tầng HTTP và WebSocket.
- **Chia sẻ tài liệu trực tiếp S3**: Sử dụng MinIO S3 Presigned URL đẩy tải file trực tiếp client-to-storage, bảo vệ bộ nhớ API server.
- **Đa phương tiện & Tương tác cao**: Tin nhắn thoại (Voice Message kèm sóng âm), Khảo sát bình chọn (Polls trực tiếp), Phản ứng biểu tượng cảm xúc (Reactions emoji), Ghim tin nhắn (Pinned), Đánh dấu sao (Starred).
- **Trí tuệ nhân tạo (AI)**: Cửa sổ tóm tắt nội dung cuộc thảo luận và trích xuất danh sách việc cần làm (AI Summary Modal).
- **Cuộc gọi nội bộ**: Giao diện mô phỏng cuộc gọi thoại và video (Call Modal) với kiểm soát camera/mic.
- **Giao diện hiển thị kép (Dual-View)**: Chuyển đổi linh hoạt giữa giao diện đầy đủ 3 cột và tiện ích nổi (Floating Chat Widget) tiện dụng.
- **5 Bộ giao diện chuyên nghiệp**: Default Dark, Slate Corporate, Midnight Navy, Emerald Forest, Rose Minimal.

---

## 📚 Danh Mục Tài Liệu Kỹ Thuật (Documentation Index)

Toàn bộ tài liệu chi tiết của dự án được lưu trữ tại thư mục [`docs/`](./docs):

1. **[Tổng Quan Dự Án & Yêu Cầu Sản Phẩm (PDR)](./docs/project-overview-pdr.md)** (`docs/project-overview-pdr.md`): Tầm nhìn dự án, bài toán kinh doanh, chân dung người dùng (User Personas), yêu cầu chức năng và phi chức năng.
2. **[Kiến Trúc Hệ Thống & Luồng Dữ Liệu](./docs/system-architecture.md)** (`docs/system-architecture.md`): Sơ đồ kiến trúc tổng thể, luồng WebSocket qua Redis Adapter, S3 direct presign flow và ma trận phân quyền RBAC.
3. **[Tổng Quan Mã Nguồn Monorepo](./docs/codebase-summary.md)** (`docs/codebase-summary.md`): Chi tiết cấu trúc thư mục, danh mục module NestJS, thành phần Web Next.js, ứng dụng Mobile Expo, Electron Desktop và bảng công nghệ.
4. **[Tiêu Chuẩn Lập Trình & Quy Chuẩn Phát Triển](./docs/code-standards.md)** (`docs/code-standards.md`): Quy định bắt buộc về RBAC, phòng chống BOLA/IDOR trong WebSocket, xử lý race condition, refresh token rotation và các cổng kiểm thử (Verification Gates).
5. **[Hướng Dẫn Thiết Kế UI/UX & Giao Diện](./docs/design-guidelines.md)** (`docs/design-guidelines.md`): Quy chuẩn 5 bộ themes, màu sắc trạng thái hiện diện, kiến trúc Dual-View, quy chuẩn bong bóng chat, bình chọn, âm thanh Web Audio API.
6. **[Hướng Dẫn Triển Khai & Vận Hành](./docs/deployment-guide.md)** (`docs/deployment-guide.md`): Thiết lập môi trường phát triển cục bộ, cấu hình production bằng Docker Compose, reverse proxy Nginx, MinIO S3 CORS, sao lưu database và xử lý sự cố.
7. **[Lộ Trình Phát Triển Dự Án](./docs/project-roadmap.md)** (`docs/project-roadmap.md`): Các mốc phát triển đã hoàn thành, lộ trình ngắn hạn (LiveKit WebRTC, Push Notifications, E2EE) và trung hạn (SSO, AI Copilot, DLP).
