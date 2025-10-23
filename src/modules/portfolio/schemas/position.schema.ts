import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PositionDocument = Position & Document;

class Range {
  @Prop({ required: true })
  start: string;

  @Prop({ required: true })
  end: string;
}

class TradeSummary {
  @Prop({ required: true })
  total_shares_bought: string;

  @Prop({ required: true })
  total_shares_sold: string;

  @Prop({ required: true })
  final_shares: string;
}

class Financial {
  @Prop({ required: true })
  total_invested: string;

  @Prop({ required: true })
  total_received_sells: string;

  @Prop({ required: true })
  claim_amount: string;

  @Prop({ required: true })
  realized_pnl: string;

  @Prop({ required: true })
  avg_entry_price: string;
}

@Schema({ collection: 'positions', timestamps: false })
export class Position {
  @Prop({ required: true, index: true })
  user: string;

  @Prop({ required: true, index: true })
  market_id: string;

  @Prop({ type: Range, required: true })
  range: Range;

  @Prop({ type: TradeSummary, required: true })
  trade_summary: TradeSummary;

  @Prop({ type: Financial, required: true })
  financial: Financial;

  @Prop({ required: true, enum: ['WINNING', 'LOSING', 'CLAIMED', 'SOLD'] })
  status: string;

  @Prop()
  resolved_at?: string;

  @Prop()
  reconciled_at?: string;

  @Prop()
  last_updated: Date;
}

export const PositionSchema = SchemaFactory.createForClass(Position);

// Create compound unique index
PositionSchema.index(
  { user: 1, market_id: 1, 'range.start': 1, 'range.end': 1 },
  { unique: true },
);
PositionSchema.index({ user: 1 });
PositionSchema.index({ market_id: 1 });
