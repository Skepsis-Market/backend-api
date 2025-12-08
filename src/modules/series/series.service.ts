import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MarketSeries, MarketSeriesDocument } from './schemas/market-series.schema';
import { Market, MarketDocument } from '../markets/schemas/market.schema';

@Injectable()
export class SeriesService {
  constructor(
    @InjectModel(MarketSeries.name) private seriesModel: Model<MarketSeriesDocument>,
    @InjectModel(Market.name) private marketModel: Model<MarketDocument>,
  ) {}

  /**
   * GET /api/series/:slug
   * Fast load: Get series metadata + active market
   */
  async getSeriesBySlug(slug: string) {
    const series = await this.seriesModel.findOne({ slug }).lean();
    
    if (!series) {
      throw new NotFoundException(`Series with slug "${slug}" not found`);
    }

    // Get the active market if it exists
    let activeMarket = null;
    if (series.activeMarketId) {
      const market = await this.marketModel.findOne({ 
        marketId: series.activeMarketId 
      }).lean();
      
      if (market) {
        activeMarket = {
          id: market.marketId,
          round: market.roundNumber,
          closesAt: market.configuration.biddingDeadline,
          resolvesAt: market.configuration.resolutionTime,
          min: market.configuration.minValue,
          max: market.configuration.maxValue,
          bucketCount: market.configuration.bucketCount,
          bucketWidth: market.configuration.bucketWidth,
          decimalPrecision: market.configuration.decimalPrecision,
          valueUnit: market.configuration.valueUnit,
          valueType: market.configuration.valueType,
          valuePrefix: market.configuration.valuePrefix,
          valueSuffix: market.configuration.valueSuffix,
          useKSuffix: market.configuration.useKSuffix,
          question: market.configuration.question,
          description: market.configuration.description,
          marketImage: market.configuration.marketImage,
          priceFeed: market.priceFeed,
          status: this.calculateMarketStatus(market),
        };
      }
    }

    return {
      series: {
        id: series._id,
        name: series.name,
        slug: series.slug,
        frequency: series.frequency,
        asset: series.asset,
        currentRound: series.currentRoundNumber,
        nextSpawnTime: series.nextSpawnTime,
        isActive: series.isActive,
        template: series.template,
      },
      activeMarket,
    };
  }

  /**
   * GET /api/series/:slug/rounds
   * Lazy load: Get historical rounds for sidebar
   */
  async getSeriesRounds(slug: string, limit: number = 20, offset: number = 0) {
    const series = await this.seriesModel.findOne({ slug }).lean();
    
    if (!series) {
      throw new NotFoundException(`Series with slug "${slug}" not found`);
    }

    // Get rounds in reverse chronological order
    const rounds = await this.marketModel
      .find({ seriesId: series._id.toString() })
      .sort({ roundNumber: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const total = await this.marketModel.countDocuments({ 
      seriesId: series._id.toString() 
    });

    return {
      rounds: rounds.map(market => ({
        id: market.marketId,
        round: market.roundNumber,
        status: this.calculateMarketStatus(market),
        result: market.resolvedValue,
        closedAt: market.configuration.biddingDeadline,
        resolvedAt: market.configuration.resolutionTime,
        createdAt: market.createdAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  /**
   * Create a new series
   */
  async createSeries(seriesData: Partial<MarketSeries>) {
    const series = new this.seriesModel(seriesData);
    await series.save();
    return series;
  }

  /**
   * Update series active market
   */
  async updateSeriesActiveMarket(
    seriesId: string, 
    marketId: string, 
    roundNumber: number,
    nextSpawnTime?: number,
  ) {
    const updateData: any = {
      activeMarketId: marketId,
      currentRoundNumber: roundNumber,
    };

    if (nextSpawnTime) {
      updateData.nextSpawnTime = nextSpawnTime;
    }

    await this.seriesModel.updateOne(
      { _id: seriesId },
      { $set: updateData },
    );

    return {
      message: 'Series active market updated successfully',
      seriesId,
      activeMarketId: marketId,
      currentRoundNumber: roundNumber,
    };
  }

  /**
   * Helper to calculate market status based on deadlines
   */
  private calculateMarketStatus(market: any): string {
    if (market.status === 'resolved' || market.status === 'cancelled') {
      return market.status;
    }

    const now = Date.now();
    const biddingDeadline = market.configuration.biddingDeadline;

    if (now > biddingDeadline) {
      return 'waiting_for_resolution';
    }
    
    return 'active';
  }
}
