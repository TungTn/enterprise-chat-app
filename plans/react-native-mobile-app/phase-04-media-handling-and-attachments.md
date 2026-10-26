---
phase: 4
title: "media-handling-and-attachments"
status: pending
priority: P2
effort: "2d"
dependencies: ["realtime-chat-channels-and-dms"]
---

# Phase 4: Media Handling & Attachments

## Overview
Xây dựng module xử lý đa phương tiện và chia sẻ tệp tin tài liệu doanh nghiệp trên di động. Cho phép nhân viên chụp ảnh trực tiếp từ Camera, chọn ảnh từ thư viện ảnh (`expo-image-picker`), chọn tài liệu Word/Excel/PDF/ZIP (`expo-document-picker`). Tự động nén ảnh tối ưu dung lượng trước khi tải lên, tải trực tiếp lên MinIO/S3 qua Presigned URL kèm thanh phần trăm tiến trình (upload progress) và hỗ trợ xem trước ảnh toàn màn hình hoặc chia sẻ tệp tin qua hệ thống tệp native.

---

## Requirements

### Functional
- Chụp ảnh & Chọn ảnh: Tích hợp Camera và Photo Library, cho phép chọn tối đa 5 ảnh cùng lúc.
- Chọn tài liệu: Hỗ trợ tệp tin văn phòng (PDF, DOCX, XLSX) và tệp nén (ZIP, RAR) tối đa 100MB.
- Tối ưu hóa trước khi tải: Nén ảnh JPEG chất lượng cao (giảm 70% dung lượng mà vẫn giữ độ nét văn bản tài liệu) qua `expo-image-manipulator`.
- Tải lên trực tiếp qua Presigned URL:
  - Gọi `POST /api/files/presign-upload` lấy upload URL và `attachmentId`.
  - Tải nhị phân (Binary stream) trực tiếp lên S3/MinIO qua `FileSystem.uploadAsync` kèm hiển thị % tiến độ.
  - Sau khi upload hoàn tất, gửi tin nhắn kèm mảng `attachmentIds`.
- Xem đa phương tiện trên mobile:
  - Xem ảnh phóng to toàn màn hình (Pinch-to-zoom) bằng `react-native-image-viewing`.
  - Tải và mở tệp tài liệu bằng Share Sheet của iOS / Intent của Android (`expo-sharing`).

### Non-functional
- Không làm đơ giao diện (Block UI thread) khi đang nén hoặc tải lên tệp tin dung lượng lớn.
- Bộ nhớ đệm ảnh thông minh: Sử dụng `expo-image` để tự động lưu cache ảnh cục bộ, tiết kiệm dung lượng 4G cho người dùng.

---

## Architecture & Mobile Upload Pipeline

```
[ User Picks Photo / Document ]
               |
               v
  (If Image) [ Auto Compress via expo-image-manipulator ]
               |
               v
[ POST /api/files/presign-upload ]
  Payload: { conversationId, fileName, fileSizeBytes, mimeType }
               |
               v
  < Return: { uploadUrl, attachmentId, key } >
               |
               v
[ Background Binary PUT to MinIO/S3 via FileSystem.uploadAsync ]
  UI: Hiển thị thanh tiến trình 0% -> 100% trên tin nhắn nháp (Optimistic UI)
               |
               v
[ Socket emit("message:send", { conversationId, content, attachmentIds: [attachmentId] }) ]
               |
               v
[ Tin nhắn xuất hiện kèm Thumbnail ảnh hoặc Icon tệp đính kèm ]
```

---

## Related Code Files

- **Create:**
  - `apps/mobile/src/services/file-service.ts`
  - `apps/mobile/src/hooks/use-media-picker.ts`
  - `apps/mobile/src/components/chat/attachment-preview.tsx`
  - `apps/mobile/src/components/chat/image-gallery-modal.tsx`
  - `apps/mobile/src/components/chat/document-attachment-card.tsx`
- **Modify:**
  - `apps/mobile/src/components/chat/chat-input-bar.tsx`
  - `apps/mobile/src/components/chat/message-item.tsx`
  - `apps/mobile/app.json` (Thêm quyền Camera & Media Library permissions)

---

## Implementation Steps

1. **Cài đặt thư viện xử lý File & Media**:
   - `npx expo install expo-image-picker expo-document-picker expo-image-manipulator expo-file-system expo-sharing expo-image react-native-image-viewing`.
2. **Khai báo quyền hạn trong `app.json`**:
   - Thêm `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` cho iOS.
   - Thêm quyền `READ_MEDIA_IMAGES`, `READ_EXTERNAL_STORAGE` cho Android.
3. **Xây dựng `file-service.ts`**:
   - Hàm `compressImage(uri)`: resize nếu chiều dài > 2048px và nén 80% JPEG.
   - Hàm `uploadToS3(uploadUrl, fileUri, mimeType, onProgress)`: Sử dụng `FileSystem.createUploadTask` hỗ trợ callback theo dõi số byte đã upload.
4. **Hook chọn Media `use-media-picker.ts`**:
   - Cung cấp các hành động: `pickFromCamera()`, `pickFromGallery()`, `pickDocument()`.
5. **Hiển thị tệp trong Bong bóng tin nhắn**:
   - Ảnh: Hiển thị dạng lưới lưới ảnh (Grid) với bo góc đẹp mắt, bấm vào mở `ImageGalleryModal`.
   - File tài liệu: Hiển thị thẻ tệp (Card) gồm biểu tượng loại file (PDF/Word), tên file, dung lượng (MB) và nút tải xuống.

---

## Success Criteria

- [ ] Chụp ảnh từ camera và gửi vào kênh chat thành công trên máy thật.
- [ ] Tải lên tài liệu PDF 20MB hiển thị thanh phần trăm tiến trình mượt mà.
- [ ] Tệp đính kèm gửi từ Mobile mở và tải được bình thường trên Web/Desktop và ngược lại.
- [ ] Bấm vào ảnh trong chat phóng to toàn màn hình, vuốt để chuyển ảnh tiếp theo và hỗ trợ cử chỉ zoom 2 ngón tay.

---

## Risk Assessment

| Rủi ro | Tác động | Giải pháp giảm thiểu |
|---|---|---|
| Người dùng gửi tệp dung lượng quá lớn làm sập RAM | Cao | Giới hạn dung lượng tối đa 100MB ngay tại client trước khi gọi API presign; từ chối nếu vượt quá. |
| Mất mạng giữa chừng khi đang upload file | Trung bình | Bắt lỗi mạng trong `FileSystem.uploadAsync`, hiển thị nút "Thử lại" (Retry) trên tin nhắn nháp. |
