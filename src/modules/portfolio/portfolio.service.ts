import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Trade, TradeDocument } from './schemas/trade.schema';
import { Position, PositionDocument } from './schemas/position.schema';
import { SuiPriceService } from './sui-price.service';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectModel(Trade.name) private tradeModel: Model<TradeDocument>,
    @InjectModel(Position.name) private positionModel: Model<PositionDocument>,
    private suiPriceService: SuiPriceService,
  ) {}

  /**
   * Convert micro-units to USDC display value
   */
  private toUSDC(microUnits: string): number {
    return Number(microUnits) / 1_000_000;
  }

  /**
   * Get portfolio summary
   */
  async getPortfolioSummary(wallet: string) {
    // Get all closed positions for realized PnL
    const closedPositions = await this.positionModel.find({
      user: wallet,
      status: { $in: ['CLAIMED', 'SOLD', 'LOSING'] },
    });

    // Calculate realized PnL from closed positions
    const realizedPnL = closedPositions.reduce((sum, pos) => {
      return sum + this.toUSDC(pos.financial.realized_pnl);
    }, 0);

    // Get open positions value
    const openPositions = await this.getOpenPositions(wallet);
    const positionsValue = openPositions.reduce((sum, pos) => sum + pos.current_value, 0);
    
    // Calculate unrealized PnL (current value - invested)
    const totalInvestedOpen = openPositions.reduce((sum, pos) => sum + pos.total_invested, 0);
    const unrealizedPnL = positionsValue - totalInvestedOpen;

    // Get position counts
    const openCount = openPositions.length;
    const closedCount = closedPositions.length;

    return {
      total_portfolio: positionsValue,
      pnl: realizedPnL + unrealizedPnL,
      pnl_percent: totalInvestedOpen > 0 ? ((realizedPnL + unrealizedPnL) / totalInvestedOpen) * 100 : 0,
      positions_value: positionsValue,
      cash: 0, // TODO: Fetch from Sui wallet balance
      open_positions_count: openCount,
      closed_positions_count: closedCount,
      realized_pnl: realizedPnL,
      unrealized_pnl: unrealizedPnL,
    };
  }

  /**
   * Get open positions (active markets)
   */
  async getOpenPositions(wallet: string) {
    // Get all trades for this user that are not in closed positions
    const closedPositionMarkets = await this.positionModel
      .find({ user: wallet })
      .distinct('market_id');

    const trades = await this.tradeModel.find({
      user: wallet,
      action: { $in: ['BUY', 'SELL'] },
      market_id: { $nin: closedPositionMarkets }, // Exclude resolved markets
    });

    // Group trades by market_id and range
    const positionMap = new Map<string, any>();

    for (const trade of trades) {
      const key = `${trade.market_id}_${trade.range.start}_${trade.range.end}`;
      
      if (!positionMap.has(key)) {
        positionMap.set(key, {
          market_id: trade.market_id,
          range: trade.range,
          shares_bought: 0,
          shares_sold: 0,
          total_invested: 0,
          total_received: 0,
          trades: [],
        });
      }

      const position = positionMap.get(key);
      position.trades.push(trade);

      if (trade.action === 'BUY') {
        position.shares_bought += this.toUSDC(trade.shares);
        position.total_invested += this.toUSDC(trade.amount);
      } else if (trade.action === 'SELL') {
        position.shares_sold += this.toUSDC(trade.shares);
        position.total_received += this.toUSDC(trade.amount);
      }
    }

    // Prepare positions for batch price fetching
    const positionsArray = Array.from(positionMap.values())
      .filter((pos) => pos.shares_bought - pos.shares_sold > 0)
      .map((pos) => ({
        ...pos,
        finalShares: pos.shares_bought - pos.shares_sold,
        avgEntryPrice: pos.total_invested / pos.shares_bought,
      }));

    // Batch fetch current prices from SDK
    const priceData = await this.suiPriceService.batchGetPositionValues(
      positionsArray.map((pos) => ({
        marketId: pos.market_id,
        rangeStart: BigInt(pos.range.start),
        rangeEnd: BigInt(pos.range.end),
        shares: BigInt(Math.floor(pos.finalShares * 1_000_000)), // Convert to micro-units
        costBasis: BigInt(Math.floor(pos.total_invested * 1_000_000)),
      })),
    );

    // Format positions for response with real prices
    return positionsArray.map((pos, index) => {
      const prices = priceData[index];

      return {
        market_id: pos.market_id,
        market_title: `Market ${pos.market_id.slice(0, 8)}...`, // TODO: Fetch from markets collection
        range: {
          start: Number(pos.range.start),
          end: Number(pos.range.end),
        },
        shares: pos.finalShares,
        avg_entry_price: pos.avgEntryPrice,
        current_price: prices.currentPrice,
        current_value: prices.currentValue,
        total_invested: pos.total_invested,
        pnl: prices.unrealizedPnL,
        pnl_percent: prices.unrealizedPnLPercent,
        probability: prices.probability,
      };
    });
  }

  /**
   * Get closed positions
   */
  async getClosedPositions(wallet: string) {
    const positions = await this.positionModel.find({
      user: wallet,
      status: { $in: ['CLAIMED', 'SOLD', 'LOSING'] },
    });

    return positions.map((pos) => ({
      market_id: pos.market_id,
      market_title: `Market ${pos.market_id.slice(0, 8)}...`, // TODO: Fetch from markets collection
      range: {
        start: Number(pos.range.start),
        end: Number(pos.range.end),
      },
      status: pos.status,
      shares_bought: this.toUSDC(pos.trade_summary.total_shares_bought),
      shares_sold: this.toUSDC(pos.trade_summary.total_shares_sold),
      final_shares: this.toUSDC(pos.trade_summary.final_shares),
      total_invested: this.toUSDC(pos.financial.total_invested),
      total_received: this.toUSDC(pos.financial.total_received_sells),
      claim_amount: this.toUSDC(pos.financial.claim_amount),
      pnl: this.toUSDC(pos.financial.realized_pnl),
      pnl_percent:
        this.toUSDC(pos.financial.total_invested) > 0
          ? (this.toUSDC(pos.financial.realized_pnl) / this.toUSDC(pos.financial.total_invested)) * 100
          : 0,
      avg_entry_price: this.toUSDC(pos.financial.avg_entry_price),
      resolved_at: pos.resolved_at,
    }));
  }

  /**
   * Get trade history
   */
  async getTrades(wallet: string, limit: number = 50, offset: number = 0) {
    const trades = await this.tradeModel
      .find({ user: wallet })
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit);

    const total = await this.tradeModel.countDocuments({ user: wallet });

    return {
      trades: trades.map((trade) => ({
        tx_hash: trade.tx_hash,
        market_id: trade.market_id,
        market_title: `Market ${trade.market_id.slice(0, 8)}...`, // TODO: Fetch from markets collection
        action: trade.action,
        range: {
          start: Number(trade.range.start),
          end: Number(trade.range.end),
        },
        shares: this.toUSDC(trade.shares),
        amount: this.toUSDC(trade.amount),
        price_per_share: this.toUSDC(trade.price_per_share),
        probability: trade.probability ? this.toUSDC(trade.probability) : null,
        timestamp: parseInt(trade.timestamp, 10) > 0 
          ? new Date(parseInt(trade.timestamp, 10)).toISOString()
          : trade.indexed_at ? trade.indexed_at.toISOString() : null,
      })),
      pagination: {
        total,
        limit,
        offset,
        has_more: offset + limit < total,
      },
    };
  }
}
