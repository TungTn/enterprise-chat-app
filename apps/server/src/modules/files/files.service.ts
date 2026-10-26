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
      endpoint: this.configService.get('S3_ENDPOINT') || 'http://localhost:9000',
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
  ) {
    // Check if user is a member of the conversation
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!member) {
      throw new ForbiddenException('Bạn không phải thành viên của cuộc hội thoại này');
    }

    // Size limit check (max 100MB)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (fileSizeBytes > MAX_SIZE) {
      throw new ForbiddenException('Dung lượng tệp vượt quá giới hạn 100MB');
    }

    const key = `conversations/${conversationId}/${randomUUID()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: mimeType,
    });

    // URL valid for 15 minutes
    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });

    // Pre-create attachment record
    const attachment = await this.prisma.attachment.create({
      data: {
        conversationId,
        uploaderId: userId,
        fileName,
        originalName: fileName,
        fileSizeBytes,
        mimeType,
        s3Key: key,
      },
    });

    return {
      attachmentId: attachment.id,
      uploadUrl,
      key,
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
}
