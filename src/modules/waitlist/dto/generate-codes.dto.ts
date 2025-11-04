import { IsOptional, IsNumber, IsArray, IsString } from 'class-validator';

export class GenerateCodesDto {
  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  persona?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  contacts?: string[];
}
