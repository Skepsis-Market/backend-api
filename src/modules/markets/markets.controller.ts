import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { MarketsService } from './markets.service';
import { CreateMarketDto } from './dto/create-market.dto';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiTags('Markets')
@Controller('markets')
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

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
        summary: 'Bitcoin Price Market',
        description: 'Example of creating a Bitcoin price prediction market',
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
            description: 'Predict Bitcoin\'s price at market resolution. Current price: $108,000',
            category: 'Cryptocurrency',
            minValue: 95000,
            maxValue: 115000,
            bucketCount: 200,
            bucketWidth: 100,
            decimalPrecision: 0,
            valueUnit: 'USD',
            biddingDeadline: 1762286400000,
            resolutionTime: 1762286400000,
            initialLiquidity: 50000000000,
            usdcType: '0x6030cba32d70bb17c95c60f35363fec6e9ab2a733ee92730dbf9bcb865f300a5::usdc::USDC',
            marketUrl: 'bitcoin-price-prediction-nov-5'
          },
          marketType: 'cryptocurrency',
          priceFeed: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true',
          resolutionCriteria: 'This market resolves using the Bitcoin (BTC/USD) price reported by CoinGecko at 20:00:00 UTC on 2025-11-04. The final price will be the floor price (removing decimals) of the reported price for settlement.'
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
   * Body: { status: 'resolved' | 'cancelled', resolvedValue?: number }
   */
  @UseGuards(AdminGuard)
  @Patch(':marketId/status')
  @ApiSecurity('admin-key')
  @ApiOperation({ summary: 'Update market status (Admin)', description: 'Resolve or cancel a market' })
  @ApiParam({ name: 'marketId', description: 'Market ID (Sui object ID)' })
  @ApiResponse({ status: 200, description: 'Market status updated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or missing admin credentials' })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async updateMarketStatus(
    @Param('marketId') marketId: string,
    @Body('status') status: string,
    @Body('resolvedValue') resolvedValue?: number,
  ) {
    return this.marketsService.updateMarketStatus(marketId, status, resolvedValue);
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
