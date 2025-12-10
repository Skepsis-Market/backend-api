import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PositionEventDocument = PositionEvent & Document;

@Schema({ collection: 'position_events', timestamps: false })
export class PositionEvent {
  @Prop({ required: true, unique: true, index: true })
  tx_digest: string;

  @Prop({ required: true })
  checkpoint: string;

  @Prop({ required: true, type: String })
  timestamp: string;

  @Prop({ required: true, enum: ['SHARES_PURCHASED', 'SHARES_SOLD', 'REWARDS_CLAIMED'] })
  event_type: string;

  @Prop({ required: true, index: true })
  user_address: string;

  @Prop({ required: true, index: true })
  market_id: string;

  @Prop({ required: true, type: Number })
  range_lower: number;

  @Prop({ required: true, type: Number })
  range_upper: number;

  @Prop({ required: true, type: String })
  shares_delta: string; // Positive for buy, negative for sell

  @Prop({ required: true, type: String })
  usdc_delta: string; // Negative for buy, positive for sell

  @Prop({ required: true, type: String })
  price_per_share: string;

  @Prop({ default: false })
  is_fifo_sell?: boolean;

  @Prop({ type: String })
  realized_pnl_delta?: string; // Profit/loss for this specific transaction (SELL/CLAIM only)

  @Prop()
  indexed_at?: Date;
}

export const PositionEventSchema = SchemaFactory.createForClass(PositionEvent);

// Indexes
PositionEventSchema.index({ user_address: 1, market_id: 1 });
PositionEventSchema.index({ market_id: 1, timestamp: -1 });
PositionEventSchema.index({ user_address: 1, timestamp: -1 });
PositionEventSchema.index({ event_type: 1, timestamp: -1 });
