---
phase: 2
title: "authentication-and-secure-storage"
status: pending
priority: P1
effort: "2d"
dependencies: ["architecture-and-expo-setup"]
---

# Phase 2: Authentication & Secure Storage

## Overview
Xây dựng module xác thực bảo mật chuẩn doanh nghiệp trên thiết bị di động. Lưu trữ Refresh Token mã hóa trong phần cứng thiết bị (iOS Keychain / Android Keystore) thông qua `expo-secure-store`. Tích hợp xác thực sinh trắc học (FaceID / TouchID / Vân tay) qua `expo-local-authentication`, tự động phục hồi phiên đăng nhập khi mở app và xử lý Silent Token Refresh khi Access Token hết hạn.

---

## Requirements

### Functional
- Màn hình đăng nhập doanh nghiệp với Email công ty và Mật khẩu. Hỗ trợ chọn nhanh các tài khoản Demo.
- Lưu trữ Refresh Token an toàn trong Keychain / Keystore; Access Token chỉ lưu trong bộ nhớ RAM (`authStore`).
- Cơ chế **Tự động làm mới token (Silent Refresh)**: Khi API trả về 401 Unauthorized, interceptor tự động gọi `POST /api/auth/refresh` bằng refresh token trong SecureStore và thử lại request mà người dùng không bị gián đoạn.
- Đăng nhập sinh trắc học (FaceID/Vân tay) khi mở lại app nếu đã từng đăng nhập trước đó.
- Xóa sạch token và session khỏi phần cứng khi người dùng chọn Đăng xuất.

### Non-functional
- Không bao giờ lưu trữ Token hoặc mật khẩu dạng plaintext trong `AsyncStorage` thông thường.
- Thời gian khôi phục phiên (Session restore) khi bật app < 300ms.
- Phản hồi sinh trắc học tức thời, có fallback mật mã thiết bị.

---

## Architecture & Token Lifecycle

```
[ App Launch ]
      |
      v
[ Check expo-secure-store: REFRESH_TOKEN ]
      |
  +---+--------------------+
  |                        | (Found)
  v (Not Found)            v
[ Navigate to (auth)/login ] [ Biometric Prompt: FaceID / Fingerprint ]
                                   |
                       +-----------+-----------+
                       | (Success)             | (Failed/Cancel)
                       v                       v
               [ Call /api/auth/refresh ]  [ Fallback to Password Login ]
                       |
               [ Receive AccessToken & UserProfile ]
                       |
               [ Connect WebSocket Gateway ]
                       |
               [ Navigate to (tabs)/index ]
```

---

## Related Code Files

- **Create:**
  - `apps/mobile/src/services/secure-storage.ts`
  - `apps/mobile/src/services/auth-service.ts`
  - `apps/mobile/src/stores/auth-store.ts`
  - `apps/mobile/src/hooks/use-biometrics.ts`
  - `apps/mobile/app/(auth)/login.tsx`
  - `apps/mobile/app/(auth)/biometric-lock.tsx`
- **Modify:**
  - `apps/mobile/src/services/api.ts` (Thêm Auth Interceptor và Token Rotation)
  - `apps/mobile/app/_layout.tsx` (Điều hướng Auth Guard)

---

## Implementation Steps

1. **Cài đặt thư viện bảo mật**:
   - Cài đặt `npx expo install expo-secure-store expo-local-authentication`.
2. **Xây dựng `secure-storage.ts`**:
   - Viết các hàm wrapper: `saveRefreshToken`, `getRefreshToken`, `deleteRefreshToken`, `saveBiometricPreference`.
3. **Quản lý trạng thái xác thực `auth-store.ts` (Zustand)**:
   - Lưu trữ `user: UserProfile | null`, `accessToken: string | null`, `isAuthenticated: boolean`, `isLoading: boolean`.
4. **Thiết lập Interceptor tự động Refresh Token trong `api.ts`**:
   - Bắt mã lỗi 401: Xếp hàng các request (queue), gọi `authService.refreshToken()`, cập nhật `accessToken` mới và retry toàn bộ queue. Nếu refresh thất bại, chuyển hướng về Login.
5. **Thiết kế Màn hình Đăng nhập `app/(auth)/login.tsx`**:
   - Giao diện hiện đại: Logo công ty, form nhập liệu có kiểm tra định dạng email doanh nghiệp, nút đăng nhập sinh trắc học và danh sách chọn nhanh tài khoản Demo để kiểm thử.
6. **Bảo vệ màn hình bằng Biometrics**:
   - Khi mở app từ trạng thái nền (Background/Inactive), hiển thị màn hình khóa yêu cầu FaceID trước khi vào dữ liệu chat nội bộ.

---

## Success Criteria

- [ ] Đăng nhập thành công với tài khoản thật qua `POST /api/auth/login`.
- [ ] Tắt hoàn toàn app và mở lại: Tự động đăng nhập mà không cần nhập lại mật khẩu.
- [ ] Thử nghiệm FaceID / Vân tay thành công trên thiết bị thật và máy ảo.
- [ ] Khi Access Token hết hạn (15 phút), API gọi bình thường nhờ cơ chế Silent Refresh trong suốt.
- [ ] Nhấn "Đăng xuất": Session trong DB bị xóa và SecureStore được dọn sạch hoàn toàn.

---

## Risk Assessment

| Rủi ro | Tác động | Giải pháp giảm thiểu |
|---|---|---|
| Người dùng từ chối cấp quyền sinh trắc học | Trung bình | Luôn có nút fallback cho phép nhập mật khẩu hoặc mã PIN thiết bị. |
| Vòng lặp vô tận (Infinite Loop) khi gọi refresh token bị lỗi 401 | Cao | Đánh dấu cờ `isRefreshing` và giới hạn 1 lần thử duy nhất; nếu thất bại lập tức xóa token và đăng xuất. |
