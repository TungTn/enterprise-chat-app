# Tiêu Chuẩn Lập Trình & Quy Chuẩn Phát Triển (Code Standards & Compliance Guidelines)

Tài liệu này quy định các tiêu chuẩn kỹ thuật bắt buộc, nguyên tắc bảo mật và quy trình đảm bảo chất lượng mã nguồn áp dụng cho toàn bộ dự án **Enterprise Chat App** (Monorepo gồm `apps/server`, `apps/web`, `apps/desktop`, `packages/shared-types`).

---

## 1. Nguyên Tắc Cốt Lõi (Core Principles)

Mọi kỹ sư và agent tham gia phát triển dự án bắt buộc phải tuân thủ 3 nguyên tắc:

- **YAGNI (You Aren't Gonna Need It)**: Không viết mã trừu tượng hoá trước, không thêm tính năng phỏng đoán nếu chưa nằm trong phạm vi nghiệp vụ được phê duyệt.
- **KISS (Keep It Simple, Stupid)**: Ưu tiên thiết kế trực quan, dễ bảo trì, luồng dữ liệu rõ ràng hơn là các giải pháp phức tạp hóa.
- **DRY (Don't Repeat Yourself)**: Tận dụng tối đa `packages/shared-types` cho các DTOs, Enums, Socket Events và Interface dùng chung giữa Backend, Frontend Web và Electron Desktop.

---

## 2. Tiêu Chuẩn Bảo Mật & Xác Thực (Security & Auth Compliance)

### 2.1. Phân quyền và Vai trò (RBAC)
- **Tuyệt đối không cho phép tự đăng ký vai trò (Privilege Escalation)**:
  - Endpoint đăng ký công khai `/api/auth/register` chỉ gán mặc định `UserRole.EMPLOYEE`.
  - Không expose trường `role` trong `RegisterDto` cho người dùng công khai.
  - Việc cấp quyền `SUPER_ADMIN`, `ORG_ADMIN`, `DEPARTMENT_MANAGER` bắt buộc phải thực hiện thông qua endpoint quản trị được bảo vệ bởi `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles(UserRole.SUPER_ADMIN)`.
- **Nguyên tắc đặc quyền tối thiểu (Least Privilege)**:
  - Mọi controller/resolver phải mặc định được bảo vệ bởi `JwtAuthGuard`. Chỉ sử dụng public decorator `@Public()` khi có lý do chính đáng (Login, Healthcheck).

### 2.2. Quản lý Phiên (Session) & Token Rotation
- **Ràng buộc Refresh Token với Database Session**:
  - Không chỉ dùng `jwtService.verify()`. Bắt buộc phải đối chiếu session ID/hash trong cơ sở dữ liệu (`prisma.session`).
  - Khi user logout hoặc bị thu hồi quyền, xóa session trong DB và vô hiệu hóa ngay lập tức.
  - Áp dụng cơ chế **Refresh Token Rotation**: Mỗi lần đổi access token mới phải hủy refresh token cũ và cấp refresh token mới kèm cập nhật hash trong session DB.

### 2.3. Chống Eavesdropping & BOLA (Broken Object Level Authorization) trong WebSocket
- **Kiểm tra quyền truy cập Room trước khi cho phép Join**:
  - Trong `ChatGateway`, sự kiện `conversation:join` **bắt buộc** phải kiểm tra người dùng có phải là thành viên hợp lệ (`ConversationMember`) của cuộc hội thoại đó hay không trước khi gọi `client.join("conversation:" + id)`.
  - Tuyệt đối không cho phép client tự do join room nếu không có quyền, ngăn chặn rò rỉ tin nhắn bảo mật của phòng ban khác hoặc DM riêng tư.

### 2.4. Kiểm soát IDOR trên Kênh & Tệp tin
- **Kiểm tra quyền xem tin nhắn & thông tin hội thoại**:
  - Với hội thoại `DIRECT` (DM) và kênh `PRIVATE`: Chỉ có thành viên trong `ConversationMember` mới có quyền xem thông tin (`getChannelById`) và lịch sử tin nhắn (`getMessages`).
  - Với kênh `DEPARTMENT`: Chỉ nhân viên thuộc phòng ban đó hoặc Admin mới có quyền truy cập.
- **Bảo vệ quyền sở hữu Attachment**:
  - Khi liên kết attachment vào tin nhắn (`sendMessage`), phải kiểm tra chặt chẽ:
    ```typescript
    where: {
      id: { in: dto.attachmentIds },
      uploaderId: userId,
      conversationId: dto.conversationId,
    }
    ```
  - Tuyệt đối không cho phép chiếm đoạt attachment của user khác hoặc từ conversation khác.

### 2.5. Phòng chống Injection & Path Traversal
- **Lưu trữ Tệp tin (S3/MinIO)**:
  - Tên tệp tin gốc (`fileName`) từ client phải được làm sạch bằng `path.basename()` và loại bỏ các ký tự đặc biệt (`../`, ký tự điều khiển) trước khi ghép vào S3 Key.
  - Sử dụng định dạng key: `conversations/{conversationId}/{uuid}-{sanitizedFileName}`.
- **Validation DTO Chặt chẽ**:
  - Luôn kích hoạt `whitelist: true`, `transform: true`, `forbidNonWhitelisted: true` trong NestJS `ValidationPipe`.
  - Mọi mảng truyền vào (ví dụ `memberIds`, `attachmentIds`) phải có `@IsArray()`, `@IsString({ each: true })`, `@IsUUID(4, { each: true })`.

### 2.6. Chống Brute-Force & Rate Limiting
- Cấu hình `@nestjs/throttler` trên toàn bộ API, đặc biệt là:
  - `/api/auth/login`: Tối đa 5 requests / phút / IP.
  - `/api/auth/register`: Tối đa 3 requests / phút / IP.
  - `/api/files/presign-upload`: Tối đa 20 requests / phút / user.

---

## 3. Quản Lý Đồng Thời & Race Conditions (Concurrency Standards)

### 3.1. Tạo Hội Thoại 1-1 (Direct Messages)
- **Tránh Anti-pattern "Find-or-Create" không đồng bộ**:
  - Không thực hiện `findFirst` rồi `create` một cách rời rạc mà không có khoá ràng buộc.
  - Giải pháp: Thêm trường `directKey` dạng chuỗi sắp xếp (`[userIdA, userIdB].sort().join(':')`) có đánh chỉ mục `@unique` trong bảng `Conversation`.
  - Sử dụng `upsert` hoặc bắt lỗi vi phạm khoá duy nhất (`P2002`) để trả về cuộc hội thoại đã tồn tại nếu có 2 yêu cầu xảy ra đồng thời.

### 3.2. Tương Tác Cảm Xúc (Reactions)
- Hành động thêm/bỏ cảm xúc (Toggle emoji) có thể bị click đúp nhanh chóng:
  - Bắt buộc xử lý lỗi `PrismaClientKnownRequestError` mã `P2002` khi ghi nhận cảm xúc.
  - Không để lỗi duplicate key gây sập request hoặc crash websocket handler.

---

## 4. Kiến Trúc Thời Gian Thực & Đồng Bộ Đa Server (Realtime & Cluster Architecture)

### 4.1. Kiến Trúc Adapter Redis
- **Không dùng bộ nhớ trong (In-Memory Map) cho Presence khi chạy Cluster**:
  - Dự án thiết kế chạy nhiều node NestJS phía sau Nginx/Load Balancer.
  - Bắt buộc cấu hình `@socket.io/redis-adapter` và `ioredis` trong `main.ts` thông qua Custom WebSocket Adapter.
  - Lưu trạng thái Presence (Online/Offline) và danh sách Socket ID của người dùng vào Redis Set (`sadd`/`srem`) kèm TTL heart-beat, thay vì biến nội bộ `Map<string, Set<string>>`.

### 4.2. Đồng Bộ Giữa REST API và WebSocket
- Bất kỳ thao tác chỉnh sửa tin nhắn, thu hồi tin nhắn hoặc gửi tin nhắn thông qua REST API (`/api/chat/...`) đều phải phát (broadcast) sự kiện tương ứng qua Socket.io/Redis đến toàn bộ client đang theo dõi hội thoại.

---

## 5. Quy Chuẩn Code (Coding Conventions)

### 5.1. TypeScript & Type Safety
- **Strict Mode**: `tsconfig.base.json` bật `"strict": true`, `"noImplicitAny": true`.
- **Cấm dùng `any` bừa bãi**:
  - Định nghĩa rõ kiểu dữ liệu trong `packages/shared-types`.
  - Khi tương tác với Prisma Client, sử dụng Prisma generated payload types (`Prisma.MessageGetPayload<...>`) thay vì ép kiểu `any`.
- **Sử dụng DTO & Shared Types**:
  - Toàn bộ DTO, Enum (UserRole, PresenceStatus, ChannelScope, MessageType) phải được import từ `@enterprise-chat/shared-types`.

### 5.2. Quản Lý Lỗi & Ngoại Lệ (Error Handling)
- Luôn sử dụng Built-in HTTP Exceptions của NestJS:
  - `NotFoundException` khi không tìm thấy thực thể.
  - `ForbiddenException` khi không đủ thẩm quyền / vi phạm RBAC.
  - `UnauthorizedException` khi token không hợp lệ hoặc hết hạn.
  - `ConflictException` khi dữ liệu đã tồn tại hoặc vi phạm ràng buộc trạng thái.
  - `BadRequestException` khi tham số đầu vào không hợp lệ.
- Không để lộ thông tin nhạy cảm của hệ thống (stack trace, câu lệnh SQL nội bộ) ra response client trong môi trường production.

### 5.3. Quy Chuẩn Đặt Tên & Cấu Trúc File
- File và thư mục: Tuân thủ **kebab-case** (ví dụ: `auth.service.ts`, `jwt-auth.guard.ts`, `create-channel.dto.ts`).
- Class: **PascalCase** (ví dụ: `ChatGateway`, `ChannelsService`).
- Phương thức, biến: **camelCase** (ví dụ: `getUserConversations`, `activeUsers`).
- Constants / Enums: **UPPER_SNAKE_CASE** (ví dụ: `USER_TYPING`, `SUPER_ADMIN`).

---

## 6. Tiêu Chuẩn Cơ Sở Dữ Liệu & Prisma

- **Migrations**: Mọi thay đổi schema phải được thực hiện qua `prisma migrate dev --name <descriptive_name>`. Không sửa trực tiếp database.
- **Indexes**:
  - Luôn đánh chỉ mục trên các cột thường xuyên query/join: `userId`, `conversationId`, `createdAt`, `departmentId`.
  - Luôn đánh compound index cho các query phân trang theo thời gian: `@@index([conversationId, createdAt])`.
- **Phân trang bắt buộc (Pagination)**:
  - Không bao giờ chạy `findMany` mà không có giới hạn `take`.
  - Mọi endpoint danh sách (`users`, `messages`, `channels`) bắt buộc có `take` (mặc định 20-50, tối đa 100) và hỗ trợ cursor-based pagination hoặc skip/page.

---

## 7. Cổng Kiểm Tra Chất Lượng Trước Khi Giao Mã (Verification Gates)

Mỗi khi hoàn thành tính năng hoặc sửa lỗi, **nghiêm cấm** tuyên bố hoàn thành mà không có bằng chứng chạy thực tế:

1. **Kiểm tra biên dịch**: Chạy `pnpm build` không có bất kỳ lỗi TypeScript nào.
2. **Kiểm tra linter**: Chạy `pnpm lint` không có cảnh báo/lỗi vi phạm.
3. **Kiểm tra Unit/Integration Test**: Toàn bộ test suite chạy thành công (`0 failures`).
4. **Kiểm tra Security Checklist**:
   - [ ] Có endpoint mới nào thiếu guard/phân quyền không?
   - [ ] Có tham số người dùng nào truyền thẳng vào shell/file/S3 key không?
   - [ ] Có IDOR nào cho phép user xem trộm tin nhắn hoặc lấy file của người khác không?
   - [ ] Đã kiểm tra race condition khi 2 request cùng gọi đồng thời chưa?
