import { apiRequest } from './api';
import { AttachmentMetadata } from '@enterprise-chat/shared-types';

export interface PresignUploadResponse {
  attachmentId: string;
  uploadUrl: string;
  downloadUrl: string;
  key: string;
}

/**
 * Uploads a File or Blob directly to MinIO S3 via Presigned URL with real-time progress
 */
export async function uploadFileToMinio(
  file: File | Blob,
  fileName: string,
  mimeType: string,
  conversationId: string,
  token?: string,
  onProgress?: (percent: number) => void,
): Promise<AttachmentMetadata> {
  const fileSizeBytes = file.size;

  // Step 1: Request presigned upload URL from backend
  const clientHost = typeof window !== 'undefined' ? window.location.hostname : undefined;
  if (onProgress) onProgress(5);

  const presignData = await apiRequest<PresignUploadResponse>(
    '/files/presign-upload',
    {
      method: 'POST',
      body: JSON.stringify({
        conversationId,
        fileName,
        fileSizeBytes,
        mimeType: mimeType || 'application/octet-stream',
        clientHost,
      }),
    },
    token,
  );

  // Step 2: Upload file binary directly to MinIO S3 using XMLHttpRequest for upload progress tracking
  try {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', presignData.uploadUrl, true);
      xhr.setRequestHeader('Content-Type', mimeType || 'application/octet-stream');

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            // Scale progress from 10% to 95%
            const rawPercent = (event.loaded / event.total);
            const scaled = Math.min(95, Math.max(10, Math.round(10 + rawPercent * 85)));
            onProgress(scaled);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (onProgress) onProgress(100);
          resolve();
        } else {
          reject(new Error(`Tải tệp lên MinIO S3 thất bại: ${xhr.status} ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => reject(new Error('Lỗi kết nối khi tải tệp lên MinIO S3'));
      xhr.send(file);
    });
  } catch (putErr) {
    console.warn('Presigned PUT failed, falling back to direct server upload proxy:', putErr);
    if (onProgress) onProgress(30);

    // Convert Blob/File to base64 and upload directly through server proxy (guaranteed to work across LAN)
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    if (onProgress) onProgress(60);

    const directResult = await apiRequest<AttachmentMetadata>(
      '/files/upload-direct',
      {
        method: 'POST',
        body: JSON.stringify({
          conversationId,
          fileName,
          mimeType: mimeType || 'application/octet-stream',
          base64Data,
        }),
      },
      token,
    );

    if (onProgress) onProgress(100);
    return directResult;
  }

  // Step 3: Return attachment metadata with persistent streaming downloadUrl
  const finalDownloadUrl = presignData.downloadUrl || `/api/files/${presignData.attachmentId}/view`;

  return {
    id: presignData.attachmentId,
    fileName,
    fileSizeBytes,
    mimeType,
    downloadUrl: finalDownloadUrl,
    thumbnailUrl: mimeType.startsWith('image/') ? finalDownloadUrl : undefined,
  };
}
