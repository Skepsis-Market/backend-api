import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserPosition, UserPositionDocument } from '../schemas/user-position.schema';
import { Market, MarketDocument } from '../../markets/schemas/market.schema';

@Injectable()
export class UserPositionService {
  constructor(
    @InjectModel(UserPosition.name) private userPositionModel: Model<UserPositionDocument>,
    @InjectModel(Market.name) private marketModel: Model<MarketDocument>,
  ) {}

  /**
   * Convert micro-units to display value
   */
  private toDecimal(microUnits: string): number {
    return Number(microUnits) / 1_000_000;
  }

  /**
   * Calculate market status
   */
  private calculateMarketStatus(market: any): string {
    const now = Date.now();
    if (market.status === 'cancelled') return 'CANCELLED';
    if (market.status === 'resolved') return 'RESOLVED';
    if (now < market.configuration?.biddingDeadline) return 'ACTIVE';
    return 'RESOLVED';
  }

  /**
   * Get user positions with filters
   */
  async getUserPositions(
    userAddress: string,
    filters: {
      status?: 'active' | 'closed' | 'all';
      marketId?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const { status = 'active', marketId, limit = 50, offset = 0 } = filters;

    // Build query
    const query: any = { user_address: userAddress };
    
    if (status === 'active') {
      query.is_active = true;
    } else if (status === 'closed') {
      query.is_active = false;
    }
    
    if (marketId) {
      query.market_id = marketId;
    }

    // Get positions
    const positions = await this.userPositionModel
      .find(query)
      .sort({ last_updated_at: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const totalCount = await this.userPositionModel.countDocuments(query);

    // Get market details for each position
    const marketIds = [...new Set(positions.map(p => p.market_id))];
    const markets = await this.marketModel
      .find({ marketId: { $in: marketIds } })
      .lean();
    
    const marketMap = new Map(markets.map(m => [m.marketId, m]));

    // Format positions with market data
    const formattedPositions = positions.map(pos => {
      const market = marketMap.get(pos.market_id);
      const marketStatus = market ? this.calculateMarketStatus(market) : 'UNKNOWN';
      
      // Per alignment doc: unrealized_pnl only for resolved markets, null for active
      // Indexer sets unrealized_pnl when market resolves (win/loss)
      // Frontend calculates it for active markets using LMSR curve
      const isResolved = marketStatus === 'RESOLVED';
      const unrealizedPnl = isResolved ? (pos.unrealized_pnl || '0') : null;
      
      // Calculate total PnL and ROI
      const costBasisDecimal = this.toDecimal(pos.total_cost_basis);
      const totalPnlValue = Number(pos.realized_pnl) + (unrealizedPnl ? Number(unrealizedPnl) : 0);
      const totalPnl = String(totalPnlValue);
      const roiPercent = costBasisDecimal > 0 ? (totalPnlValue / 1_000_000 / costBasisDecimal) * 100 : 0;

      // Check if winner (for resolved markets)
      let isWinner = null;
      if (isResolved && market?.resolvedValue !== undefined) {
        isWinner = market.resolvedValue >= pos.range_lower && market.resolvedValue <= pos.range_upper;
      }

      return {
        market_id: pos.market_id,
        market_name: market?.configuration?.marketName || 'Unknown Market',
        market_status: marketStatus,
        category: market?.configuration?.category || 'Unknown',
        range_lower: pos.range_lower,
        range_upper: pos.range_upper,
        total_shares: pos.total_shares,
        total_cost_basis: pos.total_cost_basis,
        avg_entry_price: pos.avg_entry_price,
        unrealized_pnl: unrealizedPnl,  // null for active, value for resolved
        realized_pnl: pos.realized_pnl,
        total_pnl: totalPnl,
        roi_percent: roiPercent,
        first_purchase_at: pos.first_purchase_at,
        last_updated_at: pos.last_updated_at,
        is_active: pos.is_active,
        resolved_value: isResolved ? String(market?.resolvedValue || 0) : null,
        is_winner: isWinner,
        close_reason: pos.close_reason || null,
      };
    });

    // Calculate summary
    const allPositions = await this.userPositionModel
      .find({ user_address: userAddress })
      .lean();

    const totalInvested = allPositions.reduce(
      (sum, p) => sum + Number(p.total_cost_basis),
      0,
    );
    const totalRealizedPnl = allPositions.reduce(
      (sum, p) => sum + Number(p.realized_pnl),
      0,
    );
    // Aggregate unrealized_pnl only from resolved markets (indexer sets this)
    const totalUnrealizedPnl = allPositions.reduce(
      (sum, p) => sum + Number(p.unrealized_pnl || 0),
      0,
    );
    const activeCount = allPositions.filter(p => p.is_active).length;
    const totalPnl = totalRealizedPnl + totalUnrealizedPnl;

    return {
      positions: formattedPositions,
      total_count: totalCount,
      summary: {
        total_positions: allPositions.length,
        active_positions: activeCount,
        total_invested: String(totalInvested),
        total_realized_pnl: String(totalRealizedPnl),
        total_unrealized_pnl: String(totalUnrealizedPnl),
        total_pnl: String(totalPnl),
        roi_percent: totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0,
      },
      metadata: {
        decimals: 6,
        value_unit: 'micro_usdc',
        note: 'All monetary values in micro-units. Divide by 1,000,000 for display. unrealized_pnl is null for active markets (frontend calculates using LMSR), set by indexer for resolved markets.',
      },
    };
  }

  /**
   * Get specific position details
   */
  async getPositionDetails(
    userAddress: string,
    marketId: string,
    rangeLower: string,
    rangeUpper: string,
  ) {
    const position = await this.userPositionModel
      .findOne({
        user_address: userAddress,
        market_id: marketId,
        range_lower: Number(rangeLower),
        range_upper: Number(rangeUpper),
      })
      .lean();

    if (!position) {
      return null;
    }

    // Get market details
    const market = await this.marketModel.findOne({ marketId }).lean();
    const marketStatus = market ? this.calculateMarketStatus(market) : 'UNKNOWN';

    // Per alignment doc: unrealized_pnl only for resolved markets, null for active
    const isResolved = marketStatus === 'RESOLVED';
    const unrealizedPnl = isResolved ? (position.unrealized_pnl || '0') : null;

    const totalPnlValue = Number(position.realized_pnl) + (unrealizedPnl ? Number(unrealizedPnl) : 0);
    const totalPnl = String(totalPnlValue);
    const costBasisDecimal = this.toDecimal(position.total_cost_basis);
    const roiPercent = costBasisDecimal > 0 
      ? (totalPnlValue / 1_000_000 / costBasisDecimal) * 100 
      : 0;

    // Check if winner (for resolved markets)
    let isWinner = null;
    if (isResolved && market?.resolvedValue !== undefined) {
      isWinner = market.resolvedValue >= position.range_lower && market.resolvedValue <= position.range_upper;
    }

    return {
      position: {
        user_address: position.user_address,
        market_id: position.market_id,
        market_name: market?.configuration?.marketName || 'Unknown Market',
        market_status: marketStatus,
        range_lower: position.range_lower,
        range_upper: position.range_upper,
        total_shares: position.total_shares,
        total_cost_basis: position.total_cost_basis,
        avg_entry_price: position.avg_entry_price,
        realized_pnl: position.realized_pnl,
        total_shares_sold: position.total_shares_sold,
        total_proceeds: position.total_proceeds,
        unrealized_pnl: unrealizedPnl,  // null for active, value for resolved
        total_pnl: totalPnl,
        roi_percent: roiPercent,
        first_purchase_at: position.first_purchase_at,
        last_updated_at: position.last_updated_at,
        is_active: position.is_active,
        resolved_value: isResolved ? String(market?.resolvedValue || 0) : null,
        is_winner: isWinner,
        close_reason: position.close_reason || null,
      },
      metadata: {
        decimals: 6,
        value_unit: 'micro_usdc',
        note: 'All monetary values in micro-units. Divide by 1,000,000 for display.',
      },
    };
  }

  /**
   * Get enhanced portfolio summary with per-market breakdown
   */
  async getPortfolioSummary(userAddress: string) {
    const positions = await this.userPositionModel
      .find({ user_address: userAddress })
      .lean();

    if (positions.length === 0) {
      return {
        summary: {
          total_positions: 0,
          active_positions: 0,
          closed_positions: 0,
          total_markets: 0,
          total_invested: '0',
          current_value: '0',
          total_realized_pnl: '0',
          total_unrealized_pnl: '0',
          total_pnl: '0',
          roi_percent: 0,
        },
        by_market: [],
        recent_activity: [],
      };
    }

    // Get unique markets
    const marketIds = [...new Set(positions.map(p => p.market_id))];
    const markets = await this.marketModel
      .find({ marketId: { $in: marketIds } })
      .lean();
    const marketMap = new Map(markets.map(m => [m.marketId, m]));

    // Calculate summary
    const activePositions = positions.filter(p => p.is_active);
    const closedPositions = positions.filter(p => !p.is_active);
    
    const totalInvested = positions.reduce((sum, p) => sum + Number(p.total_cost_basis), 0);
    const totalRealizedPnl = positions.reduce((sum, p) => sum + Number(p.realized_pnl), 0);
    const totalUnrealizedPnl = positions.reduce((sum, p) => sum + Number(p.unrealized_pnl || 0), 0);
    const totalPnl = totalRealizedPnl + totalUnrealizedPnl;

    // Group by market
    const byMarket = marketIds.map(marketId => {
      const marketPositions = positions.filter(p => p.market_id === marketId);
      const market = marketMap.get(marketId);
      
      const invested = marketPositions.reduce((sum, p) => sum + Number(p.total_cost_basis), 0);
      const realizedPnl = marketPositions.reduce((sum, p) => sum + Number(p.realized_pnl), 0);
      const unrealizedPnl = marketPositions.reduce((sum, p) => sum + Number(p.unrealized_pnl || 0), 0);
      const totalShares = marketPositions.reduce((sum, p) => sum + Number(p.total_shares), 0);
      const pnl = realizedPnl + unrealizedPnl;

      return {
        market_id: marketId,
        market_name: market?.configuration?.marketName || 'Unknown Market',
        positions_count: marketPositions.length,
        total_shares: String(totalShares),
        invested: String(invested),
        current_value: String(totalShares), // Simplified
        pnl: String(pnl),
        roi_percent: invested > 0 ? (pnl / invested) * 100 : 0,
      };
    });

    return {
      summary: {
        total_positions: positions.length,
        active_positions: activePositions.length,
        closed_positions: closedPositions.length,
        total_markets: marketIds.length,
        total_invested: String(totalInvested),
        current_value: String(totalInvested + totalUnrealizedPnl),
        total_realized_pnl: String(totalRealizedPnl),
        total_unrealized_pnl: String(totalUnrealizedPnl),
        total_pnl: String(totalPnl),
        roi_percent: totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0,
      },
      by_market: byMarket.sort((a, b) => Number(b.invested) - Number(a.invested)),
      metadata: {
        decimals: 6,
        value_unit: 'micro_usdc',
        note: 'All monetary values in micro-units. Divide by 1,000,000 for display.',
      },
    };
  }

  /**
   * Get market positions (all users)
   */
  async getMarketPositions(
    marketId: string,
    filters: {
      status?: 'active' | 'all';
      sortBy?: 'shares' | 'value' | 'pnl';
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const { status = 'active', sortBy = 'shares', limit = 50, offset = 0 } = filters;

    const query: any = { market_id: marketId };
    if (status === 'active') {
      query.is_active = true;
    }

    // Determine sort field
    const sortField = sortBy === 'shares' ? 'total_shares' 
      : sortBy === 'pnl' ? 'realized_pnl' 
      : 'total_cost_basis';

    const positions = await this.userPositionModel
      .find(query)
      .sort({ [sortField]: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const totalCount = await this.userPositionModel.countDocuments(query);

    // Get market to check if resolved
    const market = await this.marketModel.findOne({ marketId }).lean();
    const marketStatus = market ? this.calculateMarketStatus(market) : 'UNKNOWN';
    const isResolved = marketStatus === 'RESOLVED';

    const formattedPositions = positions.map(pos => {
      // Check if winner (for resolved markets)
      let isWinner = null;
      if (isResolved && market?.resolvedValue !== undefined) {
        isWinner = market.resolvedValue >= pos.range_lower && market.resolvedValue <= pos.range_upper;
      }

      return {
        user_address: pos.user_address,
        range_lower: pos.range_lower,
        range_upper: pos.range_upper,
        total_shares: pos.total_shares,
        total_cost_basis: pos.total_cost_basis,
        avg_entry_price: pos.avg_entry_price,
        unrealized_pnl: isResolved ? (pos.unrealized_pnl || '0') : null,  // null for active, value for resolved
        realized_pnl: pos.realized_pnl,
        first_purchase_at: pos.first_purchase_at,
        resolved_value: isResolved ? String(market?.resolvedValue || 0) : null,
        is_winner: isWinner,
        close_reason: pos.close_reason || null,
      };
    });

    // Market summary
    const allPositions = await this.userPositionModel
      .find({ market_id: marketId, is_active: true })
      .lean();

    const uniqueHolders = new Set(allPositions.map(p => p.user_address)).size;
    const totalShares = allPositions.reduce((sum, p) => sum + Number(p.total_shares), 0);
    const totalVolume = allPositions.reduce((sum, p) => sum + Number(p.total_cost_basis), 0);

    return {
      positions: formattedPositions,
      total_count: totalCount,
      market_summary: {
        total_holders: uniqueHolders,
        total_shares_held: String(totalShares),
        total_volume: String(totalVolume),
      },
      metadata: {
        decimals: 6,
        value_unit: 'micro_usdc',
        note: 'All monetary values in micro-units. Divide by 1,000,000 for display.',
      },
    };
  }
}
