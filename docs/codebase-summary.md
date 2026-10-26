# Tổng Quan Mã Nguồn (Codebase Summary)

Tài liệu này cung cấp bức tranh toàn cảnh về cấu trúc mã nguồn, danh mục các gói trong Monorepo, chi tiết các module backend, thành phần frontend Web, ứng dụng Mobile, Desktop và các công nghệ cốt lõi của hệ thống **Enterprise Chat App**.

---

## 1. Giới Thiệu Chung

**Enterprise Chat App** là giải pháp giao tiếp và làm việc nhóm thời gian thực bảo mật cao dành cho doanh nghiệp, sẵn sàng tự lưu trữ (Self-hosted / On-premise) hoặc triển khai Private Cloud. Hệ thống kết hợp giữa kiến trúc backend chịu tải cao (NestJS, Redis Pub/Sub, PostgreSQL, MinIO) và bộ ba ứng dụng khách hiện đại (Web, Mobile iOS/Android, Desktop).

- **Mô hình kiến trúc**: Monorepo quản lý bởi `pnpm workspace`.
- **Hệ điều hành & Nền tảng khách**:
  - **Web**: Next.js 15 (App Router), React 19, Tailwind CSS.
  - **Mobile**: React Native, Expo SDK 58, Expo Router (hỗ trợ iOS & Android).
  - **Desktop**: Electron 33+ (Windows, macOS, Linux).
- **Ngôn ngữ**: TypeScript 5.7+ trên toàn bộ các workspace (bật `strict: true`).

---

## 2. Cấu Trúc Thư Mục Monorepo

```
enterprise-chat-app/
├── apps/
│   ├── server/             # NestJS 10 backend, Prisma ORM, Socket.io, S3 & JWT
│   │   ├── prisma/         # Schema, migrations & seed script
│   │   └── src/            # Auth, Users, Channels, Chat, Files, Prisma modules
│   ├── web/                # Next.js 15 Web Client (Slack/Teams UI, Dual-View)
│   │   └── src/            # App router, components, modals, stores, lib
│   ├── mobile/             # React Native / Expo SDK 52 Mobile Client (iOS & Android)
│   │   ├── app/            # Expo Router file-based routing (_layout, tabs, chat/[id])
│   │   └── src/            # Services (API client), Stores (Zustand mobile store)
│   └── desktop/            # Electron shell wrapper hỗ trợ Native Tray & OS Notifications
├── packages/
│   └── shared-types/       # Enums, Interfaces, DTOs, Socket Events dùng chung
├── docker/
│   ├── nginx.conf          # Cấu hình Reverse Proxy Nginx & định tuyến WebSocket
│   ├── server.Dockerfile   # Multi-stage Dockerfile cho backend NestJS
│   └── web.Dockerfile      # Multi-stage Dockerfile cho frontend Next.js
├── docs/                   # Kho tài liệu kỹ thuật, kiến trúc, quy chuẩn và vận hành
├── plans/                  # Kế hoạch phát triển và lộ trình chi tiết các giai đoạn
├── scripts/                # Kịch bản tiện ích (sao lưu database, bảo trì hệ thống)
├── tests/                  # Kịch bản kiểm thử tải và kiểm thử hiệu năng (K6)
├── docker-compose.yml      # Hạ tầng dịch vụ phát triển (Postgres, Redis, MinIO)
├── docker-compose.prod.yml # Toàn bộ stack triển khai production hoàn chỉnh
├── package.json            # Cấu hình workspace gốc và các script điều phối
└── tsconfig.base.json      # Cấu hình TypeScript cơ sở kế thừa cho toàn dự án
```

---

## 3. Chi Tiết Các Ứng Dụng Trong Monorepo

### 3.1. Backend Server (`apps/server`)
Xây dựng trên nền tảng **NestJS 10**, tuân thủ kiến trúc Modular Monolith với khả năng mở rộng ngang (Horizontal Scale) qua Redis adapter:

| Module | Đường Dẫn | Trách Nhiệm Chính |
|--------|-----------|-------------------|
| **AuthModule** | `src/modules/auth/` | Đăng ký, đăng nhập bcrypt, JWT Passport strategy, cấp phát/thu hồi token & quản lý session. |
| **UsersModule** | `src/modules/users/` | Quản lý hồ sơ nhân viên, phòng ban, danh bạ nhân sự, cập nhật trạng thái presence (Online/Away/Busy/Offline). |
| **ChannelsModule** | `src/modules/channels/` | Tạo và quản lý kênh chat (`COMPANY`, `DEPARTMENT`, `PRIVATE`), xử lý cuộc hội thoại trực tiếp 1-1 (`DIRECT`) với khóa unique `directKey`. |
| **ChatModule** | `src/modules/chat/` | Xử lý tin nhắn (gửi, sửa, thu hồi), tương tác cảm xúc emoji, bình chọn khảo sát (Polls), Socket.io WebSocket Gateway thời gian thực. |
| **FilesModule** | `src/modules/files/` | Tích hợp AWS S3 / MinIO, cấp Presigned Upload & Download URL có thời hạn, làm sạch tên tệp tin và xác thực quyền sở hữu attachment. |
| **PrismaModule** | `src/prisma/` | Kết nối cơ sở dữ liệu PostgreSQL qua Prisma Client, chạy migrations và nạp dữ liệu mẫu (seed data). |

### 3.2. Web Client (`apps/web`)
Xây dựng trên nền tảng **Next.js 15 (App Router)** và **React 19**:
- **Chế độ hiển thị kép (Dual-View)**:
  - `Full Workstation View`: Giao diện 3 cột chuyên nghiệp (Sidebar, Chat Area, InfoPanel).
  - `Floating Chat Widget`: Tiện ích thu nhỏ dạng popup ở góc dưới màn hình, phù hợp nhúng hoặc làm việc song song.
- **Quản lý trạng thái**: Zustand store (`useChatStore.ts`) quản lý danh sách cuộc hội thoại, tin nhắn, người dùng hiện tại, trạng thái kết nối socket, bộ lọc tìm kiếm và các modal tương tác.
- **Thành phần & Modals chuyên dụng**:
  - `ConversationList.tsx`: Hiển thị danh sách kênh và người liên hệ kèm trạng thái online và tin nhắn chưa đọc.
  - `MessageList.tsx` & `MessageItem.tsx`: Danh sách tin nhắn cuộn mượt, hiển thị tệp đính kèm, tin nhắn thoại, bình chọn poll, thả emoji.
  - `MessageInput.tsx`: Khung soạn thảo tin nhắn, hỗ trợ dán ảnh từ clipboard, đính kèm tệp, ghi âm tin nhắn thoại.
  - `PinnedMessageBar.tsx`: Thanh ghim các thông báo và tin nhắn quan trọng trong kênh.
  - `InChatSearchBar.tsx`: Tìm kiếm nhanh tin nhắn trong cuộc hội thoại hiện tại.
  - `AiSummaryModal.tsx`: Tóm tắt nội dung cuộc thảo luận và trích xuất hành động bằng AI.
  - `CallModal.tsx`: Giao diện gọi thoại và gọi video nội bộ.
  - `CreateGroupModal.tsx` & `CreatePollModal.tsx`: Tạo kênh chat mới hoặc tạo cuộc khảo sát ý kiến.
  - `StarredMessagesModal.tsx`: Quản lý danh sách tin nhắn đã đánh dấu sao.
  - `soundService.ts`: Phát âm thanh thông báo và chuông gọi bằng Web Audio API tổng hợp.

### 3.3. Mobile Client (`apps/mobile`)
Xây dựng trên nền tảng **React Native 0.76** và **Expo SDK 52**:
- **Điều hướng File-Based**: Sử dụng `expo-router` v4:
  - `app/_layout.tsx`: Root stack layout và thiết lập vùng an toàn.
  - `app/(tabs)/_layout.tsx`: Thanh điều hướng tab dưới cùng (Channels, Direct Messages, Settings).
  - `app/(tabs)/index.tsx`, `channels.tsx`, `direct.tsx`, `settings.tsx`: Các màn hình danh mục chính.
  - `app/chat/[id].tsx`: Màn hình trò chuyện chi tiết tối ưu cảm ứng.
- **Styling**: Sử dụng `nativewind` (Tailwind CSS cho React Native) mang lại giao diện đồng nhất với bản Web.
- **Quản lý dữ liệu**: `useMobileChatStore.ts` đồng bộ dữ liệu thời gian thực và `api.ts` kết nối REST API.

### 3.4. Desktop Client (`apps/desktop`)
- Đóng gói bằng **Electron 33+**, nạp giao diện từ ứng dụng Web.
- Tích hợp sâu vào hệ điều hành thông qua `preload.js` và `main.js`:
  - Khay hệ thống (System Tray) cho phép thu nhỏ ứng dụng chạy nền.
  - Thông báo Toast bản địa của hệ điều hành (Native OS Notifications) khi có tin nhắn mới hoặc cuộc gọi đến.
  - Phím tắt mở nhanh cửa sổ chat (`Cmd/Ctrl + Shift + C`).

### 3.5. Gói Thư Viện Dùng Chung (`packages/shared-types`)
- Là nguồn chân lý (Source of Truth) về kiểu dữ liệu cho toàn bộ Monorepo.
- Chứa các định nghĩa TypeScript: `UserRole`, `PresenceStatus`, `ConversationType`, `ChannelScope`, `MessageType`, `MessageDeliveryStatus`, `UserProfile`, `Department`, `AttachmentMetadata`, `ChatVoiceData`, `ChatPollOption`, các sự kiện WebSocket (`SocketEvents`), và các DTOs.

---

## 4. Bảng Tổng Hợp Công Nghệ & Phiên Bản

| Thành Phần | Công Nghệ Chính | Phiên Bản | Ghi Chú |
|------------|-----------------|-----------|---------|
| **Core Runtime** | Node.js | v20+ LTS | Môi trường thực thi Javascript/TypeScript |
| **Monorepo Tool** | pnpm | v9+ | Quản lý workspace và chia sẻ dependencies |
| **Backend Framework** | NestJS | 10.4.x | Modular architecture, Dependency Injection |
| **Database ORM** | Prisma | 6.1.x | Type-safe database client & migrations |
| **Cơ Sở Dữ Liệu** | PostgreSQL | 16-alpine | Cơ sở dữ liệu quan hệ chính |
| **Bộ Nhớ Đệm & Pub/Sub** | Redis | 7-alpine | Presence cache & Socket.io multi-server adapter |
| **Lưu Trữ Tệp Tin** | MinIO / AWS S3 | Release 2024+ | Lưu trữ đối tượng S3-compatible, Presigned URLs |
| **Realtime Engine** | Socket.io | 4.8.x | WebSocket 2 chiều với fallback polling |
| **Frontend Framework** | Next.js | 15.1.x | App Router, React 19, Server Components |
| **CSS Styling** | Tailwind CSS | 3.4.x | Utility-first CSS, 5 bộ themes tùy chỉnh |
| **Mobile Framework** | Expo / React Native | Expo 52 / RN 0.76 | Ứng dụng di động iOS & Android |
| **Mobile Routing** | Expo Router | 4.0.x | File-based navigation |
| **Desktop Shell** | Electron | 33.x | Đóng gói máy tính đa nền tảng |
| **Reverse Proxy** | Nginx | Alpine | Load balancer, SSL termination & WebSocket routing |
