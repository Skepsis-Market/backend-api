import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MarketCacheDocument = MarketCache & Document;

@Schema({ collection: 'markets_cache', timestamps: false })
export class MarketCache {
  @Prop({ required: true, unique: true, index: true })
  market_id: string;

  @Prop({ required: true })
  market_name: string;

  @Prop({ required: true, enum: ['ACTIVE', 'RESOLVED', 'CANCELLED'] })
  status: string;

  @Prop()
  category?: string;

  @Prop({ type: String })
  current_price?: string;

  @Prop({ type: String })
  resolved_value?: string;

  @Prop()
  last_updated?: Date;
}

export const MarketCacheSchema = SchemaFactory.createForClass(MarketCache);

MarketCacheSchema.index({ status: 1 });
MarketCacheSchema.index({ category: 1 });
