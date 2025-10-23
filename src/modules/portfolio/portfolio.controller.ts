import { Controller, Get, Param, Query } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';

@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  /**
   * GET /api/portfolio/:wallet
   * Get portfolio summary - total PnL, positions value, open/closed counts
   */
  @Get(':wallet')
  async getPortfolioSummary(@Param('wallet') wallet: string) {
    return this.portfolioService.getPortfolioSummary(wallet);
  }

  /**
   * GET /api/portfolio/:wallet/positions/open
   * Get active positions (open markets)
   */
  @Get(':wallet/positions/open')
  async getOpenPositions(@Param('wallet') wallet: string) {
    return this.portfolioService.getOpenPositions(wallet);
  }

  /**
   * GET /api/portfolio/:wallet/positions/closed
   * Get closed positions (settled, claimed, or sold)
   */
  @Get(':wallet/positions/closed')
  async getClosedPositions(@Param('wallet') wallet: string) {
    return this.portfolioService.getClosedPositions(wallet);
  }

  /**
   * GET /api/portfolio/:wallet/trades
   * Get trade history with pagination
   */
  @Get(':wallet/trades')
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
