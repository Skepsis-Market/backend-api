import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiSecurity, ApiBody } from '@nestjs/swagger';
import { SeriesService } from './series.service';
import { CreateSeriesDto, UpdateSeriesActiveMarketDto } from './dto/create-series.dto';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiTags('Series')
@Controller('series')
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  /**
   * GET /api/series/id/:id
   * Get series by ObjectId
   */
  @Get('id/:id')
  @ApiOperation({ 
    summary: 'Get series by ID', 
    description: 'Get series metadata and active market by MongoDB ObjectId.' 
  })
  @ApiParam({ name: 'id', description: 'Series MongoDB ObjectId (e.g., "693599e21f25abda20e5a6fd")' })
  @ApiResponse({ 
    status: 200, 
    description: 'Series and active market retrieved successfully',
    schema: {
      example: {
        series: {
          id: "693599e21f25abda20e5a6fd",
          name: "Bitcoin Hourly",
          slug: "btc-hourly",
          frequency: "1h",
          asset: "BTC",
          currentRound: 42,
          nextSpawnTime: 1733601600000,
          isActive: true
        },
        activeMarket: {
          id: "0x123...",
          round: 42,
          closesAt: 1733598000000,
          min: 95000,
          max: 96000,
          status: "active"
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Series not found' })
  async getSeriesById(@Param('id') id: string) {
    return this.seriesService.getSeriesById(id);
  }

  /**
   * GET /api/series/:slug
   * Fast load: Get series metadata + active market
   */
  @Get(':slug')
  @ApiOperation({ 
    summary: 'Get series by slug', 
    description: 'Loads the series landing page with the currently active market. Fast endpoint for initial page load.' 
  })
  @ApiParam({ name: 'slug', description: 'Series URL slug (e.g., "btc-hourly")' })
  @ApiResponse({ 
    status: 200, 
    description: 'Series and active market retrieved successfully',
    schema: {
      example: {
        series: {
          id: "series_btc_hourly",
          name: "Bitcoin Hourly",
          slug: "btc-hourly",
          frequency: "1h",
          asset: "BTC",
          currentRound: 42,
          nextSpawnTime: 1733601600000,
          isActive: true
        },
        activeMarket: {
          id: "0x123...",
          round: 42,
          closesAt: 1733598000000,
          min: 95000,
          max: 96000,
          status: "active"
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Series not found' })
  async getSeriesBySlug(@Param('slug') slug: string) {
    return this.seriesService.getSeriesBySlug(slug);
  }

  /**
   * GET /api/series/:slug/rounds
   * Lazy load: Get historical rounds for sidebar
   */
  @Get(':slug/rounds')
  @ApiOperation({ 
    summary: 'Get series rounds', 
    description: 'Get historical rounds for the series. Used to populate the sidebar/drawer. Supports pagination.' 
  })
  @ApiParam({ name: 'slug', description: 'Series URL slug (e.g., "btc-hourly")' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of rounds to return (default: 20)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination (default: 0)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Series rounds retrieved successfully',
    schema: {
      example: {
        rounds: [
          { id: "0x123...", round: 42, status: "active" },
          { id: "0x122...", round: 41, status: "resolved", result: 95420 },
          { id: "0x121...", round: 40, status: "resolved", result: 95100 }
        ],
        pagination: {
          total: 42,
          limit: 20,
          offset: 0,
          hasMore: true
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Series not found' })
  async getSeriesRounds(
    @Param('slug') slug: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.seriesService.getSeriesRounds(
      slug,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  /**
   * POST /api/series
   * Create a new series (Admin only)
   */
  @UseGuards(AdminGuard)
  @Post()
  @ApiSecurity('admin-key')
  @ApiOperation({ 
    summary: 'Create new series (Admin)', 
    description: 'Create a new recurring market series with a template for spawning rounds.' 
  })
  @ApiBody({ 
    type: CreateSeriesDto,
    examples: {
      btcHourly: {
        summary: 'Bitcoin Hourly Series',
        value: {
          slug: 'btc-hourly',
          name: 'Bitcoin Hourly',
          frequency: '1h',
          asset: 'BTC',
          packageId: '0x978e9a5a93d95f3eeef0b1b5f6be7096f506e265a01e6b4954417ccc1c773675',
          network: 'testnet',
          nextSpawnTime: 1733601600000,
          template: {
            category: 'Cryptocurrency',
            bucketCount: 10,
            bucketWidth: 20,
            decimalPrecision: 0,
            valueUnit: 'USD',
            valueType: 'currency',
            valuePrefix: '$',
            valueSuffix: '',
            useKSuffix: false,
            initialLiquidity: 1000000000,
            usdcType: '0x96b49fae10b0bed8938e3b8f1110c323dac320bc6d0781a0c4cb71dc237342fa::usdc::USDC',
            priceFeed: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
            priceRangePercent: 0.2,
          },
          isActive: true,
          autoResolve: false,
        }
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Series created successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or missing admin credentials' })
  async createSeries(@Body() createSeriesDto: CreateSeriesDto) {
    return this.seriesService.createSeries(createSeriesDto);
  }

  /**
   * PATCH /api/series/:id/active-market
   * Update the active market for a series (Admin only)
   */
  @UseGuards(AdminGuard)
  @Patch(':id/active-market')
  @ApiSecurity('admin-key')
  @ApiOperation({ 
    summary: 'Update series active market (Admin)', 
    description: 'Point the series to a new active market round. Called after creating a new round on-chain.' 
  })
  @ApiParam({ name: 'id', description: 'Series MongoDB ObjectId' })
  @ApiBody({ type: UpdateSeriesActiveMarketDto })
  @ApiResponse({ status: 200, description: 'Active market updated successfully' })
  @ApiResponse({ status: 404, description: 'Series not found' })
  async updateSeriesActiveMarket(
    @Param('id') id: string,
    @Body() updateDto: UpdateSeriesActiveMarketDto,
  ) {
    return this.seriesService.updateSeriesActiveMarket(
      id,
      updateDto.activeMarketId,
      updateDto.currentRoundNumber,
      updateDto.nextSpawnTime,
    );
  }
}
