import { Controller, Post, Get, Body, Param, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { Readable } from 'stream';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('presign-upload')
  async getPresignedUpload(
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      conversationId: string;
      fileName: string;
      fileSizeBytes: number;
      mimeType: string;
      clientHost?: string;
    },
  ) {
    return this.filesService.getPresignedUploadUrl(
      user.id,
      body.conversationId,
      body.fileName,
      body.fileSizeBytes,
      body.mimeType,
      body.clientHost,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload-direct')
  async uploadDirect(
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      conversationId: string;
      fileName: string;
      mimeType: string;
      base64Data: string;
    },
  ) {
    const buffer = Buffer.from(body.base64Data, 'base64');
    return this.filesService.uploadDirectFileBuffer(
      user.id,
      body.conversationId,
      body.fileName,
      buffer,
      body.mimeType,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('conversation/:conversationId')
  async getConversationMediaAndFiles(
    @CurrentUser() user: { id: string },
    @Param('conversationId') conversationId: string,
  ) {
    return this.filesService.getConversationMediaAndFiles(user.id, conversationId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/download-url')
  async getDownloadUrl(
    @CurrentUser() user: { id: string },
    @Param('id') attachmentId: string,
  ) {
    return this.filesService.getDownloadUrl(user.id, attachmentId);
  }

  @Get(':id/view')
  async viewFile(@Param('id') attachmentId: string, @Res() res: Response) {
    const file = await this.filesService.getFileStream(attachmentId);
    res.setHeader('Content-Type', file.mimeType);
    if (file.fileSizeBytes) {
      res.setHeader('Content-Length', file.fileSizeBytes);
    }
    res.setHeader('Cache-Control', 'public, max-age=86400');
    (file.stream as Readable).pipe(res);
  }

  @Get(':id/download')
  async downloadFile(@Param('id') attachmentId: string, @Res() res: Response) {
    const file = await this.filesService.getFileStream(attachmentId);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.originalName)}"`,
    );
    (file.stream as Readable).pipe(res);
  }
}
