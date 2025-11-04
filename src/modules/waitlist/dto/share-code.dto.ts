import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ShareCodeDto {
  @IsString()
  contact: string;

  @IsBoolean()
  isShared: boolean;

  @IsString()
  @IsOptional()
  sharedBy?: string;
}
