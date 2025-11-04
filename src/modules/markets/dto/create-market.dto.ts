import { IsString, IsNumber, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class ConfigurationDto {
  @ApiProperty({ example: 'Bitcoin Price Prediction' })
  @IsString()
  @IsNotEmpty()
  marketName: string;

  @ApiProperty({ example: 'bitcoin-price-prediction', required: false })
  @IsString()
  @IsOptional()
  marketUrl?: string;

  @ApiProperty({ example: 'What will be the price of Bitcoin on Nov 5?' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({ example: 'Predict Bitcoin price at market resolution' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'Cryptocurrency' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 95000 })
  @IsNumber()
  minValue: number;

  @ApiProperty({ example: 115000 })
  @IsNumber()
  maxValue: number;

  @ApiProperty({ example: 200 })
  @IsNumber()
  bucketCount: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  bucketWidth: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  decimalPrecision: number;

  @ApiProperty({ example: 'USD' })
  @IsString()
  @IsNotEmpty()
  valueUnit: string;

  @ApiProperty({ example: 1762286400000 })
  @IsNumber()
  biddingDeadline: number;

  @ApiProperty({ example: 1762286400000 })
  @IsNumber()
  resolutionTime: number;

  @ApiProperty({ example: 50000000000 })
  @IsNumber()
  initialLiquidity: number;

  @ApiProperty({ example: '0x6030cba32d70bb17c95c60f35363fec6e9ab2a733ee92730dbf9bcb865f300a5::usdc::USDC' })
  @IsString()
  @IsNotEmpty()
  usdcType: string;
}

export class CreateMarketDto {
  @ApiProperty({ example: '0x2e24e453f1cf9bbec2ae26e9a89e4718dcc19e4ffddc84a4d40e854dc7b0d438' })
  @IsString()
  @IsNotEmpty()
  marketId: string;

  @ApiProperty({ example: '0xe513709db7de3c1bf235659872116534b3f0f94f053411b21296f3173c9b7ac3' })
  @IsString()
  @IsNotEmpty()
  creatorCapId: string;

  @ApiProperty({ example: '0x02b74bc5d2e5e8816731972b3a314429c6f9e270fc35136ffe52d9fa9db93d6d' })
  @IsString()
  @IsNotEmpty()
  packageId: string;

  @ApiProperty({ example: 'testnet' })
  @IsString()
  @IsNotEmpty()
  network: string;

  @ApiProperty({ example: '1762205571525' })
  @IsString()
  @IsNotEmpty()
  createdAt: string;

  @ApiProperty({ example: '4utQS71inTmTV5rZKB83oRLi6Tro2QTUyWciSTbPauak' })
  @IsString()
  @IsNotEmpty()
  transactionDigest: string;

  @ApiProperty()
  @IsNotEmpty()
  configuration: ConfigurationDto;

  @ApiProperty({ example: 'cryptocurrency' })
  @IsString()
  @IsNotEmpty()
  marketType: string;

  @ApiProperty({ 
    example: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
    required: false 
  })
  @IsString()
  @IsOptional()
  priceFeed?: string;

  @ApiProperty({ 
    example: 'Market resolves using CoinGecko price at 20:00 UTC',
    required: false 
  })
  @IsString()
  @IsOptional()
  resolutionCriteria?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  livePrice?: string;
}
