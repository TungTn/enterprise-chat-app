---
phase: 3
title: "React Native Mobile Migration"
status: pending
priority: P1
effort: "3d"
dependencies: ["phase-01-shared-types-and-debranding.md"]
---

# Phase 3: React Native Mobile Migration

## Overview
Phát triển ứng dụng di động React Native hoàn chỉnh trên nền tảng **Expo SDK 52** cho cả **iOS** và **Android** trong thư mục `apps/mobile`, mang lại trải nghiệm chat native mượt mà 60/120fps, hỗ trợ push notifications, bảo mật biometric và media picker.

## Requirements
- Functional:
  - Tab điều hướng: Channels (Kênh nhóm), Direct (Tin nhắn trực tiếp cá nhân), Settings (Cài đặt).
  - Màn hình chat `chat/[id].tsx` sử dụng `@shopify/flash-list` tối ưu hàng chục ngàn tin nhắn.
  - Xử lý bàn phím trên iOS và Android bằng `KeyboardAvoidingView` không bị giật hay che nội dung.
  - Gửi/nhận tin nhắn thời gian thực qua Socket.io: Text, Ảnh, Tài liệu, Ghi âm giọng nói, Bình chọn.
  - Thả reaction cảm xúc, trích dẫn trả lời, ghim tin nhắn đầu màn hình.
  - Modal cuộc gọi thoại/video native mô phỏng với âm thanh qua `expo-av`.
  - Tích hợp thông báo đẩy (Push Notifications) qua `expo-notifications`.
  - Lưu trữ token bảo mật phần cứng qua `expo-secure-store` và xác thực sinh trắc học FaceID/Vân tay.
- Non-functional:
  - Sử dụng NativeWind (Tailwind CSS cho React Native) và Lucide Icons React Native.
  - Hiệu năng cuộn 60-120fps, không drop frame khi cuộn danh sách lớn.

## Architecture
- Expo Router file-based routing (`apps/mobile/app`).
- Zustand store kết hợp `expo-secure-store` cho auth state.
- `apps/mobile/src/services/socketService.ts` kết nối trực tiếp WebSocket gateway.

## Related Code Files
- Create: `apps/mobile/src/stores/useMobileChatStore.ts`
- Create: `apps/mobile/src/services/mobileSocketService.ts`
- Create: `apps/mobile/src/services/notificationService.ts`
- Create: `apps/mobile/src/components/MobileMessageItem.tsx`
- Create: `apps/mobile/src/components/MobileMessageInput.tsx`
- Create: `apps/mobile/src/components/MobileCallModal.tsx`
- Create: `apps/mobile/src/components/MobileAiSummaryModal.tsx`
- Modify: `apps/mobile/app/(tabs)/channels.tsx`
- Modify: `apps/mobile/app/(tabs)/direct.tsx`
- Modify: `apps/mobile/app/(tabs)/settings.tsx`
- Modify: `apps/mobile/app/chat/[id].tsx`

## Implementation Steps
1. Cấu hình store `useMobileChatStore.ts` và socket service di động.
2. Nâng cấp màn hình `app/chat/[id].tsx`:
   - Tích hợp `@shopify/flash-list` thay thế `ScrollView` thông thường.
   - Xây dựng thanh công cụ nhập liệu: text, voice record button, photo library picker qua `expo-image-picker`, document picker.
   - Thêm thanh trả lời tin nhắn (reply preview banner) và edit message.
   - Thêm reaction pill bar và menu tác vụ tin nhắn native khi nhấn giữ (long press).
3. Hoàn thiện các tab `channels.tsx` và `direct.tsx` với avatar, unread badges, pull-to-refresh và search filter.
4. Thêm các modal native: `MobileCallModal` (hỗ trợ phát chuông âm thanh), `MobileAiSummaryModal` (hiển thị checklist nhiệm vụ), `CreatePollModal`.
5. Thiết lập Push Notification qua `expo-notifications`.

## Success Criteria
- [ ] Ứng dụng khởi chạy thành công trên cả iOS và Android (Expo Go / Emulator).
- [ ] Nhắn tin thời gian thực qua lại giữa Web React và Mobile React Native với độ trễ < 100ms.
- [ ] Danh sách tin nhắn cuộn cực kỳ mượt mà nhờ `@shopify/flash-list`.
- [ ] Bàn phím hiển thị mượt mà không che lấp tin nhắn trên cả iOS và Android.

## Risk Assessment
- Rủi ro: Hành vi bàn phím (Keyboard height) khác nhau giữa iOS và Android.
- Giảm thiểu: Áp dụng `KeyboardAvoidingView` với behavior `padding` trên iOS và `height` trên Android kèm `keyboardVerticalOffset`.
