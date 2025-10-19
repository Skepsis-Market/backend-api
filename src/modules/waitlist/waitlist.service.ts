import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Waitlist, WaitlistDocument } from './schemas/waitlist.schema';
import { parseContact } from '../../common/utils/contact-parser.util';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';
import { ActivateCodeDto } from './dto/activate-code.dto';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectModel(Waitlist.name) private waitlistModel: Model<WaitlistDocument>,
  ) {}

  /**
   * Add user to waitlist
   */
  async joinWaitlist(dto: JoinWaitlistDto) {
    try {
      // Parse and validate contact
      const parsed = parseContact(dto.contact);

      // Check if already in waitlist
      const existing = await this.waitlistModel.findOne({ contact: parsed.contact });
      if (existing) {
        throw new ConflictException('Already registered in waitlist');
      }

      // Create waitlist entry
      const waitlistEntry = new this.waitlistModel({
        contact: parsed.contact,
        contact_raw: parsed.contact_raw,
        platform: parsed.platform,
        status: 'pending',
      });

      await waitlistEntry.save();

      return {
        message: 'Added to waitlist',
        platform: parsed.platform,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Invalid contact format');
    }
  }

  /**
   * Validate access code
   */
  async validateCode(code: string) {
    const entry = await this.waitlistModel.findOne({ access_code: code.toUpperCase() });

    if (!entry) {
      return { valid: false };
    }

    return {
      valid: true,
      persona: entry.persona || [],
    };
  }

  /**
   * Activate access code and link wallet
   */
  async activateCode(dto: ActivateCodeDto) {
    const entry = await this.waitlistModel.findOne({ 
      access_code: dto.access_code.toUpperCase() 
    });

    if (!entry) {
      throw new NotFoundException('Invalid access code');
    }

    // Check if this wallet is already linked to this code
    if (entry.wallet_addresses && entry.wallet_addresses.includes(dto.wallet_address)) {
      throw new ConflictException('Wallet already linked to this access code');
    }

    // Add wallet to the array
    if (!entry.wallet_addresses) {
      entry.wallet_addresses = [];
    }
    entry.wallet_addresses.push(dto.wallet_address);

    // Update status to used on first wallet connection
    if (entry.status !== 'used') {
      entry.status = 'used';
      entry.used_at = new Date();
    }

    await entry.save();

    return {
      message: 'Access granted',
      persona: entry.persona || [],
      wallet: dto.wallet_address,
      total_wallets: entry.wallet_addresses.length,
    };
  }
}
