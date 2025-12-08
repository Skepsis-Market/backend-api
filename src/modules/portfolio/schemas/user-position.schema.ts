import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserPositionDocument = UserPosition & Document;

@Schema({ collection: 'user_positions', timestamps: false })
export class UserPosition {
  @Prop({ required: true, index: true })
  user_address: string;

  @Prop({ required: true, index: true })
  market_id: string;

  @Prop({ required: true, type: Number })
  range_lower: number;

  @Prop({ required: true, type: Number })
  range_upper: number;

  @Prop({ required: true, type: String })
  total_shares: string;

  @Prop({ required: true, type: String })
  total_cost_basis: string;

  @Prop({ required: true, type: Number })
  avg_entry_price: number;

  @Prop({ required: true, type: String, default: '0' })
  realized_pnl: string;

  @Prop({ required: true, type: String, default: '0' })
  total_shares_sold: string;

  @Prop({ required: true, type: String, default: '0' })
  total_proceeds: string;

  @Prop({ required: true, type: String })
  first_purchase_at: string;

  @Prop({ required: true, type: String })
  last_updated_at: string;

  @Prop()
  last_tx_digest?: string;

  @Prop({ required: true, default: true, index: true })
  is_active: boolean;
}

export const UserPositionSchema = SchemaFactory.createForClass(UserPosition);

// Composite unique index
UserPositionSchema.index(
  { user_address: 1, market_id: 1, range_lower: 1, range_upper: 1 },
  { unique: true }
);

// Query indexes
UserPositionSchema.index({ user_address: 1, is_active: 1 });
UserPositionSchema.index({ market_id: 1, is_active: 1 });
UserPositionSchema.index({ user_address: 1, market_id: 1 });
