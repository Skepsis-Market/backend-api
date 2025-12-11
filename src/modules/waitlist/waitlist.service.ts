import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Waitlist, WaitlistDocument } from './schemas/waitlist.schema';
import { parseContact } from '../../common/utils/contact-parser.util';
import { generateAccessCode } from '../../common/utils/code-generator.util';
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
      // Check if already in waitlist by email
      const existing = await this.waitlistModel.findOne({ email: dto.email.toLowerCase() });
      if (existing) {
        throw new ConflictException('Already registered in waitlist');
      }

      // Generate unique access code
      let code = generateAccessCode();
      let attempts = 0;
      const maxAttempts = 10;

      // Ensure code is unique
      while (await this.waitlistModel.findOne({ access_code: code }) && attempts < maxAttempts) {
        code = generateAccessCode();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique access code');
      }

      // Create waitlist entry with code and approved status
      const waitlistEntry = new this.waitlistModel({
        email: dto.email.toLowerCase(),
        newsletter_consent: dto.newsletter_consent || false,
        platform: 'email',
        status: 'approved',
        access_code: code,
        approved_at: new Date(),
        persona: ['trader', 'lp'], // Default personas
        isShared: false,
      });

      await waitlistEntry.save();

      return {
        message: 'Added to waitlist',
        email: dto.email,
        access_code: code,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Invalid email format');
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

  /**
   * Set or unset shared flag by contact (telegram/twitter handle) or email
   * Creates a new user with access code if they don't exist (upsert)
   */
  async setShared(contact: string, isShared: boolean, sharedBy?: string) {
    // Check if it's an email address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(contact);
    
    let entry;
    if (isEmail) {
      // Search by email for new schema
      entry = await this.waitlistModel.findOne({ email: contact });
    } else {
      // Parse contact for legacy support (only for non-email)
      const parsed = parseContact(contact);
      entry = await this.waitlistModel.findOne({ contact: parsed.contact });
    }
    
    // If user doesn't exist, create them with an access code
    if (!entry) {
      // Generate unique access code
      let code = generateAccessCode();
      let attempts = 0;
      const maxAttempts = 10;

      // Ensure code is unique
      while (await this.waitlistModel.findOne({ access_code: code }) && attempts < maxAttempts) {
        code = generateAccessCode();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique access code');
      }

      // Create new entry based on input type
      if (isEmail) {
        entry = new this.waitlistModel({
          email: contact,
          newsletter_consent: false,
          status: 'approved',
          access_code: code,
          approved_at: new Date(),
          persona: ['trader', 'lp'],
          isShared: isShared,
          shared_at: isShared ? new Date() : undefined,
          shared_by: isShared ? sharedBy : undefined,
        });
      } else {
        const parsed = parseContact(contact);
        entry = new this.waitlistModel({
          contact: parsed.contact,
          contact_raw: parsed.contact_raw,
          platform: parsed.platform,
          status: 'approved',
          access_code: code,
          approved_at: new Date(),
          persona: ['trader', 'lp'],
          isShared: isShared,
          shared_at: isShared ? new Date() : undefined,
          shared_by: isShared ? sharedBy : undefined,
        });
      }

      await entry.save();

      return {
        message: `User created and access code ${isShared ? 'shared' : 'generated'}`,
        contact: entry.email || entry.contact_raw,
        access_code: entry.access_code,
        isShared: entry.isShared,
        shared_at: entry.shared_at,
        shared_by: entry.shared_by,
      };
    }

    // User exists - check if they have an access code
    if (!entry.access_code) {
      // Generate code for existing user
      let code = generateAccessCode();
      let attempts = 0;
      const maxAttempts = 10;

      while (await this.waitlistModel.findOne({ access_code: code }) && attempts < maxAttempts) {
        code = generateAccessCode();
        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique access code');
      }

      entry.access_code = code;
      entry.status = 'approved';
      entry.approved_at = new Date();
      entry.persona = ['trader', 'lp'];
    }

    // Update shared status
    entry.isShared = isShared;
    if (isShared) {
      entry.shared_at = new Date();
      if (sharedBy) entry.shared_by = sharedBy;
    } else {
      entry.shared_at = undefined;
      entry.shared_by = undefined;
    }

    await entry.save();

    return {
      message: `Access code ${isShared ? 'marked as shared' : 'unshared'}`,
      contact: entry.email || entry.contact_raw,
      access_code: entry.access_code,
      isShared: entry.isShared,
      shared_at: entry.shared_at,
      shared_by: entry.shared_by,
    };
  }

  /**
   * Get waitlist items filtered by status parameter
   * supported status: pending, shared, approved_not_shared
   */
  async getByStatus(status: string) {
    let query: any = {};
    switch ((status || '').toLowerCase()) {
      case 'pending':
        query = { status: 'pending' };
        break;
      case 'shared':
        query = { isShared: true };
        break;
      case 'approved_not_shared':
        query = { status: 'approved', $or: [{ isShared: false }, { isShared: { $exists: false } }] };
        break;
      default:
        // return all if no known status provided
        query = {};
    }

    const items = await this.waitlistModel.find(query).sort({ createdAt: -1 }).lean();
    return { total: items.length, items };
  }
}
