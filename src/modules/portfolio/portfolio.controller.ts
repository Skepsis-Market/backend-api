import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PortfolioService } from './portfolio.service';
import { UserPositionService } from './services/user-position.service';
import { PositionEventService } from './services/position-event.service';
import { LeaderboardService } from './services/leaderboard.service';
import { 
  PositionQueryDto, 
  EventHistoryQueryDto, 
  MarketPositionsQueryDto,
  LeaderboardQueryDto 
} from './dto/position-query.dto';

@ApiTags('Portfolio')
@Controller('portfolio')
export class PortfolioController {
  constructor(
    private readonly portfolioService: PortfolioService,
    private readonly userPositionService: UserPositionService,
    private readonly positionEventService: PositionEventService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  /**
   * GET /api/portfolio/:wallet
   * Get portfolio summary - total PnL, positions value, open/closed counts
   */
  @Get(':wallet')
  @ApiOperation({ summary: 'Get portfolio summary', description: 'Get user portfolio with total PnL and position counts' })
  @ApiParam({ name: 'wallet', description: 'Sui wallet address' })
  @ApiResponse({ status: 200, description: 'Portfolio summary retrieved successfully' })
  async getPortfolioSummary(@Param('wallet') wallet: string) {
    return this.portfolioService.getPortfolioSummary(wallet);
  }

  /**
   * GET /api/portfolio/:wallet/positions/open
   * Get active positions (open markets)
   */
  @Get(':wallet/positions/open')
  @ApiOperation({ summary: 'Get open positions', description: 'Get all active positions in open markets' })
  @ApiParam({ name: 'wallet', description: 'Sui wallet address' })
  @ApiResponse({ status: 200, description: 'Open positions retrieved successfully' })
  async getOpenPositions(@Param('wallet') wallet: string) {
    return this.portfolioService.getOpenPositions(wallet);
  }

  /**
   * GET /api/portfolio/:wallet/positions/closed
   * Get closed positions (settled, claimed, or sold)
   */
  @Get(':wallet/positions/closed')
  @ApiOperation({ summary: 'Get closed positions', description: 'Get all closed/settled positions' })
  @ApiParam({ name: 'wallet', description: 'Sui wallet address' })
  @ApiResponse({ status: 200, description: 'Closed positions retrieved successfully' })
  async getClosedPositions(@Param('wallet') wallet: string) {
    return this.portfolioService.getClosedPositions(wallet);
  }

  /**
   * GET /api/portfolio/:wallet/trades
   * Get trade history with pagination
   */
  @Get(':wallet/trades')
  @ApiOperation({ summary: 'Get trade history', description: 'Get paginated trade history for a wallet' })
  @ApiParam({ name: 'wallet', description: 'Sui wallet address' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of trades to return (default: 50)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination (default: 0)' })
  @ApiResponse({ status: 200, description: 'Trade history retrieved successfully' })
  async getTrades(
    @Param('wallet') wallet: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.portfolioService.getTrades(wallet, limitNum, offsetNum);
  }
}

// NEW ENDPOINTS - Position Tracking System

@ApiTags('Users')
@Controller('users')
export class UsersPositionController {
  constructor(
    private readonly userPositionService: UserPositionService,
    private readonly positionEventService: PositionEventService,
  ) {}

  /**
   * GET /api/users/:userAddress/positions
   * Get user's positions with advanced filtering
   */
  @Get(':userAddress/positions')
  @ApiOperation({ 
    summary: 'Get user positions', 
    description: 'Get user positions with filtering by status, market, and pagination' 
  })
  @ApiParam({ name: 'userAddress', description: 'User wallet address' })
  @ApiResponse({ status: 200, description: 'Positions retrieved successfully' })
  async getUserPositions(
    @Param('userAddress') userAddress: string,
    @Query() query: PositionQueryDto,
  ) {
    return this.userPositionService.getUserPositions(userAddress, query);
  }

  /**
   * GET /api/users/:userAddress/positions/history
   * Get position event history
   */
  @Get(':userAddress/positions/history')
  @ApiOperation({ 
    summary: 'Get position history', 
    description: 'Get immutable event log of all position changes' 
  })
  @ApiParam({ name: 'userAddress', description: 'User wallet address' })
  @ApiResponse({ status: 200, description: 'Event history retrieved successfully' })
  async getPositionHistory(
    @Param('userAddress') userAddress: string,
    @Query() query: EventHistoryQueryDto,
  ) {
    return this.positionEventService.getEventHistory(userAddress, query);
  }

  /**
   * GET /api/users/:userAddress/positions/:marketId/:rangeLower/:rangeUpper
   * Get specific position details
   */
  @Get(':userAddress/positions/:marketId/:rangeLower/:rangeUpper')
  @ApiOperation({ 
    summary: 'Get position details', 
    description: 'Get detailed information about a specific position' 
  })
  @ApiParam({ name: 'userAddress', description: 'User wallet address' })
  @ApiParam({ name: 'marketId', description: 'Market ID' })
  @ApiParam({ name: 'rangeLower', description: 'Range lower bound' })
  @ApiParam({ name: 'rangeUpper', description: 'Range upper bound' })
  @ApiResponse({ status: 200, description: 'Position details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Position not found' })
  async getPositionDetails(
    @Param('userAddress') userAddress: string,
    @Param('marketId') marketId: string,
    @Param('rangeLower') rangeLower: string,
    @Param('rangeUpper') rangeUpper: string,
  ) {
    const result = await this.userPositionService.getPositionDetails(
      userAddress,
      marketId,
      rangeLower,
      rangeUpper,
    );
    
    if (!result) {
      return { error: 'Position not found' };
    }
    
    return result;
  }

  /**
   * GET /api/users/:userAddress/portfolio
   * Get enhanced portfolio summary with per-market breakdown
   */
  @Get(':userAddress/portfolio')
  @ApiOperation({ 
    summary: 'Get portfolio summary', 
    description: 'Get comprehensive portfolio summary with per-market breakdown and recent activity' 
  })
  @ApiParam({ name: 'userAddress', description: 'User wallet address' })
  @ApiResponse({ status: 200, description: 'Portfolio summary retrieved successfully' })
  async getEnhancedPortfolio(@Param('userAddress') userAddress: string) {
    return this.userPositionService.getPortfolioSummary(userAddress);
  }
}

@ApiTags('Markets')
@Controller('markets')
export class MarketsPositionController {
  constructor(
    private readonly userPositionService: UserPositionService,
  ) {}

  /**
   * GET /api/markets/:marketId/positions
   * Get all positions in a market
   */
  @Get(':marketId/positions')
  @ApiOperation({ 
    summary: 'Get market positions', 
    description: 'Get all user positions in a specific market' 
  })
  @ApiParam({ name: 'marketId', description: 'Market ID' })
  @ApiResponse({ status: 200, description: 'Market positions retrieved successfully' })
  async getMarketPositions(
    @Param('marketId') marketId: string,
    @Query() query: MarketPositionsQueryDto,
  ) {
    return this.userPositionService.getMarketPositions(marketId, query);
  }
}

@ApiTags('Leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(
    private readonly leaderboardService: LeaderboardService,
  ) {}

  /**
   * GET /api/leaderboard
   * Get top traders leaderboard
   */
  @Get()
  @ApiOperation({ 
    summary: 'Get leaderboard', 
    description: 'Get top traders ranked by PnL, ROI, or volume' 
  })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved successfully' })
  async getLeaderboard(@Query() query: LeaderboardQueryDto) {
    const { metric = 'total_pnl', period = 'all', limit = 100 } = query;
    return this.leaderboardService.getLeaderboard(metric, period, limit);
  }
}
