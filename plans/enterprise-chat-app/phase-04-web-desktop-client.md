---
phase: 4
title: "Web & Desktop Client"
status: pending
priority: P1
effort: "4d"
dependencies: [1, 2, 3]
---

# Phase 4: Web & Desktop Client

## Overview
Develop a high-performance modern user interface built with Next.js 15, React 19, Tailwind CSS, and shadcn/ui. Package the client as a native Desktop application using Electron or Tauri with native operating system notifications, system tray support, auto-launch at startup, and connection resilience.

## Requirements
- **Functional:**
  - Modern Enterprise UI (Slack / Teams-like layout): Left navigation sidebar (channels, DMs, department directories), center message feed with virtual scrolling, right contextual pane (thread replies, channel details, shared files).
  - Rich text message input: Markdown support, emoji picker, mentions (`@user`, `@channel`), file paste/drop.
  - Desktop Native Features:
    - Native OS notifications with sound and badge counts on Windows/macOS/Linux.
    - System tray icon with quick status toggle (Online, Busy, Away).
    - Window close-to-tray behavior (runs in background).
    - Auto-start on boot setting.
  - Offline / Connection Status Banner: displays "Reconnecting in X seconds..." with instant recovery.
- **Non-functional:**
  - Fast render times using virtualized lists (e.g. `@tanstack/react-virtual`) for channels with 50,000+ messages.
  - Small desktop app bundle footprint and memory usage.

## Architecture
- **State Management**:
  - `authStore` (Zustand): current user, token state, organization role.
  - `chatStore` (Zustand): active conversation, channel list, unread badges, typing users.
  - `TanStack Query`: message pagination caching, optimistic updates on message send.
  - `socketService`: singleton WebSocket manager with automatic heartbeat, reconnect, and event dispatch.
- **Desktop Packaging**:
  - `apps/desktop`: Electron / Tauri shell loading the compiled Next.js standalone web frontend or loading localhost during dev.
  - IPC Bridge (Inter-Process Communication): safely exposes native desktop APIs (`notify`, `setBadgeCount`, `openFileDialog`) to the web renderer.

## Related Code Files
- Create:
  - `apps/web/src/app/(auth)/login/page.tsx`
  - `apps/web/src/app/(chat)/layout.tsx`
  - `apps/web/src/app/(chat)/channels/[id]/page.tsx`
  - `apps/web/src/components/chat/message-list.tsx`
  - `apps/web/src/components/chat/message-item.tsx`
  - `apps/web/src/components/chat/message-input.tsx`
  - `apps/web/src/components/sidebar/channel-tree.tsx`
  - `apps/web/src/components/sidebar/dm-list.tsx`
  - `apps/web/src/lib/socket.ts`
  - `apps/web/src/stores/chat.store.ts`
  - `apps/desktop/src/main/index.ts` (Electron/Tauri main process)
  - `apps/desktop/src/preload/index.ts` (Context bridge)

## Implementation Steps
1. **Frontend Setup & Design System**:
   - Initialize Next.js app with Tailwind CSS, Lucide icons, and shadcn/ui components (Dialog, DropdownMenu, Avatar, Tooltip, ScrollArea).
   - Configure dark/light theme switching with enterprise-friendly color palette.
2. **Authentication & Shell Layout**:
   - Implement login screen with company branding.
   - Build responsive 3-column desktop layout (Workspaces/Channels Sidebar, Chat Window, Detail/Thread Drawer).
3. **Real-time Message Feed & Virtual Scrolling**:
   - Integrate `@tanstack/react-virtual` for fluid infinite scrolling up through historical messages.
   - Build message grouping by date and consecutive sender.
   - Optimistic message sending (immediate UI appearance with pending spinner, updated to checkmark on ack).
4. **Interactive Messaging Features**:
   - Mention autocomplete when typing `@`.
   - Message reactions with quick emoji bar.
   - Inline image viewer modal and file attachment preview badges.
5. **Desktop Application Wrapper (Electron/Tauri)**:
   - Configure main process with secure sandbox and context isolation enabled.
   - Implement native OS desktop notifications via IPC when new messages arrive and window is minimized or unfocused.
   - Implement system tray with unread notification badge and menu options.
   - Configure auto-start at Windows/macOS login.

## Success Criteria
- [ ] UI renders smoothly at 60fps when rapidly scrolling through message history.
- [ ] Desktop app minimizes to system tray and triggers native notification toasts on new direct messages.
- [ ] Clicking a desktop notification immediately focuses the app and opens the corresponding channel or DM.
- [ ] Disconnecting network triggers reconnecting badge and automatically syncs missed messages upon reconnect.

## Risk Assessment
- **Risk**: High RAM usage in Electron desktop client.
  - *Mitigation*: Unload off-screen media assets; cap in-memory message history to 200 items per conversation; or consider Tauri (Rust core) for ultralight 30MB memory footprint.
