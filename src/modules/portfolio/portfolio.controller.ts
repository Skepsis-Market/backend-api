import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PortfolioService } from './portfolio.service';

@ApiTags('Portfolio')
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

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
