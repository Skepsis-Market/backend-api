import { IsString, IsNumber, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';

class ConfigurationDto {
  @IsString()
  @IsNotEmpty()
  marketName: string;

  @IsString()
  @IsOptional()
  marketUrl?: string;

  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsNumber()
  minValue: number;

  @IsNumber()
  maxValue: number;

  @IsNumber()
  bucketCount: number;

  @IsNumber()
  bucketWidth: number;

  @IsNumber()
  decimalPrecision: number;

  @IsString()
  @IsNotEmpty()
  valueUnit: string;

  @IsNumber()
  biddingDeadline: number;

  @IsNumber()
  resolutionTime: number;

  @IsNumber()
  initialLiquidity: number;

  @IsString()
  @IsNotEmpty()
  usdcType: string;
}

export class CreateMarketDto {
  @IsString()
  @IsNotEmpty()
  marketId: string;

  @IsString()
  @IsNotEmpty()
  creatorCapId: string;

  @IsString()
  @IsNotEmpty()
  packageId: string;

  @IsString()
  @IsNotEmpty()
  network: string;

  @IsString()
  @IsNotEmpty()
  createdAt: string;

  @IsString()
  @IsNotEmpty()
  transactionDigest: string;

  @IsNotEmpty()
  configuration: ConfigurationDto;

  @IsString()
  @IsNotEmpty()
  marketType: string;

  @IsUrl()
  @IsOptional()
  livePrice?: string;
}
