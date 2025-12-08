import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MarketSeriesDocument = MarketSeries & Document;

@Schema({ timestamps: true })
export class MarketSeries {
  @Prop({ required: true, unique: true })
  slug: string; // URL-friendly identifier: "btc-hourly"

  @Prop({ required: true })
  name: string; // Display name: "Bitcoin Hourly"

  @Prop({ required: true })
  frequency: string; // "1h", "24h", "1w", etc.

  @Prop({ required: true })
  asset: string; // "BTC", "SUI", "ETH"

  @Prop({ required: true, default: 0 })
  currentRoundNumber: number; // Track the current round

  @Prop({ required: false })
  activeMarketId?: string; // Market ID of the currently active round

  @Prop({ required: true })
  nextSpawnTime: number; // Timestamp for when next round should spawn

  @Prop({ required: true })
  packageId: string; // Sui package ID for creating markets

  @Prop({ required: true })
  network: string; // "mainnet", "testnet", "localnet"

  // Market configuration template (used for spawning new rounds)
  // minValue/maxValue are calculated dynamically based on current price
  @Prop({ type: Object, required: true })
  template: {
    category: string;
    bucketCount: number;
    bucketWidth: number;
    decimalPrecision: number;
    valueUnit: string;
    valueType: string;
    valuePrefix: string;
    valueSuffix: string;
    useKSuffix: boolean;
    initialLiquidity: number;
    usdcType: string;
    marketImage?: string;
    marketImageKey?: string;
    priceFeed: string; // Required for fetching current price
    
    // Dynamic range configuration
    priceRangePercent?: number; // e.g., 2 means ±2% from current price
    priceRangeAbsolute?: number; // e.g., 100 means ±$100 from current price
  };

  @Prop({ default: true })
  isActive: boolean; // Whether this series is currently spawning new rounds

  @Prop({ default: false })
  autoResolve: boolean; // Whether rounds auto-resolve or require manual resolution
}

export const MarketSeriesSchema = SchemaFactory.createForClass(MarketSeries);
