---
phase: 2
title: "Realtime Messaging & Channels"
status: pending
priority: P1
effort: "4d"
dependencies: [1]
---

# Phase 2: Realtime Messaging & Channels

## Overview
Implement the real-time messaging engine: 1-1 direct messaging, public/private channels, thread replies, typing indicators, user online/offline presence tracking, and cursor-based pagination for chat history.

## Requirements
- **Functional:**
  - 1-1 Direct Messages (DMs) between company colleagues.
  - Channels (Public to all department members, Private invite-only, or Company-wide announcement channels).
  - Real-time message broadcast (<100ms latency) via WebSockets.
  - Delivery states: Sent, Delivered, Read (read receipts per channel member).
  - Typing indicator (`user is typing...` throttled with debounce).
  - User Presence: Online, Away, Busy, Offline (heartbeat mechanism via Redis).
  - Message editing and soft-deletion with audit trail (`editedAt`, `isDeleted`).
  - Thread replies to specific messages.
- **Non-functional:**
  - Horizontal scalability using `@socket.io/redis-adapter` for multi-node WebSocket load balancing.
  - Efficient history queries using cursor-based pagination (`beforeMessageId`, `limit: 50`) with indexed timestamp/ID.

## Architecture
- **Data Entities**:
  - `Conversation`: id, type (`DIRECT` | `CHANNEL`), name (nullable for DMs), isPrivate, departmentId, createdById.
  - `ConversationMember`: id, conversationId, userId, role (`ADMIN` | `MEMBER`), lastReadMessageId, joinedAt.
  - `Message`: id, conversationId, senderId, parentId (for threads), content, type (`TEXT` | `SYSTEM` | `ATTACHMENT`), isEdited, isDeleted, createdAt.
  - `MessageReaction`: id, messageId, userId, emoji, createdAt.
- **WebSocket Gateway Protocol**:
  - `authenticate`: validates JWT on handshake.
  - `room:join` / `room:leave`: joins socket room `conversation:<id>`.
  - `message:send` -> validates membership -> saves to DB -> broadcasts `message:new` to room.
  - `message:read` -> updates `lastReadMessageId` -> emits `message:read_receipt`.
  - `presence:heartbeat` -> updates Redis TTL key `presence:<userId>` (expire 60s).

## Related Code Files
- Create:
  - `apps/server/src/modules/chat/chat.gateway.ts`
  - `apps/server/src/modules/chat/chat.service.ts`
  - `apps/server/src/modules/chat/chat.module.ts`
  - `apps/server/src/modules/chat/dto/send-message.dto.ts`
  - `apps/server/src/modules/channels/channels.controller.ts`
  - `apps/server/src/modules/channels/channels.service.ts`
  - `apps/server/src/modules/presence/presence.service.ts`
  - `apps/server/src/common/adapters/redis-io.adapter.ts`

## Implementation Steps
1. **Redis IO Adapter Configuration**:
   - Create custom `RedisIoAdapter` extending `IoAdapter` in NestJS with Pub and Sub Redis clients.
2. **Conversation & Channel Management APIs**:
   - REST endpoints for channel creation (`POST /api/channels`), list accessible channels, invite/kick members, and search members.
   - Channel permission checks (only Admin/Manager can create company-wide broadcast channels).
3. **Chat WebSocket Gateway**:
   - Establish `ChatGateway` listening on `/ws/chat`.
   - Implement JWT authentication middleware during connection handshake (`socket.handshake.auth.token`).
   - Store user socket mapping in Redis for targeted DM notifications.
4. **Message Persistence & Broadcast**:
   - Save incoming messages transactionally in PostgreSQL.
   - Broadcast to room subscribers.
   - Implement thread reply counter increment on parent message.
5. **Presence & Typing Engine**:
   - Maintain online status via Redis keys (`SET presence:<userId> online EX 60`).
   - Broadcast presence transitions on disconnect/reconnect.
   - Throttled typing event emission.
6. **Chat History & Read Receipts**:
   - REST endpoint `GET /api/conversations/:id/messages?cursor=<id>&limit=50`.
   - Update member `lastReadMessageId` on viewing conversation and calculate unread badge count.

## Success Criteria
- [ ] Two simulated clients can exchange 1-1 messages in real-time with under 100ms latency.
- [ ] Users can create public channels, private department channels, and invite colleagues.
- [ ] Socket reconnection seamlessly restores room subscriptions without missing messages.
- [ ] Redis presence accurately tracks online/offline status when browser/tab closes.
- [ ] Cursor-based pagination smoothly scrolls back through 1,000+ past messages.

## Risk Assessment
- **Risk**: WebSocket connection storm when entire company connects simultaneously at 9 AM.
  - *Mitigation*: Enable exponential backoff with jitter on client reconnect; offload handshake auth verification with cached Redis session checks.
