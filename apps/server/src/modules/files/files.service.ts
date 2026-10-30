import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class FilesService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.bucketName = this.configService.get('S3_BUCKET_NAME') || 'enterprise-chat-files';
    this.s3Client = new S3Client({
      region: this.configService.get('S3_REGION') || 'us-east-1',
      endpoint: this.configService.get('S3_ENDPOINT') || 'http://localhost:9500',
      credentials: {
        accessKeyId: this.configService.get('S3_ACCESS_KEY') || 'minio_admin',
        secretAccessKey: this.configService.get('S3_SECRET_KEY') || 'minio_secret_key',
      },
      forcePathStyle: this.configService.get('S3_FORCE_PATH_STYLE') === 'true',
    });
  }

  async getPresignedUploadUrl(
    userId: string,
    conversationId: string,
    fileName: string,
    fileSizeBytes: number,
    mimeType: string,
    clientHost?: string,
  ) {
    let targetConversationId = conversationId;

    // Check if conversation exists
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true },
    });

    if (!conv) {
      // Fallback to first available company channel
      const fallback = await this.prisma.conversation.findFirst({
        where: { scope: 'COMPANY' },
      });
      if (fallback) {
        targetConversationId = fallback.id;
      } else {
        throw new NotFoundException('Không tìm thấy cuộc hội thoại');
      }
    } else {
      const isMember = conv.members.some((m) => m.userId === userId);
      if (!isMember) {
        if (conv.scope === 'COMPANY') {
          await this.prisma.conversationMember.create({
            data: { conversationId: conv.id, userId, role: 'MEMBER' },
          });
        } else {
          throw new ForbiddenException('Bạn không phải thành viên của cuộc hội thoại này');
        }
      }
    }

    // Size limit check (max 100MB)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (fileSizeBytes > MAX_SIZE) {
      throw new ForbiddenException('Dung lượng tệp vượt quá giới hạn 100MB');
    }

    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `conversations/${targetConversationId}/${randomUUID()}-${cleanFileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: mimeType,
    });

    // URL valid for 15 minutes
    let uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });
    if (clientHost && uploadUrl.includes('localhost:9500')) {
      uploadUrl = uploadUrl.replace('localhost:9500', `${clientHost}:9500`);
    }

    // Pre-create attachment record
    const attachment = await this.prisma.attachment.create({
      data: {
        conversationId: targetConversationId,
        uploaderId: userId,
        fileName: cleanFileName,
        originalName: fileName,
        fileSizeBytes,
        mimeType,
        s3Key: key,
      },
    });

    // Use relative path '/api/files/:id/view' so both local and remote LAN peers download smoothly
    const downloadUrl = `/api/files/${attachment.id}/view`;

    return {
      attachmentId: attachment.id,
      uploadUrl,
      downloadUrl,
      key,
    };
  }

  async getFileStream(attachmentId: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new NotFoundException('Không tìm thấy tệp đính kèm');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: attachment.s3Key,
    });

    const s3Response = await this.s3Client.send(command);

    return {
      stream: s3Response.Body as any,
      mimeType: attachment.mimeType || 'application/octet-stream',
      fileSizeBytes: attachment.fileSizeBytes,
      originalName: attachment.originalName || attachment.fileName,
    };
  }

  async getDownloadUrl(userId: string, attachmentId: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        conversation: { include: { members: true } },
      },
    });

    if (!attachment) {
      throw new NotFoundException('Không tìm thấy tệp đính kèm');
    }

    const isMember = attachment.conversation.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('Bạn không có quyền tải xuống tệp này');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: attachment.s3Key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(attachment.originalName)}"`,
    });

    const downloadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    return { downloadUrl };
  }

  async uploadDirectFileBuffer(
    userId: string,
    conversationId: string,
    fileName: string,
    buffer: Buffer,
    mimeType: string,
  ) {
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `conversations/${conversationId}/${randomUUID()}-${cleanFileName}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    const attachment = await this.prisma.attachment.create({
      data: {
        conversationId,
        uploaderId: userId,
        fileName: cleanFileName,
        originalName: fileName,
        fileSizeBytes: buffer.length,
        mimeType,
        s3Key: key,
      },
    });

    return {
      id: attachment.id,
      fileName,
      fileSizeBytes: buffer.length,
      mimeType,
      downloadUrl: `/api/files/${attachment.id}/view`,
    };
  }

  async getConversationMediaAndFiles(userId: string, conversationId: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true },
    });

    if (!conv) {
      throw new NotFoundException('Không tìm thấy cuộc hội thoại');
    }

    const isMember = conv.members.some((m) => m.userId === userId);
    if (!isMember && conv.scope !== 'COMPANY') {
      throw new ForbiddenException('Bạn không có quyền truy cập tệp của cuộc hội thoại này');
    }

    const attachments = await this.prisma.attachment.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploader: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    const linkMessages = await this.prisma.message.findMany({
      where: {
        conversationId,
        content: { contains: 'http' },
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    const links: {
      url: string;
      domain: string;
      sender: { id: string; fullName: string; avatarUrl: string | null };
      createdAt: Date;
      messageId: string;
    }[] = [];

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    for (const msg of linkMessages) {
      const matches = msg.content.match(urlRegex);
      if (matches) {
        for (const url of matches) {
          try {
            const domain = new URL(url).hostname;
            links.push({
              url,
              domain,
              sender: msg.sender,
              createdAt: msg.createdAt,
              messageId: msg.id,
            });
          } catch {
            links.push({
              url,
              domain: 'web',
              sender: msg.sender,
              createdAt: msg.createdAt,
              messageId: msg.id,
            });
          }
        }
      }
    }

    let totalBytes = 0;
    const media: any[] = [];
    const files: any[] = [];

    for (const att of attachments) {
      totalBytes += att.fileSizeBytes || 0;
      const isMedia =
        att.mimeType?.startsWith('image/') ||
        att.mimeType?.startsWith('video/') ||
        att.fileName.match(/\.(png|jpg|jpeg|gif|webp|svg|mp4|mov|webm)$/i);

      const formatted = {
        id: att.id,
        conversationId: att.conversationId,
        fileName: att.fileName,
        originalName: att.originalName || att.fileName,
        fileSizeBytes: att.fileSizeBytes,
        mimeType: att.mimeType,
        downloadUrl: `/api/files/${att.id}/view`,
        directDownloadUrl: `/api/files/${att.id}/download`,
        createdAt: att.createdAt,
        uploader: att.uploader,
      };

      if (isMedia) {
        media.push(formatted);
      } else {
        files.push(formatted);
      }
    }

    return {
      stats: {
        totalFiles: attachments.length,
        totalBytes,
        mediaCount: media.length,
        documentCount: files.length,
        linkCount: links.length,
        isPermanent: true,
      },
      media,
      files,
      links,
    };
  }
}

