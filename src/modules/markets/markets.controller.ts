import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Create market (Admin)', description: 'Create a new prediction market' })
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
