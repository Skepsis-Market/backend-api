import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { MarketsService } from './markets.service';
import { CreateMarketDto } from './dto/create-market.dto';
import { UpdateMarketStatusDto } from './dto/update-market-status.dto';
import { AdminGuard } from '../../common/guards/admin.guard';
import { S3UploadService } from '../../common/services/s3-upload.service';

@ApiTags('Markets')
@Controller('markets')
export class MarketsController {
  constructor(
    private readonly marketsService: MarketsService,
    private readonly s3UploadService: S3UploadService,
  ) {}

  /**
   * POST /api/markets
   * Create a new market
   */
  @UseGuards(AdminGuard)
  @Post()
  @ApiSecurity('admin-key')
  @ApiOperation({ 
    summary: 'Create market (Admin)', 
    description: `Create a new prediction market.

**cURL Example:**
\`\`\`bash
curl -X POST https://api.skepsis.live/api/markets \\
  -H "Content-Type: application/json" \\
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \\
  -d '{
    "marketId": "0x2e24e453f1cf9bbec2ae26e9a89e4718dcc19e4ffddc84a4d40e854dc7b0d438",
    "creatorCapId": "0xe513709db7de3c1bf235659872116534b3f0f94f053411b21296f3173c9b7ac3",
    "packageId": "0x02b74bc5d2e5e8816731972b3a314429c6f9e270fc35136ffe52d9fa9db93d6d",
    "network": "testnet",
    "createdAt": "1762205571525",
    "transactionDigest": "4utQS71inTmTV5rZKB83oRLi6Tro2QTUyWciSTbPauak",
    "configuration": {
      "marketName": "Bitcoin Price Prediction Nov 5",
      "question": "What will be the price of Bitcoin (BTC/USD) on November 5, 2025?",
      "description": "Predict Bitcoin price at market resolution",
      "category": "Cryptocurrency",
      "minValue": 95000,
      "maxValue": 115000,
      "bucketCount": 200,
      "bucketWidth": 100,
      "decimalPrecision": 0,
      "valueUnit": "USD",
      "biddingDeadline": 1762286400000,
      "resolutionTime": 1762286400000,
      "initialLiquidity": 50000000000,
      "usdcType": "0x6030cba32d70bb17c95c60f35363fec6e9ab2a733ee92730dbf9bcb865f300a5::usdc::USDC",
      "marketUrl": "bitcoin-price-prediction-nov-5"
    },
    "marketType": "cryptocurrency",
    "priceFeed": "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
    "resolutionCriteria": "Resolves using CoinGecko price at 20:00 UTC"
  }'
\`\`\`
    `
  })
  @ApiBody({
    type: CreateMarketDto,
    examples: {
      bitcoinMarket: {
        summary: 'Bitcoin - Large Currency ($90K format)',
        description: 'Large currency values use K suffix. Display: $95K - $115K',
        value: {
          marketId: '0x2e24e453f1cf9bbec2ae26e9a89e4718dcc19e4ffddc84a4d40e854dc7b0d438',
          creatorCapId: '0xe513709db7de3c1bf235659872116534b3f0f94f053411b21296f3173c9b7ac3',
          packageId: '0x02b74bc5d2e5e8816731972b3a314429c6f9e270fc35136ffe52d9fa9db93d6d',
          network: 'testnet',
          createdAt: '1762205571525',
          transactionDigest: '4utQS71inTmTV5rZKB83oRLi6Tro2QTUyWciSTbPauak',
          configuration: {
            marketName: 'Bitcoin Price Prediction Nov 5',
            question: 'What will be the price of Bitcoin (BTC/USD) on November 5, 2025?',
            description: 'Predict Bitcoin\'s price at market resolution',
            category: 'Cryptocurrency',
            minValue: 95000,
            maxValue: 115000,
            bucketCount: 200,
            bucketWidth: 100,
            decimalPrecision: 0,
            valueUnit: 'USD',
            valueType: 'currency',
            valuePrefix: '$',
            valueSuffix: '',
            useKSuffix: true,
            biddingDeadline: 1762286400000,
            resolutionTime: 1762286400000,
            initialLiquidity: 50000000000,
            usdcType: '0x6030cba32d70bb17c95c60f35363fec6e9ab2a733ee92730dbf9bcb865f300a5::usdc::USDC',
            marketUrl: 'bitcoin-price-prediction-nov-5'
          },
          marketType: 'cryptocurrency',
          priceFeed: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
          resolutionCriteria: 'Resolves using CoinGecko price at 20:00 UTC'
        }
      },
      suiMarket: {
        summary: 'SUI - Small Currency ($1.50 format)',
        description: 'Small currency values show decimals without K. Display: $1.50 - $3.50',
        value: {
          marketId: '0x3e24e453f1cf9bbec2ae26e9a89e4718dcc19e4ffddc84a4d40e854dc7b0d439',
          creatorCapId: '0xe513709db7de3c1bf235659872116534b3f0f94f053411b21296f3173c9b7ac3',
          packageId: '0x02b74bc5d2e5e8816731972b3a314429c6f9e270fc35136ffe52d9fa9db93d6d',
          network: 'testnet',
          createdAt: '1762205571525',
          transactionDigest: '5utQS71inTmTV5rZKB83oRLi6Tro2QTUyWciSTbPauak',
          configuration: {
            marketName: 'SUI Price Prediction',
            question: 'What will be the price of SUI on December 1, 2025?',
            description: 'Predict SUI token price',
            category: 'Cryptocurrency',
            minValue: 150,
            maxValue: 350,
            bucketCount: 200,
            bucketWidth: 1,
            decimalPrecision: 2,
            valueUnit: 'USD',
            valueType: 'currency',
            valuePrefix: '$',
            valueSuffix: '',
            useKSuffix: false,
            biddingDeadline: 1762286400000,
            resolutionTime: 1762286400000,
            initialLiquidity: 50000000000,
            usdcType: '0x6030cba32d70bb17c95c60f35363fec6e9ab2a733ee92730dbf9bcb865f300a5::usdc::USDC',
            marketUrl: 'sui-price-prediction'
          },
          marketType: 'cryptocurrency',
          priceFeed: 'https://api.coingecko.com/api/v3/simple/price?ids=sui&vs_currencies=usd',
          resolutionCriteria: 'Resolves using CoinGecko price'
        }
      },
      temperatureMarket: {
        summary: 'Temperature Market (21°C format)',
        description: 'Temperature values with °C suffix. Display: 15°C - 35°C',
        value: {
          marketId: '0x4e24e453f1cf9bbec2ae26e9a89e4718dcc19e4ffddc84a4d40e854dc7b0d440',
          creatorCapId: '0xe513709db7de3c1bf235659872116534b3f0f94f053411b21296f3173c9b7ac3',
          packageId: '0x02b74bc5d2e5e8816731972b3a314429c6f9e270fc35136ffe52d9fa9db93d6d',
          network: 'testnet',
          createdAt: '1762205571525',
          transactionDigest: '6utQS71inTmTV5rZKB83oRLi6Tro2QTUyWciSTbPauak',
          configuration: {
            marketName: 'NYC Summer Temperature',
            question: 'What will be the max temperature in NYC on July 4, 2025?',
            description: 'Predict maximum daily temperature',
            category: 'Weather',
            minValue: 15,
            maxValue: 35,
            bucketCount: 20,
            bucketWidth: 1,
            decimalPrecision: 0,
            valueUnit: 'Celsius',
            valueType: 'temperature',
            valuePrefix: '',
            valueSuffix: '°C',
            useKSuffix: false,
            biddingDeadline: 1762286400000,
            resolutionTime: 1762286400000,
            initialLiquidity: 50000000000,
            usdcType: '0x6030cba32d70bb17c95c60f35363fec6e9ab2a733ee92730dbf9bcb865f300a5::usdc::USDC',
            marketUrl: 'nyc-summer-temperature'
          },
          marketType: 'weather',
          resolutionCriteria: 'Resolves using NOAA weather data'
        }
      },
      percentageMarket: {
        summary: 'Interest Rate Market (4.50% format)',
        description: 'Percentage values with % suffix. Display: 4.50% - 5.50%',
        value: {
          marketId: '0x5e24e453f1cf9bbec2ae26e9a89e4718dcc19e4ffddc84a4d40e854dc7b0d441',
          creatorCapId: '0xe513709db7de3c1bf235659872116534b3f0f94f053411b21296f3173c9b7ac3',
          packageId: '0x02b74bc5d2e5e8816731972b3a314429c6f9e270fc35136ffe52d9fa9db93d6d',
          network: 'testnet',
          createdAt: '1762205571525',
          transactionDigest: '7utQS71inTmTV5rZKB83oRLi6Tro2QTUyWciSTbPauak',
          configuration: {
            marketName: 'Federal Reserve Rate Decision',
            question: 'What will the Fed interest rate be in December 2025?',
            description: 'Predict Federal Reserve interest rate',
            category: 'Economics',
            minValue: 450,
            maxValue: 550,
            bucketCount: 100,
            bucketWidth: 1,
            decimalPrecision: 2,
            valueUnit: 'percent',
            valueType: 'percentage',
            valuePrefix: '',
            valueSuffix: '%',
            useKSuffix: false,
            biddingDeadline: 1762286400000,
            resolutionTime: 1762286400000,
            initialLiquidity: 50000000000,
            usdcType: '0x6030cba32d70bb17c95c60f35363fec6e9ab2a733ee92730dbf9bcb865f300a5::usdc::USDC',
            marketUrl: 'fed-rate-decision'
          },
          marketType: 'economics',
          resolutionCriteria: 'Resolves using official Fed announcement'
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Market created successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or missing admin credentials' })
  async createMarket(@Body() createMarketDto: CreateMarketDto) {
    return this.marketsService.createMarket(createMarketDto);
  }

  /**
   * POST /api/markets/upload-image
   * Upload a market image to S3
   */
  @UseGuards(AdminGuard)
  @Post('upload-image')
  @ApiSecurity('admin-key')
  @ApiOperation({ 
    summary: 'Upload market image (Admin)', 
    description: 'Upload an image to S3 and get the URL to use in market creation' 
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Image uploaded successfully',
    schema: {
      example: {
        success: true,
        url: 'https://skepsis-markets.s3.us-east-1.amazonaws.com/markets/uuid.jpg',
        key: 'markets/uuid.jpg'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid or missing admin credentials' })
  @UseInterceptors(FileInterceptor('image'))
  async uploadMarketImage(@UploadedFile() file: Express.Multer.File) {
    try {
      console.log('Upload request received');
      console.log('File:', file ? `${file.originalname} (${file.size} bytes)` : 'No file');
      
      if (!file) {
        throw new Error('No file uploaded');
      }

      const { url, key } = await this.s3UploadService.uploadImage(file, 'markets');
      
      console.log('Upload successful:', { url, key });
      
      return {
        success: true,
        url,
        key,
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  /**
   * GET /api/markets
   * Get all markets with optional filters
   */
  @Get()
  @ApiOperation({ summary: 'List markets', description: 'Get all markets with optional filters' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (open, resolved, cancelled)' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by market type' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of markets to return (default: 50)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination (default: 0)' })
  @ApiResponse({ status: 200, description: 'Markets retrieved successfully' })
  async getAllMarkets(
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const filters = {
      category,
      status,
      type,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    };
    return this.marketsService.getAllMarkets(filters);
  }

  /**
   * GET /api/markets/url/:marketUrl
   * Get single market by URL slug
   */
  @Get('url/:marketUrl')
  @ApiOperation({ summary: 'Get market by URL', description: 'Get market details by URL slug' })
  @ApiParam({ name: 'marketUrl', description: 'Market URL slug' })
  @ApiResponse({ status: 200, description: 'Market retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async getMarketByUrl(@Param('marketUrl') marketUrl: string) {
    return this.marketsService.getMarketByUrl(marketUrl);
  }

  /**
   * PATCH /api/markets/:marketId/status
   * Update market status to resolved or cancelled
   */
  @UseGuards(AdminGuard)
  @Patch(':marketId/status')
  @ApiSecurity('admin-key')
  @ApiOperation({ 
    summary: 'Update market status (Admin)', 
    description: 'Resolve or cancel a market. When resolving, provide the final resolved value.' 
  })
  @ApiParam({ name: 'marketId', description: 'Market ID (Sui object ID)' })
  @ApiBody({
    type: UpdateMarketStatusDto,
    examples: {
      resolve: {
        summary: 'Resolve Market',
        description: 'Resolve a market with final value',
        value: {
          status: 'resolved',
          resolvedValue: 108500
        }
      },
      cancel: {
        summary: 'Cancel Market',
        description: 'Cancel a market',
        value: {
          status: 'cancelled'
        }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Market status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status or missing resolvedValue' })
  @ApiResponse({ status: 401, description: 'Invalid or missing admin credentials' })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async updateMarketStatus(
    @Param('marketId') marketId: string,
    @Body() updateStatusDto: UpdateMarketStatusDto,
  ) {
    return this.marketsService.updateMarketStatus(
      marketId, 
      updateStatusDto.status, 
      updateStatusDto.resolvedValue
    );
  }

  /**
   * GET /api/markets/:marketId
   * Get single market details by ID
   */
  @Get(':marketId')
  @ApiOperation({ summary: 'Get market by ID', description: 'Get market details by Sui object ID' })
  @ApiParam({ name: 'marketId', description: 'Market ID (Sui object ID)' })
  @ApiResponse({ status: 200, description: 'Market retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async getMarket(@Param('marketId') marketId: string) {
    return this.marketsService.getMarket(marketId);
  }
}
