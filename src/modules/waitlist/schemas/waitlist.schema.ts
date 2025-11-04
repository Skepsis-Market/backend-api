import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WaitlistDocument = Waitlist & Document;

@Schema({ timestamps: true })
export class Waitlist {
  @Prop({ required: true })
  contact: string; // Normalized: "tg:username" or "x:handle"

  @Prop({ required: true })
  contact_raw: string; // Original input from user

  @Prop({ required: true, enum: ['telegram', 'twitter'] })
  platform: string;

  @Prop()
  access_code: string; // 6-char code, generated later

  @Prop({ type: [String], default: null })
  persona: string[]; // ["trader"] | ["lp"] | ["trader", "lp"]

  @Prop({ type: [String], default: [] })
  wallet_addresses: string[]; // Array of linked wallets

  @Prop({ 
    required: true, 
    enum: ['pending', 'approved', 'used'], 
    default: 'pending' 
  })
  status: string;

  @Prop()
  approved_at: Date;

  @Prop()
  used_at: Date;
  
  @Prop({ default: false })
  isShared: boolean;

  @Prop()
  shared_at?: Date;

  @Prop()
  shared_by?: string;
}

export const WaitlistSchema = SchemaFactory.createForClass(Waitlist);

// Indexes
WaitlistSchema.index({ contact: 1 }, { unique: true });
WaitlistSchema.index({ access_code: 1 }, { unique: true, sparse: true });
WaitlistSchema.index({ status: 1 });
