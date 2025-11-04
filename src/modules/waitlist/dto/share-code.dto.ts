import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ShareCodeDto {
  @ApiProperty({
    description: 'Contact handle (telegram or twitter)',
    example: '@username',
  })
  @IsString()
  contact: string;

  @ApiProperty({
    description: 'Mark code as shared (true) or unshared (false)',
    example: true,
  })
  @IsBoolean()
  isShared: boolean;

  @ApiProperty({
    description: 'Admin who is sharing the code',
    example: 'admin',
    required: false,
  })
  @IsString()
  @IsOptional()
  sharedBy?: string;
}
