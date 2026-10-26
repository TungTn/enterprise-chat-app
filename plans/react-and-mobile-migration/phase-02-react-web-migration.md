---
phase: 2
title: "React Web Migration"
status: pending
priority: P1
effort: "3d"
dependencies: ["phase-01-shared-types-and-debranding.md"]
---

# Phase 2: React Web Migration

## Overview
Di chuyển toàn bộ 17 component giao diện và logic từ ứng dụng Vue 3 (`d:\mic-fe-micro\chat-app`) sang ứng dụng React 19 / Next.js 15 (`apps/web`), hỗ trợ cả 2 chế độ hiển thị Toàn màn hình (Full Page) và Cửa sổ nổi (Floating Widget).

## Requirements
- Functional:
  - Tái tạo trọn vẹn trải nghiệm nhắn tin: tin nhắn văn bản, ảnh, tài liệu đính kèm, tin nhắn thoại, bình chọn khảo sát.
  - Hỗ trợ dán ảnh siêu tốc từ clipboard (`Ctrl + V`) với thumbnail xem trước.
  - Gợi ý nhắc tên `@mention` thành viên tự động với điều hướng phím `↑` `↓` `Enter`.
  - Hỗ trợ sửa tin nhắn `(Đã chỉnh sửa)`, trích dẫn trả lời (Reply-To quote), ghim tin nhắn, đánh dấu sao, chuyển tiếp.
  - Tích hợp modal Tóm tắt bằng AI (trích xuất vấn đề, quyết định, checklist hành động, nút gửi vào nhóm).
  - Tích hợp cuộc gọi thoại / video mô phỏng với Web Audio Synthesizer phát chuông gọi và Picture-in-Picture.
  - Cung cấp Floating Chat Widget cố định góc phải dưới để trao đổi nhanh khi đang xử lý nghiệp vụ khác.
  - 5 chủ đề giao diện (Default Blue, Dark Mode, Viber Purple, Mint, Midnight) và tùy biến thông báo.
- Non-functional:
  - Sử dụng Tailwind CSS, Lucide React Icons và Radix UI.
  - State management tập trung bằng Zustand store.
  - Tối ưu hiệu năng render danh sách tin nhắn.

## Architecture
- `apps/web/src/stores/useChatStore.ts`: Quản lý reactive state của toàn bộ ứng dụng chat.
- `apps/web/src/lib/soundService.ts`: Zero-dependency Web Audio Synthesizer phát âm thanh tin nhắn và chuông reo.
- `apps/web/src/components/chat/*`: Các component con độc lập, module hóa.

## Related Code Files
- Create: `apps/web/src/stores/useChatStore.ts`
- Create: `apps/web/src/lib/soundService.ts`
- Create: `apps/web/src/components/chat/ConversationList.tsx`
- Create: `apps/web/src/components/chat/MessageList.tsx`
- Create: `apps/web/src/components/chat/MessageItem.tsx`
- Create: `apps/web/src/components/chat/MessageInput.tsx`
- Create: `apps/web/src/components/chat/InfoPanel.tsx`
- Create: `apps/web/src/components/chat/FloatingChatWidget.tsx`
- Create: `apps/web/src/components/chat/PinnedMessageBar.tsx`
- Create: `apps/web/src/components/chat/InChatSearchBar.tsx`
- Create: `apps/web/src/components/modals/AiSummaryModal.tsx`
- Create: `apps/web/src/components/modals/CallModal.tsx`
- Create: `apps/web/src/components/modals/CreateGroupModal.tsx`
- Create: `apps/web/src/components/modals/CreatePollModal.tsx`
- Create: `apps/web/src/components/modals/GroupManagementModal.tsx`
- Create: `apps/web/src/components/modals/StarredMessagesModal.tsx`
- Create: `apps/web/src/components/modals/ForwardMessageModal.tsx`
- Create: `apps/web/src/components/modals/SettingsModal.tsx`
- Modify: `apps/web/src/app/page.tsx`

## Implementation Steps
1. Xây dựng `soundService.ts` bằng Web Audio API để tạo chuông gọi và âm thanh tin nhắn gửi/nhận.
2. Xây dựng Zustand store `useChatStore.ts` kết nối với `socket.ts` và API service.
3. Chuyển đổi các component cốt lõi:
   - `ConversationList`: Tab All/Unread/Channels/Direct, avatar, badge unread, tìm kiếm.
   - `MessageList` & `MessageItem`: Bubble chat, reaction picker, reply quote, lightbox preview, audio player, poll cards.
   - `MessageInput`: Textarea auto-resize, paste ảnh `Ctrl + V`, mention popper, emoji picker, edit mode.
   - `InfoPanel`: Shared media/files gallery, pinned messages, member list, notifications mute.
   - `FloatingChatWidget`: Nút chat nổi góc phải dưới, dropdown chọn hội thoại, nút expand to full page.
4. Chuyển đổi các dialog modal: AI Summary, Voice/Video Call (PiP), Poll Creation, Group Management, Settings.
5. Tích hợp tất cả vào `apps/web/src/app/page.tsx` hỗ trợ chuyển đổi mượt mà giữa Toàn màn hình và Floating Widget.

## Success Criteria
- [ ] Toàn bộ 17 tính năng từ Vue 3 hoạt động ổn định trên React 19 / Next.js 15.
- [ ] Giao diện sắc nét, responsive, chuyển đổi Dark/Light mode và 5 themes mượt mà.
- [ ] Dán ảnh chụp màn hình từ clipboard hiển thị preview ngay lập tức.
- [ ] Tóm tắt AI và cuộc gọi thoại/video hoạt động trơn tru.

## Risk Assessment
- Rủi ro: Autoplay âm thanh trên một số trình duyệt bị chặn nếu người dùng chưa tương tác.
- Giảm thiểu: Resume `AudioContext` khi người dùng click lần đầu vào giao diện.
