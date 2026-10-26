import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('presign-upload')
  async getPresignedUpload(
    @CurrentUser() user: { id: string },
    @Body()
    body: {
      conversationId: string;
      fileName: string;
      fileSizeBytes: number;
      mimeType: string;
    },
  ) {
    return this.filesService.getPresignedUploadUrl(
      user.id,
      body.conversationId,
      body.fileName,
      body.fileSizeBytes,
      body.mimeType,
    );
  }

  @Get(':id/download-url')
  async getDownloadUrl(
    @CurrentUser() user: { id: string },
    @Param('id') attachmentId: string,
  ) {
    return this.filesService.getDownloadUrl(user.id, attachmentId);
  }
}
