import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ChannelScope } from '@enterprise-chat/shared-types';

export class CreateChannelDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên kênh không được để trống' })
  @MaxLength(80, { message: 'Tên kênh không vượt quá 80 ký tự' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ChannelScope, { message: 'Phạm vi kênh không hợp lệ' })
  scope: ChannelScope;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  memberIds?: string[];
}
