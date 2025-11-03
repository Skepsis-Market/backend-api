import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { MarketsService } from './markets.service';
import { CreateMarketDto } from './dto/create-market.dto';

@Controller('markets')
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  /**
   * POST /api/markets
   * Create a new market
   */
  @Post()
  async createMarket(@Body() createMarketDto: CreateMarketDto) {
    return this.marketsService.createMarket(createMarketDto);
  }

  /**
   * GET /api/markets
   * Get all markets with optional filters
   */
  @Get()
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
  async getMarketByUrl(@Param('marketUrl') marketUrl: string) {
    return this.marketsService.getMarketByUrl(marketUrl);
  }

  /**
   * PATCH /api/markets/:marketId/status
   * Update market status to resolved or cancelled
   * Body: { status: 'resolved' | 'cancelled', resolvedValue?: number }
   */
  @Patch(':marketId/status')
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
  async getMarket(@Param('marketId') marketId: string) {
    return this.marketsService.getMarket(marketId);
  }
}
