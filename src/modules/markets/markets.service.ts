import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Market, MarketDocument } from './schemas/market.schema';
import { CreateMarketDto } from './dto/create-market.dto';

@Injectable()
export class MarketsService {
  constructor(
    @InjectModel(Market.name) private marketModel: Model<MarketDocument>,
  ) {}

  /**
   * Create a new market
   */
  async createMarket(createMarketDto: CreateMarketDto) {
    // Check if market already exists
    const existing = await this.marketModel.findOne({ marketId: createMarketDto.marketId });
    if (existing) {
      throw new ConflictException(`Market ${createMarketDto.marketId} already exists`);
    }

    // Generate marketUrl if not provided
    if (!createMarketDto.configuration.marketUrl) {
      createMarketDto.configuration.marketUrl = this.generateMarketUrl(
        createMarketDto.configuration.marketName,
        createMarketDto.marketId,
      );
    }

    // Create market with active status
    const market = new this.marketModel({
      ...createMarketDto,
      status: 'active',
    });

    await market.save();

    return {
      message: 'Market created successfully',
      marketId: market.marketId,
      marketUrl: market.configuration.marketUrl,
    };
  }

  /**
   * Helper to determine market status based on deadlines
   */
  /**
   * Calculate market status based on deadlines and current status
   * - active: Before bidding deadline
   * - waiting_for_resolution: After bidding deadline, before manual resolution
   * - resolved: Manually set when market is resolved
   * - cancelled: Manually set when market is cancelled
   */
  private calculateMarketStatus(market: Market): string {
    // If manually set to resolved or cancelled, keep that status
    if (market.status === 'resolved' || market.status === 'cancelled') {
      return market.status;
    }

    const now = Date.now();
    const biddingDeadline = market.configuration.biddingDeadline;

    // If bidding deadline passed, status is waiting_for_resolution
    if (now > biddingDeadline) {
      return 'waiting_for_resolution';
    }
    
    return 'active';
  }

  /**
   * Update market status (resolved or cancelled)
   * When status is 'resolved', resolvedValue should be provided
   */
  async updateMarketStatus(marketId: string, status: string, resolvedValue?: number) {
    if (!['resolved', 'cancelled'].includes(status)) {
      throw new BadRequestException('Status must be either "resolved" or "cancelled"');
    }

    if (status === 'resolved' && resolvedValue === undefined) {
      throw new BadRequestException('resolvedValue is required when status is "resolved"');
    }

    const market = await this.marketModel.findOne({ marketId });
    if (!market) {
      throw new NotFoundException(`Market ${marketId} not found`);
    }

    market.status = status;
    if (status === 'resolved' && resolvedValue !== undefined) {
      market.resolvedValue = resolvedValue;
    }
    await market.save();

    return {
      message: `Market status updated to ${status}`,
      marketId: market.marketId,
      status: market.status,
      ...(market.resolvedValue !== undefined && { resolvedValue: market.resolvedValue }),
    };
  }

  /**
   * Helper to generate market URL slug with unique marketId suffix
   */
  private generateMarketUrl(marketName: string, marketId: string): string {
    // Convert to lowercase, replace spaces with hyphens, remove special chars
    const slug = marketName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 60);

    // Add last 8 chars of marketId for uniqueness
    const uniqueSuffix = marketId.slice(-8);
    
    return `${slug}-${uniqueSuffix}`;
  }

  /**
   * Get market by URL slug
   */
  async getMarketByUrl(marketUrl: string) {
    const market = await this.marketModel.findOne({ 'configuration.marketUrl': marketUrl }).lean();
    if (!market) {
      throw new NotFoundException(`Market with URL ${marketUrl} not found`);
    }

    const calculatedStatus = this.calculateMarketStatus(market as Market);

    return {
      ...market,
      status: calculatedStatus,
      isActive: calculatedStatus === 'active',
      isWaitingForResolution: calculatedStatus === 'waiting_for_resolution',
      isResolved: calculatedStatus === 'resolved',
      isCancelled: calculatedStatus === 'cancelled',
    };
  }

  /**
   * Get all markets with filters
   */
  async getAllMarkets(filters: {
    category?: string;
    status?: string;
    type?: string;
    limit: number;
    offset: number;
  }) {
    const query: any = {};

    if (filters.category) {
      query['configuration.category'] = filters.category;
    }
    if (filters.type) {
      query.marketType = filters.type;
    }
    if (filters.status) {
      query.status = filters.status;
    }

    const markets = await this.marketModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(filters.offset)
      .limit(filters.limit)
      .lean();

    const total = await this.marketModel.countDocuments(query);

    // Calculate real-time status and format response
    const formattedMarkets = markets.map((market) => {
      const calculatedStatus = this.calculateMarketStatus(market as Market);
      const marketUrl = market.configuration.marketUrl || 
        this.generateMarketUrl(market.configuration.marketName, market.marketId);

      return {
        ...market,
        status: calculatedStatus,
        configuration: {
          ...market.configuration,
          marketUrl,
        },
        isActive: calculatedStatus === 'active',
        isWaitingForResolution: calculatedStatus === 'waiting_for_resolution',
        isResolved: calculatedStatus === 'resolved',
        isCancelled: calculatedStatus === 'cancelled',
      };
    });

    return {
      markets: formattedMarkets,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
        has_more: filters.offset + filters.limit < total,
      },
    };
  }

  /**
   * Get single market by ID
   */
  async getMarket(marketId: string) {
    const market = await this.marketModel.findOne({ marketId }).lean();

    if (!market) {
      throw new NotFoundException(`Market ${marketId} not found`);
    }

    const calculatedStatus = this.calculateMarketStatus(market as Market);
    const marketUrl = market.configuration.marketUrl || 
      this.generateMarketUrl(market.configuration.marketName, market.marketId);

    return {
      ...market,
      status: calculatedStatus,
      configuration: {
        ...market.configuration,
        marketUrl,
      },
      isActive: calculatedStatus === 'active',
      isWaitingForResolution: calculatedStatus === 'waiting_for_resolution',
      isResolved: calculatedStatus === 'resolved',
      isCancelled: calculatedStatus === 'cancelled',
    };
  }
}
