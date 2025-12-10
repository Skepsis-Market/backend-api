import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PositionEvent, PositionEventDocument } from '../schemas/position-event.schema';
import { Market, MarketDocument } from '../../markets/schemas/market.schema';

@Injectable()
export class PositionEventService {
  constructor(
    @InjectModel(PositionEvent.name) private positionEventModel: Model<PositionEventDocument>,
    @InjectModel(Market.name) private marketModel: Model<MarketDocument>,
  ) {}

  /**
   * Get position event history with filters
   */
  async getEventHistory(
    userAddress: string,
    filters: {
      marketId?: string;
      rangeLower?: string;
      rangeUpper?: string;
      eventType?: 'SHARES_PURCHASED' | 'SHARES_SOLD' | 'REWARDS_CLAIMED';
      from?: string;
      to?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const { 
      marketId, 
      rangeLower, 
      rangeUpper, 
      eventType, 
      from, 
      to, 
      limit = 100, 
      offset = 0 
    } = filters;

    // Build query
    const query: any = { user_address: userAddress };
    
    if (marketId) {
      query.market_id = marketId;
    }
    
    if (rangeLower) {
      query.range_lower = Number(rangeLower);
    }
    
    if (rangeUpper) {
      query.range_upper = Number(rangeUpper);
    }
    
    if (eventType) {
      query.event_type = eventType;
    }
    
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = from;
      if (to) query.timestamp.$lte = to;
    }

    // Get events
    const events = await this.positionEventModel
      .find(query)
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const totalCount = await this.positionEventModel.countDocuments(query);

    // Get market details for events
    const marketIds = [...new Set(events.map(e => e.market_id))];
    const markets = await this.marketModel
      .find({ marketId: { $in: marketIds } })
      .lean();
    
    const marketMap = new Map(markets.map(m => [m.marketId, m]));

    // Format events
    const formattedEvents = events.map(event => {
      // Use indexer's realized_pnl_delta if available (new events after Dec 9, 2025)
      // For old events, it will be null
      const realizedPnl = event.realized_pnl_delta || null;

      return {
        timestamp: event.timestamp,
        event_type: event.event_type,
        market_id: event.market_id,
        market_name: marketMap.get(event.market_id)?.configuration?.marketName || 'Unknown Market',
        range_lower: event.range_lower,
        range_upper: event.range_upper,
        shares_delta: event.shares_delta,
        usdc_delta: event.usdc_delta,
        price_per_share: event.price_per_share,
        realized_pnl: realizedPnl, // Indexer-calculated PnL for SELL/CLAIM events
        tx_digest: event.tx_digest,
        is_fifo_sell: event.is_fifo_sell || false,
      };
    });

    return {
      events: formattedEvents,
      total_count: totalCount,
      metadata: {
        decimals: 6,
        value_unit: 'micro_usdc',
        note: 'All monetary values in micro-units. Divide by 1,000,000 for display.',
      },
    };
  }

  /**
   * Get events for a specific market (all users)
   */
  async getMarketEvents(
    marketId: string,
    filters: {
      eventType?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const { eventType, limit = 100, offset = 0 } = filters;

    const query: any = { market_id: marketId };
    if (eventType) {
      query.event_type = eventType;
    }

    const events = await this.positionEventModel
      .find(query)
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const totalCount = await this.positionEventModel.countDocuments(query);

    return {
      events: events.map(event => ({
        timestamp: event.timestamp,
        event_type: event.event_type,
        user_address: event.user_address,
        range_lower: event.range_lower,
        range_upper: event.range_upper,
        shares_delta: event.shares_delta,
        usdc_delta: event.usdc_delta,
        price_per_share: event.price_per_share,
        tx_digest: event.tx_digest,
      })),
      total_count: totalCount,
      metadata: {
        decimals: 6,
        value_unit: 'micro_usdc',
        note: 'All monetary values in micro-units. Divide by 1,000,000 for display.',
      },
    };
  }
}
