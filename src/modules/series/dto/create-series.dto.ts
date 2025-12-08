import { IsString, IsNumber, IsNotEmpty, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class SeriesTemplateDto {
  @ApiProperty({ example: 'Cryptocurrency' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  bucketCount: number;

  @ApiProperty({ example: 20 })
  @IsNumber()
  bucketWidth: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  decimalPrecision: number;

  @ApiProperty({ example: 'USD' })
  @IsString()
  valueUnit: string;

  @ApiProperty({ example: 'currency' })
  @IsString()
  valueType: string;

  @ApiProperty({ example: '$' })
  @IsString()
  valuePrefix: string;

  @ApiProperty({ example: '' })
  @IsString()
  valueSuffix: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  useKSuffix: boolean;

  @ApiProperty({ example: 1000000000 })
  @IsNumber()
  initialLiquidity: number;

  @ApiProperty({ example: '0x96b49fae10b0bed8938e3b8f1110c323dac320bc6d0781a0c4cb71dc237342fa::usdc::USDC' })
  @IsString()
  usdcType: string;

  @ApiProperty({ 
    example: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
    required: true 
  })
  @IsString()
  priceFeed: string;

  @ApiProperty({ 
    example: 'https://skepsis-markets-testnet.s3.us-east-1.amazonaws.com/markets/uuid.png',
    required: false 
  })
  @IsString()
  @IsOptional()
  marketImage?: string;

  @ApiProperty({ 
    example: 'markets/uuid.png',
    required: false 
  })
  @IsString()
  @IsOptional()
  marketImageKey?: string;

  @ApiProperty({ 
    example: 2,
    description: 'Price range as percentage (e.g., 2 = ±2% from current price)',
    required: false 
  })
  @IsNumber()
  @IsOptional()
  priceRangePercent?: number;

  @ApiProperty({ 
    example: 100,
    description: 'Price range as absolute value (e.g., 100 = ±$100 from current price)',
    required: false 
  })
  @IsNumber()
  @IsOptional()
  priceRangeAbsolute?: number;
}

export class CreateSeriesDto {
  @ApiProperty({ example: 'btc-hourly' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: 'Bitcoin Hourly' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '1h', description: '1h, 24h, 1w, etc.' })
  @IsString()
  @IsNotEmpty()
  frequency: string;

  @ApiProperty({ example: 'BTC' })
  @IsString()
  @IsNotEmpty()
  asset: string;

  @ApiProperty({ example: '0x978e9a5a93d95f3eeef0b1b5f6be7096f506e265a01e6b4954417ccc1c773675' })
  @IsString()
  @IsNotEmpty()
  packageId: string;

  @ApiProperty({ example: 'testnet' })
  @IsString()
  @IsNotEmpty()
  network: string;

  @ApiProperty({ example: 1733601600000, description: 'Timestamp for when first round should spawn' })
  @IsNumber()
  @IsNotEmpty()
  nextSpawnTime: number;

  @ApiProperty({ type: SeriesTemplateDto })
  @IsObject()
  @IsNotEmpty()
  template: SeriesTemplateDto;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  autoResolve?: boolean;
}

export class UpdateSeriesActiveMarketDto {
  @ApiProperty({ example: '0x123...' })
  @IsString()
  @IsNotEmpty()
  activeMarketId: string;

  @ApiProperty({ example: 43 })
  @IsNumber()
  @IsNotEmpty()
  currentRoundNumber: number;

  @ApiProperty({ 
    example: 1733605200000,
    description: 'Timestamp for when next round should spawn',
    required: false 
  })
  @IsNumber()
  @IsOptional()
  nextSpawnTime?: number;
}
