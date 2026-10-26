---
phase: 1
title: "Shared Types and Debranding"
status: pending
priority: P1
effort: "1d"
dependencies: []
---

# Phase 1: Shared Types and Debranding

## Overview
Làm sạch toàn bộ mã nguồn khỏi các tiền tố, nhận diện và tài nguyên thương hiệu "Mic". Mở rộng gói `@enterprise-chat/shared-types` để hỗ trợ đầy đủ các mô hình dữ liệu cho Voice, Video Calls, Polls, AI Summary, Attachments và Permissions.

## Requirements
- Functional:
  - Khai báo đầy đủ các interface và type cho Polls, AI Summaries, Call States, Permissions, Settings, Attachments.
  - Định nghĩa chuẩn WebSocket events trung tính: `chat:message`, `chat:typing`, `chat:read`, `chat:presence`, `chat:call_signal`, `chat:poll_vote`.
- Non-functional:
  - Loại bỏ 100% các từ khóa `MIC`, `mic-`, `mic_` trong các biến, event names, CSS class, tài liệu.
  - Đảm bảo type safety và backward compatibility giữa server và client.

## Architecture
- Gói `packages/shared-types` đóng vai trò là hợp đồng dữ liệu duy nhất (Single Source of Truth) cho `apps/server`, `apps/web` và `apps/mobile`.

## Related Code Files
- Modify: `packages/shared-types/src/index.ts`
- Modify: `packages/shared-types/package.json`
- Modify: `apps/server/src/gateway/chat.gateway.ts` (đồng bộ tên event)

## Implementation Steps
1. Mở rộng `packages/shared-types/src/index.ts`:
   - Thêm `ChatPoll`, `ChatPollOption`, `VotePollDto`
   - Thêm `ChatAiSummary`, `ChatAiActionItem`
   - Thêm `ActiveCallState`, `CallType`, `CallStatus`
   - Thêm `ChatAttachment`, `ChatVoiceData`, `ChatReplyPreview`
   - Thêm `ChatSettings`, `GroupPermissions`
2. Đổi tên toàn bộ sự kiện WebSocket từ `mic:*` sang `chat:*` trong `SOCKET_EVENTS`.
3. Quét toàn bộ monorepo tìm và xóa các tiền tố `Mic` hoặc `mic-`.
4. Chạy `pnpm --filter @enterprise-chat/shared-types build` để sinh bundle type `.d.ts`.

## Success Criteria
- [ ] Gói `shared-types` build thành công không lỗi TypeScript.
- [ ] Không còn bất kỳ xuất hiện nào của `mic` trong `shared-types`.
- [ ] Server và Client có thể import trực tiếp các DTO và Interface mới.

## Risk Assessment
- Rủi ro: Đổi tên sự kiện WebSocket có thể làm mất kết nối nếu server và client không được cập nhật đồng thời.
- Giảm thiểu: Đồng bộ enum `SOCKET_EVENTS` trong `shared-types` trước khi migrate UI.
