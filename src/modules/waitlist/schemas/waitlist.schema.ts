import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WaitlistDocument = Waitlist & Document;

@Schema({ timestamps: true })
export class Waitlist {
  @Prop({ required: false })
  contact: string; // Legacy: Normalized "tg:username" or "x:handle" (for old entries)

  @Prop({ required: false })
  contact_raw: string; // Legacy: Original input from user (for old entries)

  @Prop({ required: false, enum: ['telegram', 'twitter', 'email'] })
  platform: string; // Legacy field, now optional

  @Prop({ required: false })
  email: string; // Email address (for new entries)

  @Prop({ default: false })
  newsletter_consent: boolean; // User opted in to newsletter

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
