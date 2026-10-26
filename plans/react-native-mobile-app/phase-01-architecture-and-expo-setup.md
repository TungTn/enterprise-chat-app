---
phase: 1
title: "architecture-and-expo-setup"
status: pending
priority: P1
effort: "2d"
dependencies: []
---

# Phase 1: Architecture & Expo Setup

## Overview
Khởi tạo cấu trúc dự án `apps/mobile` sử dụng **Expo (React Native)** trong hệ thống pnpm monorepo. Thiết lập cấu hình Metro bundler để nhận diện monorepo symlinks, tích hợp gói dùng chung `@enterprise-chat/shared-types`, và xây dựng hệ thống định tuyến (Expo Router) cùng thư viện giao diện NativeWind (Tailwind cho React Native).

---

## Requirements

### Functional
- Khởi tạo thành công ứng dụng Expo chạy được trên cả iOS Simulator và Android Emulator.
- Import trực tiếp các Types, Interfaces, Enums và Socket Events từ `@enterprise-chat/shared-types` mà không bị lỗi module resolution.
- Thiết lập hệ thống điều hướng màn hình (Tabs, Stacks, Modals) với Expo Router v4.
- Hệ thống giao diện Dark/Light Mode với NativeWind v4 phù hợp với tông màu doanh nghiệp (Slate / Blue).

### Non-functional
- Khởi động app lạnh (Cold Start) < 2 giây.
- Zero build errors trong monorepo `pnpm build`.
- Tuân thủ cấu trúc đặt tên thư mục chuẩn của ClaudeKit (`apps/mobile/src/...`).

---

## Architecture & Monorepo Metro Configuration

```
apps/mobile/
├── app/                        # Expo Router file-based routes
│   ├── (auth)/                 # Nhóm màn hình xác thực: login, biometrics
│   ├── (tabs)/                 # Bottom Tabs: Channels, DMs, Contacts, Settings
│   ├── chat/[id].tsx           # Màn hình chi tiết cuộc trò chuyện
│   └── _layout.tsx             # Root Layout (Theme Provider, Auth Provider)
├── src/
│   ├── components/             # Reusable UI (Avatar, Button, Input, MessageBubble)
│   ├── hooks/                  # Custom hooks (useSocket, useAuth, useChat)
│   ├── services/               # API Client (Axios/Fetch), Socket Client, S3 Client
│   ├── stores/                 # Zustand state stores (authStore, chatStore, presenceStore)
│   └── utils/                  # Formatters, date helpers, secure storage wrappers
├── app.json                    # Expo config (Scheme, Bundle ID, Permissions)
├── metro.config.js             # Cấu hình monorepo watchFolders & nodeModulesPaths
├── tailwind.config.js          # NativeWind Tailwind tokens
├── tsconfig.json               # Extends tsconfig.base.json
└── package.json                # Dependencies (@enterprise-chat/mobile)
```

---

## Related Code Files

- **Create:**
  - `apps/mobile/package.json`
  - `apps/mobile/metro.config.js`
  - `apps/mobile/app.json`
  - `apps/mobile/tsconfig.json`
  - `apps/mobile/tailwind.config.js`
  - `apps/mobile/app/_layout.tsx`
  - `apps/mobile/app/(tabs)/_layout.tsx`
  - `apps/mobile/app/(tabs)/index.tsx`
  - `apps/mobile/src/services/api.ts`
- **Modify:**
  - `package.json` (Root: thêm scripts `dev:mobile`, `build:mobile`)
  - `pnpm-workspace.yaml` (Xác nhận nhận diện `apps/*`)

---

## Implementation Steps

1. **Khởi tạo thư mục và package cấu hình**:
   - Tạo `apps/mobile/package.json` với tên `@enterprise-chat/mobile` và các dependency: `expo`, `react-native`, `expo-router`, `nativewind`, `lucide-react-native`, `@enterprise-chat/shared-types: workspace:*`.
2. **Cấu hình Metro Bundler cho Monorepo**:
   - Viết `metro.config.js` sử dụng `getDefaultConfig(__dirname)` kết hợp với `watchFolders: [rootMonorepoDir]` và `nodeModulesPaths: [projectNodeModules, rootNodeModules]` để phân giải đúng symlinks của pnpm.
3. **Cấu hình TypeScript & NativeWind**:
   - Kế thừa `tsconfig.base.json`, bật `jsx: "react-native"`. Cài đặt `babel.config.js` với plugin `nativewind/babel`.
4. **Xây dựng Root Navigation Layout**:
   - Tạo `app/_layout.tsx` thiết lập StatusBar, SafeAreaProvider, Font loading và điều hướng Auth/Main flow.
   - Tạo bộ Tabs gồm: 💬 Kênh (Channels), 👤 Tin nhắn trực tiếp (Direct), 👥 Danh bạ (Directory), ⚙️ Cài đặt (Settings).
5. **Kiểm thử môi trường**:
   - Chạy `pnpm --filter @enterprise-chat/mobile start` và xác nhận Expo Metro Bundler khởi chạy thành công, không gặp lỗi resolution của `@enterprise-chat/shared-types`.

---

## Success Criteria

- [ ] `pnpm --filter @enterprise-chat/mobile start` khởi chạy không lỗi.
- [ ] Giao diện Expo Tabs cơ bản hiển thị sắc nét trên cả iOS và Android.
- [ ] Import thử enum `UserRole` và `SOCKET_EVENTS` từ `@enterprise-chat/shared-types` thành công.
- [ ] Dark theme tương thích với giao diện Web (nền `slate-950`, text `slate-100`, primary `blue-600`).

---

## Risk Assessment

| Rủi ro | Tác động | Giải pháp giảm thiểu |
|---|---|---|
| Metro bundler không nhận diện symlinks của pnpm | Cao | Cấu hình tường minh `watchFolders` trỏ về root monorepo và sử dụng `expo/metro-config`. |
| Xung đột phiên bản React 19 (Web) và React 18 (React Native cũ) | Cao | Sử dụng Expo SDK 52+ tương thích React 18.3.1 / React 19 architecture mới nhất. |
