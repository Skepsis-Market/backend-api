import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TradeDocument = Trade & Document;

class Range {
  @Prop({ required: true })
  start: string;

  @Prop({ required: true })
  end: string;
}

@Schema({ collection: 'trades', timestamps: false })
export class Trade {
  @Prop({ required: true, index: true })
  user: string;

  @Prop({ required: true, index: true })
  market_id: string;

  @Prop({ required: true, enum: ['BUY', 'SELL', 'CLAIM'] })
  action: string;

  @Prop({ type: Range, required: true })
  range: Range;

  @Prop({ required: true })
  shares: string;

  @Prop({ required: true })
  amount: string;

  @Prop({ required: true })
  price_per_share: string;

  @Prop()
  probability?: string;

  @Prop({ required: true, unique: true })
  tx_hash: string;

  @Prop({ required: true })
  block_number: string;

  @Prop({ required: true, index: true })
  timestamp: string;

  @Prop()
  indexed_at: Date;
}

export const TradeSchema = SchemaFactory.createForClass(Trade);

// Create indexes
TradeSchema.index({ tx_hash: 1 }, { unique: true });
TradeSchema.index({ user: 1, market_id: 1 });
TradeSchema.index({ market_id: 1 });
TradeSchema.index({ timestamp: -1 });
