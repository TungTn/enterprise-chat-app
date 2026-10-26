# Tổng Quan Dự Án & Yêu Cầu Phát Triển Sản Phẩm (Project Overview & PDR)

Tài liệu này định nghĩa tầm nhìn sản phẩm, bài toán kinh doanh, chân dung người dùng (User Personas), các yêu cầu chức năng (Functional Requirements) và phi chức năng (Non-Functional Requirements) của hệ thống **Enterprise Chat App**.

---

## 1. Tầm Nhìn & Bối Cảnh (Executive Summary)

**Enterprise Chat App** là nền tảng giao tiếp, nhắn tin và cộng tác thời gian thực bảo mật cao, được thiết kế chuyên biệt cho các doanh nghiệp vừa và lớn, các tổ chức tài chính hoặc khối cơ quan cần tự chủ hạ tầng (On-premise / Private Cloud).

### 1.1. Vấn Đề Thực Tế (Problem Statement)
- **Rủi ro bảo mật & rò rỉ dữ liệu**: Doanh nghiệp sử dụng các ứng dụng chat công cộng (Zalo, Telegram, Skype) thường xuyên đối mặt với nguy cơ rò rỉ tài liệu nội bộ, thông tin mật và không có quyền kiểm soát khi nhân viên nghỉ việc.
- **Thiếu phân quyền theo cơ cấu tổ chức**: Các ứng dụng nhắn tin thông thường không hỗ trợ phân quyền chặt chẽ theo cấp bậc (Ban Giám Đốc, Trưởng Phòng, Nhân Viên, Cộng Tác Viên) và không tích hợp sâu với phòng ban nội bộ.
- **Phụ thuộc SaaS quốc tế**: Các giải pháp như Slack, Microsoft Teams có chi phí bản quyền định kỳ rất cao, lưu trữ dữ liệu tại máy chủ nước ngoài, tiềm ẩn rủi ro về tuân thủ pháp lý và gián đoạn đường truyền quốc tế.

### 1.2. Giải Pháp Của Enterprise Chat App
- **Triển khai độc lập**: Sẵn sàng đóng gói container chạy 100% trong mạng cục bộ (Intranet) hoặc Private Cloud của doanh nghiệp.
- **Bảo mật đa tầng**: Kiểm soát quyền truy cập dựa trên vai trò (RBAC) cho cả API HTTP và sự kiện WebSocket.
- **Trải nghiệm đa nền tảng đồng nhất**: Hỗ trợ Web (Next.js 15), Mobile (React Native / Expo trên iOS & Android) và Desktop (Electron trên Windows, macOS, Linux).
- **Lưu trữ tệp tin độc lập**: Tích hợp S3/MinIO hỗ trợ tải lên/tải xuống qua Presigned URL có thời hạn, không tiêu hao tài nguyên bộ nhớ của API server.

---

## 2. Đối Tượng Người Dùng & Vai Trò (User Personas & RBAC)

| Vai Trò | Mã Quyền (`UserRole`) | Mô Tả & Thẩm Quyền |
|---------|-----------------------|-------------------|
| **Super Admin** | `SUPER_ADMIN` | Quản trị viên cấp cao nhất hệ thống. Toàn quyền quản lý tổ chức, cài đặt hệ thống, quản lý tài khoản, xem nhật ký kiểm toán (Audit Logs), tạo kênh toàn công ty. |
| **Organization Admin** | `ORG_ADMIN` | Quản trị viên doanh nghiệp. Quản lý danh mục phòng ban, thêm/sửa/xóa nhân viên, thiết lập chính sách lưu trữ và kênh thông báo. |
| **Department Manager** | `DEPARTMENT_MANAGER` | Trưởng bộ phận / Quản lý dự án. Quản lý thành viên trong phòng ban của mình, tạo kênh phòng ban, thu hồi tin nhắn vi phạm trong phạm vi bộ phận. |
| **Employee** | `EMPLOYEE` | Nhân viên chính thức. Nhắn tin 1-1, tham gia kênh toàn công ty và kênh phòng ban được chỉ định, tạo nhóm chat riêng tư cho công việc. |
| **Guest** | `GUEST` | Khách mời / Cộng tác viên thời vụ. Bị giới hạn chỉ tham gia các kênh được mời đích danh, không xem được danh bạ tổng thể của công ty. |

---

## 3. Yêu Cầu Chức Năng (Functional Requirements)

### 3.1. Xác Thực & Danh Tính (Authentication & Identity)
- Đăng nhập an toàn qua Email & Mật khẩu (mã hóa bcrypt).
- Quản lý phiên bằng JWT (Access Token 15 phút, Refresh Token 7 ngày với cơ chế xoay vòng Refresh Token Rotation).
- Thu hồi phiên đăng nhập tức thì khi phát hiện rủi ro hoặc người dùng đăng xuất.
- Theo dõi trạng thái hiện diện (Presence): `ONLINE`, `AWAY`, `BUSY`, `OFFLINE` tự động cập nhật qua WebSocket heartbeat và Redis cache.

### 3.2. Quản Lý Kênh & Cuộc Hội Thoại (Channels & Conversations)
- **Kênh toàn công ty (`COMPANY`)**: Kênh thông báo chung, toàn bộ nhân viên tự động tham gia. Chỉ Admin mới có quyền tạo và quản trị.
- **Kênh phòng ban (`DEPARTMENT`)**: Kênh trao đổi nghiệp vụ theo từng khối phòng ban. Tự động thêm nhân sự thuộc phòng ban tương ứng.
- **Kênh riêng tư (`PRIVATE`)**: Nhóm chat theo dự án hoặc nhóm làm việc linh hoạt, chỉ thành viên được mời mới có thể truy cập.
- **Tin nhắn trực tiếp 1-1 (`DIRECT`)**: Trò chuyện cá nhân giữa 2 nhân sự với cơ chế ngăn chặn tạo trùng lặp hội thoại đồng thời (`directKey` unique constraint).

### 3.3. Trải Nghiệm Nhắn Tin Đa Phương Tiện (Messaging Features)
- Gửi tin nhắn văn bản hỗ trợ emoji, định dạng Markdown cơ bản, dán ảnh/tệp tin từ clipboard.
- **Tệp đính kèm & Đa phương tiện**: Hỗ trợ tài liệu (.pdf, .docx, .xlsx), hình ảnh (.png, .jpg), video (.mp4) lên tới 100MB qua S3 Presigned URL.
- **Tin nhắn thoại (Voice Message)**: Ghi âm trực tiếp trên Web/Mobile, hiển thị dạng sóng âm thanh và thời lượng.
- **Bình chọn khảo sát (Polls)**: Tạo cuộc thăm dò ý kiến với nhiều lựa chọn, hỗ trợ bình chọn đơn/nhiều lựa chọn và hiển thị kết quả trực tiếp theo thời gian thực.
- **Tương tác cảm xúc (Reactions)**: Thả biểu tượng cảm xúc (👍, ❤️, 😂, 😮, 😢, 🎉) vào từng tin nhắn.
- **Ghim tin nhắn (Pinned Messages)**: Ghim các tin nhắn quan trọng lên thanh tiêu đề của cuộc hội thoại để tra cứu nhanh.
- **Đánh dấu sao (Starred Messages)**: Lưu trữ các tin nhắn cá nhân cần chú ý để dễ dàng xem lại bất cứ lúc nào.
- **Chuyển tiếp tin nhắn (Forward)**: Chuyển tiếp tin nhắn sang một kênh hoặc cuộc hội thoại khác chỉ với một cú nhấp.
- **Chỉnh sửa & Thu hồi**: Người gửi có thể chỉnh sửa tin nhắn hoặc thu hồi tin nhắn trong khoảng thời gian quy định. Quản trị viên có quyền xóa tin nhắn vi phạm.

### 3.4. Trí Tuệ Nhân Tạo & Tiện Ích Thông Minh (AI & Utilities)
- **Tóm tắt cuộc hội thoại bằng AI (AI Summary Modal)**: Tự động phân tích các tin nhắn gần nhất trong kênh/nhóm để tổng hợp nội dung thảo luận chính và các việc cần làm (Action Items).
- **Cuộc gọi Audio/Video (Call Modal)**: Giao diện mô phỏng cuộc gọi thoại và video nội bộ với tín hiệu chuông, trạng thái kết nối, bật/tắt camera/micro.
- **Tìm kiếm nội dung (In-Chat Search)**: Tìm kiếm tin nhắn theo từ khóa nhanh chóng trong cuộc hội thoại hiện tại.
- **Chế độ hiển thị kép (Dual-View)**: Cho phép chuyển đổi linh hoạt giữa giao diện đầy đủ (Full Workstation View) và tiện ích thu nhỏ (Floating Chat Widget) tiện lợi khi nhúng vào các ứng dụng nội bộ khác.

---

## 4. Yêu Cầu Phi Chức Năng (Non-Functional Requirements - NFR)

### 4.1. Hiệu Năng & Độ Trễ (Performance & Latency)
- **Độ trễ tin nhắn thời gian thực**: < 50ms cho người dùng trong mạng nội bộ và < 150ms cho người dùng qua kết nối Internet tiêu chuẩn.
- **Khả năng mở rộng ngang (Horizontal Scalability)**: Hỗ trợ cụm backend NestJS đa node kết nối qua Redis Pub/Sub Adapter.
- **Tải tệp tin dung lượng lớn**: Tải trực tiếp lên S3/MinIO đạt tốc độ tối đa của đường truyền mạng, không làm tăng dung lượng RAM của các tiến trình API backend.

### 4.2. Bảo Mật & Tuân Thủ (Security & Compliance)
- **Phòng chống BOLA / IDOR**: Toàn bộ thao tác tham gia phòng WebSocket (`conversation:join`) và API tra cứu tin nhắn đều bắt buộc phải kiểm tra quyền thành viên trong cơ sở dữ liệu.
- **Xác thực dữ liệu đầu vào**: Áp dụng NestJS `ValidationPipe` nghiêm ngặt với `whitelist: true`, `forbidNonWhitelisted: true`.
- **Bảo mật tệp tin**: Tên tệp tin được làm sạch (sanitization), gắn UUID duy nhất và chỉ có thể truy cập qua Presigned URL có thời hạn (15-60 phút).
- **Giới hạn tần suất gọi API (Rate Limiting)**: Bảo vệ các endpoint nhạy cảm (Đăng nhập, Tải tệp, Gửi tin) chống tấn công từ chối dịch vụ và brute-force.

### 4.3. Độ Sẵn Sàng & Phục Hồi (Availability & Reliability)
- Kiến trúc Stateless cho ứng dụng Web và Backend Server.
- Cấu hình cơ chế tự động thử kết nối lại (Auto-reconnect with exponential backoff) trên cả Web Socket.io client và Mobile client khi xảy ra rớt mạng.
- Sao lưu dữ liệu tự động định kỳ cho PostgreSQL và MinIO.

---

## 5. Ma Trận Hỗ Trợ Nền Tảng (Platform Support Matrix)

| Nền Tảng | Công Nghệ Chính | Trải Nghiệm & Tính Năng Đặc Thù |
|----------|-----------------|---------------------------------|
| **Web Browser** | Next.js 15, React 19, Tailwind CSS | Hỗ trợ trình duyệt Chrome, Edge, Safari, Firefox; chế độ Full View & Floating Widget; 5 bộ màu giao diện. |
| **Mobile (iOS & Android)** | React Native, Expo SDK 52, Expo Router | Giao diện tối ưu cảm ứng, thanh điều hướng tab, bàn phím thích ứng, haptic feedback. |
| **Desktop (Win/Mac/Linux)** | Electron 33+, ContextBridge, IPC | Đóng gói Native, khay hệ thống (System Tray), thông báo Toast của hệ điều hành, phím tắt nhanh. |
