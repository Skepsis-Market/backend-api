import { Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Sponsorship, SponsorshipDocument } from './schemas/sponsorship.schema';
import { SuiClient } from '@mysten/sui/client';

@Injectable()
export class EnokiService {
  private suiClient: SuiClient;

  constructor(
    @InjectModel(Sponsorship.name) private sponsorshipModel: Model<SponsorshipDocument>,
    private configService: ConfigService,
  ) {
    this.suiClient = new SuiClient({
      url: this.configService.get<string>('SUI_FULLNODE_URL'),
    });
  }

  /**
   * Sponsor a transaction using Enoki
   */
  async sponsorTransaction(transactionKindBytes: number[], userAddress: string) {
    // 1. Check user eligibility
    const eligible = await this.checkUserEligibility(userAddress);
    if (!eligible.eligible) {
      throw new HttpException(
        eligible.reason || 'Daily sponsorship limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. Check global budget
    const globalUsageOk = await this.checkGlobalBudget();
    if (!globalUsageOk) {
      throw new HttpException(
        'Global daily sponsorship budget exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    try {
      // 3. Convert bytes array to Uint8Array
      const txBytes = new Uint8Array(transactionKindBytes);

      // 4. Call Enoki API to sponsor transaction
      const privateKey = this.configService.get<string>('ENOKI_PRIVATE_API_KEY');
      const network = this.configService.get<string>('SUI_NETWORK');

      // Step 4a: Request sponsorship from Enoki
      const sponsorResponse = await fetch(
        'https://api.enoki.mystenlabs.com/v1/transaction-blocks/sponsor',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${privateKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            network: network,
            transactionBlockKindBytes: Array.from(txBytes),
          }),
        }
      );

      if (!sponsorResponse.ok) {
        const error = await sponsorResponse.text();
        throw new Error(`Enoki sponsorship request failed: ${error}`);
      }

      const { bytes, digest } = await sponsorResponse.json();

      // 5. Execute sponsored transaction on Sui network
      // Note: In production, you'd need to handle zkLogin signature here
      // For now, assuming Enoki handles this internally
      const result = await this.suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature: [], // Placeholder - need zkLogin signature implementation
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      // 6. Track usage for rate limiting
      const gasUsed = result.effects?.gasUsed?.computationCost || '0';
      await this.trackSponsorshipUsage(userAddress, result.digest, gasUsed);

      return {
        success: true,
        digest: result.digest,
      };

    } catch (error) {
      console.error('Sponsorship error:', error);
      throw new BadRequestException(error.message || 'Transaction sponsorship failed');
    }
  }

  /**
   * Check if user is eligible for sponsorship (rate limiting)
   */
  async checkUserEligibility(userAddress: string): Promise<{
    eligible: boolean;
    remainingQuota: number;
    reason?: string;
  }> {
    try {
      const todayUsage = await this.getUserDailyUsage(userAddress);
      const dailyLimit = parseInt(this.configService.get<string>('DAILY_LIMIT_PER_USER') || '200000000');

      const remainingQuota = Math.max(0, dailyLimit - todayUsage);
      const eligible = remainingQuota > 0;

      return {
        eligible,
        remainingQuota,
        reason: eligible ? undefined : 'Daily user limit exceeded (0.2 SUI)',
      };
    } catch (error) {
      console.error('Eligibility check error:', error);
      return {
        eligible: false,
        remainingQuota: 0,
        reason: 'Eligibility check failed',
      };
    }
  }

  /**
   * Get user's total gas usage today (in MIST)
   */
  private async getUserDailyUsage(userAddress: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.sponsorshipModel.aggregate([
      {
        $match: {
          user_address: userAddress,
          sponsored_at: { $gte: today },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $toLong: '$gas_used' } },
        },
      },
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  /**
   * Check global daily budget
   */
  private async checkGlobalBudget(): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.sponsorshipModel.aggregate([
      {
        $match: {
          sponsored_at: { $gte: today },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $toLong: '$gas_used' } },
        },
      },
    ]);

    const totalUsage = result.length > 0 ? result[0].total : 0;
    const globalLimit = parseInt(this.configService.get<string>('GLOBAL_DAILY_BUDGET') || '5000000000');

    return totalUsage < globalLimit;
  }

  /**
   * Track sponsorship usage in database
   */
  private async trackSponsorshipUsage(
    userAddress: string,
    transactionDigest: string,
    gasUsed: string,
  ): Promise<void> {
    const network = this.configService.get<string>('SUI_NETWORK');

    await this.sponsorshipModel.create({
      user_address: userAddress,
      transaction_digest: transactionDigest,
      gas_used: gasUsed,
      network: network,
      sponsored_at: new Date(),
    });
  }
}
