import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MarketDocument = Market & Document;

class Configuration {
  @Prop({ required: true })
  marketName: string;

  @Prop({ required: true })
  marketUrl: string;

  @Prop({ required: true })
  question: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  minValue: number;

  @Prop({ required: true })
  maxValue: number;

  @Prop({ required: true })
  bucketCount: number;

  @Prop({ required: true })
  bucketWidth: number;

  @Prop({ required: true })
  decimalPrecision: number;

  @Prop({ required: true })
  valueUnit: string;

  @Prop({ required: true })
  biddingDeadline: number;

  @Prop({ required: true })
  resolutionTime: number;

  @Prop({ required: true })
  initialLiquidity: number;

  @Prop({ required: true })
  usdcType: string;
}

@Schema({ collection: 'markets', timestamps: true })
export class Market {
  @Prop({ required: true, unique: true })
  marketId: string;

  @Prop({ required: true })
  creatorCapId: string;

  @Prop({ required: true })
  packageId: string;

  @Prop({ required: true })
  network: string;

  @Prop({ required: true })
  createdAt: string;

  @Prop({ required: true })
  transactionDigest: string;

  @Prop({ type: Configuration, required: true })
  configuration: Configuration;

  @Prop({ required: true })
  marketType: string;

  @Prop()
  livePrice?: string;

  @Prop({ default: 'active' })
  status: string; // active, resolved, expired
}

export const MarketSchema = SchemaFactory.createForClass(Market);

// Indexes
MarketSchema.index({ marketId: 1 }, { unique: true });
MarketSchema.index({ 'configuration.marketUrl': 1 }, { unique: true });
MarketSchema.index({ 'configuration.category': 1 });
MarketSchema.index({ marketType: 1 });
MarketSchema.index({ status: 1 });
MarketSchema.index({ createdAt: -1 });
