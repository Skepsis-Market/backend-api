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

  /**
   * Set or unset shared flag for an access code
   */
  async setShared(accessCode: string, isShared: boolean, sharedBy?: string) {
    const entry = await this.waitlistModel.findOne({ access_code: accessCode.toUpperCase() });
    if (!entry) {
      throw new NotFoundException('Access code not found');
    }

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

  /**
   * Generate access codes for pending waitlist entries
   * Optional filters: limit, persona, specific contacts
   */
  async generateCodes(limit?: number, persona?: string[], contacts?: string[]) {
    let query: any = { status: 'pending' };
    
    // Filter by specific contacts if provided
    if (contacts && contacts.length > 0) {
      query.contact = { $in: contacts };
    }

    // Fetch pending entries
    let pendingEntries = await this.waitlistModel.find(query);
    
    if (pendingEntries.length === 0) {
      return {
        message: 'No pending entries found',
        generated: 0,
        codes: [],
      };
    }

    // Apply limit if specified
    if (limit && limit > 0) {
      pendingEntries = pendingEntries.slice(0, limit);
    }

    const generated: any[] = [];
    const errors: any[] = [];

    for (const entry of pendingEntries) {
      try {
        // Generate unique code
        let code = generateAccessCode();
        let attempts = 0;
        const maxAttempts = 10;

        // Ensure code is unique
        while (await this.waitlistModel.findOne({ access_code: code }) && attempts < maxAttempts) {
          code = generateAccessCode();
          attempts++;
        }

        if (attempts >= maxAttempts) {
          errors.push({ contact: entry.contact_raw, error: 'Failed to generate unique code' });
          continue;
        }

        // Update entry
        entry.access_code = code;
        entry.status = 'approved';
        entry.approved_at = new Date();
        
        // Set persona if provided
        if (persona && persona.length > 0) {
          entry.persona = persona;
        }

        await entry.save();

        generated.push({
          contact: entry.contact_raw,
          platform: entry.platform,
          access_code: code,
          persona: entry.persona || [],
        });
      } catch (error) {
        errors.push({ contact: entry.contact_raw, error: error.message });
      }
    }

    return {
      message: `Generated ${generated.length} access codes`,
      generated: generated.length,
      codes: generated,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
