import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ShareCodeDto {
  @IsBoolean()
  isShared: boolean;

  @IsString()
  @IsOptional()
  sharedBy?: string;
}
