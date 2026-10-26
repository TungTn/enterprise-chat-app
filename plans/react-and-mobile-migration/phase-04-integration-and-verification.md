---
phase: 4
title: "Integration and Verification"
status: pending
priority: P1
effort: "1d"
dependencies: ["phase-02-react-web-migration.md", "phase-03-react-native-mobile-migration.md"]
---

# Phase 4: Integration and Verification

## Overview
Tiến hành kiểm thử toàn diện end-to-end liên nền tảng giữa Web Client (React 19) và Mobile App (React Native), kiểm tra luồng tin nhắn đồng thời, dán ảnh, gọi điện, kiểm tra typecheck và build sản xuất của monorepo.

## Requirements
- Functional:
  - Đồng bộ trạng thái đọc (Read Receipt) và trạng thái đang gõ (Typing Indicator) giữa Web và Mobile ngay lập tức.
  - Người dùng gửi tin nhắn trên Web hiển thị ngay lập tức trên Mobile và ngược lại.
  - Bình chọn khảo sát cập nhật tỷ lệ phiếu bầu trên cả hai nền tảng theo thời gian thực.
  - Cuộc gọi bắt đầu từ Web đổ chuông trên Mobile và ngược lại.
- Non-functional:
  - 100% build pass: `pnpm build` không có cảnh báo nghiêm trọng hay lỗi TypeScript.
  - Không còn bất kỳ file hoặc thư mục nào trong monorepo chứa định danh `Mic`.

## Architecture
- Kiểm thử đa nền tảng kết nối qua NestJS WebSocket Gateway và Redis Pub/Sub cluster.

## Related Code Files
- Test: `apps/web`
- Test: `apps/mobile`
- Test: `apps/server`
- Document: `README.md` (Cập nhật hướng dẫn chạy Web & Mobile mới)

## Implementation Steps
1. Khởi động hạ tầng dữ liệu và server: `docker compose up -d` và `pnpm dev:server`.
2. Khởi động Web client: `pnpm dev:web` tại `http://localhost:3000`.
3. Khởi động Mobile app: `pnpm --filter @enterprise-chat/mobile start`.
4. Chạy kịch bản kiểm thử:
   - Đăng nhập 2 tài khoản khác nhau trên Web và Mobile.
   - Gửi tin nhắn text, dán ảnh `Ctrl + V` từ Web sang Mobile.
   - Thả reaction cảm xúc từ Mobile xem có hiện trên Web không.
   - Tạo khảo sát bình chọn trên Web, bỏ phiếu trên Mobile.
   - Kích hoạt cuộc gọi thoại mô phỏng từ Web, xác nhận chuông reo trên Mobile.
   - Tóm tắt AI cuộc trò chuyện và gửi checklist vào nhóm.
5. Chạy lệnh kiểm tra typecheck và build:
   - `pnpm --filter "@enterprise-chat/*" build`
   - `pnpm --filter @enterprise-chat/mobile tsc --noEmit`
6. Cập nhật `README.md` tại thư mục gốc `D:\enterprise-chat-app`.

## Success Criteria
- [ ] Toàn bộ kịch bản kiểm thử tương tác chéo Web <-> Mobile thành công.
- [ ] Toàn bộ monorepo build thành công không lỗi TypeScript.
- [ ] Không còn bất kỳ tiền tố "Mic" nào trong toàn bộ dự án.

## Risk Assessment
- Rủi ro: Kết nối localhost từ thiết bị Android Emulator hoặc điện thoại thật cần trỏ IP mạng LAN thay vì `localhost`.
- Giảm thiểu: Cấu hình biến môi trường `EXPO_PUBLIC_API_URL` hỗ trợ IP máy chủ LAN linh hoạt.
