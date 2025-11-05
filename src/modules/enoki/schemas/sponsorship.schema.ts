import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SponsorshipDocument = Sponsorship & Document;

@Schema({ timestamps: true })
export class Sponsorship {
  @Prop({ required: true, index: true })
  user_address: string;

  @Prop({ required: true })
  transaction_digest: string;

  @Prop({ required: true, type: String })
  gas_used: string; // Store as string to handle large numbers

  @Prop({ required: true })
  network: string;

  @Prop({ default: Date.now, index: true })
  sponsored_at: Date;
}

export const SponsorshipSchema = SchemaFactory.createForClass(Sponsorship);

// Compound index for efficient daily usage queries
SponsorshipSchema.index({ user_address: 1, sponsored_at: -1 });
