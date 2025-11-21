import { Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Sponsorship, SponsorshipDocument } from './schemas/sponsorship.schema';
import { SuiClient } from '@mysten/sui/client';
import { EnokiClient } from '@mysten/enoki';

@Injectable()
export class EnokiService {
  private suiClient: SuiClient;
  private enokiClient: EnokiClient;

  constructor(
    @InjectModel(Sponsorship.name) private sponsorshipModel: Model<SponsorshipDocument>,
    private configService: ConfigService,
  ) {
    this.suiClient = new SuiClient({
      url: this.configService.get<string>('SUI_FULLNODE_URL'),
    });
    
    this.enokiClient = new EnokiClient({
      apiKey: this.configService.get<string>('ENOKI_PRIVATE_API_KEY'),
    });
  }

  /**
   * Step 1: Create sponsored transaction (Official Enoki SDK pattern)
   * Returns sponsored transaction bytes for frontend to sign
   */
  async sponsorTransaction(
    transactionKindBytes: number[],
    userAddress: string,
  ) {
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
      console.log('Creating sponsored transaction for user:', userAddress);
      console.log('Transaction bytes length:', transactionKindBytes.length);
      
      // Convert number array to base64 string for Enoki SDK
      const transactionBytes = new Uint8Array(transactionKindBytes);
      const base64Bytes = Buffer.from(transactionBytes).toString('base64');
      
      // Use Enoki SDK to create sponsored transaction
      const network = this.configService.get<string>('SUI_NETWORK') || 'testnet';
      console.log('Network being used:', network);
      console.log('API Key prefix:', this.configService.get<string>('ENOKI_PRIVATE_API_KEY')?.substring(0, 10) + '...');
      
      const sponsoredTx = await this.enokiClient.createSponsoredTransaction({
        network: network as 'testnet' | 'mainnet' | 'devnet',
        transactionKindBytes: base64Bytes,
        sender: userAddress,
      });

      console.log('Sponsored transaction created:', {
        digest: sponsoredTx.digest,
        bytesLength: sponsoredTx.bytes.length
      });

      return {
        success: true,
        bytes: sponsoredTx.bytes,
        digest: sponsoredTx.digest,
      };

    } catch (error) {
      console.error('Sponsorship creation error:', error);
      
      // Log more details for debugging
      if (error.errors) {
        console.error('Enoki error details:', JSON.stringify(error.errors, null, 2));
      }
      
      throw new BadRequestException(error.message || 'Failed to create sponsored transaction');
    }
  }

  /**
   * Step 2: Execute sponsored transaction with user signature
   * Called after frontend signs the sponsored transaction bytes
   */
  async executeTransaction(digest: string, signature: string) {
    try {
      console.log('Executing sponsored transaction:', { digest, signature: signature.substring(0, 20) + '...' });

      // Use Enoki SDK to execute sponsored transaction
      const result = await this.enokiClient.executeSponsoredTransaction({
        digest,
        signature,
      });

      console.log('Transaction executed successfully:', result.digest);

      // Track usage for rate limiting
      // Note: We'll get gas usage from the transaction effects
      const effects = await this.suiClient.getTransactionBlock({
        digest: result.digest,
        options: { showEffects: true }
      });
      
      const gasUsed = effects.effects?.gasUsed?.computationCost || '0';
      const userAddress = effects.transaction?.data?.sender || '';
      
      if (userAddress) {
        await this.trackSponsorshipUsage(userAddress, result.digest, gasUsed);
      }

      return {
        success: true,
        digest: result.digest,
      };

    } catch (error) {
      console.error('Transaction execution error:', error);
      throw new BadRequestException(error.message || 'Failed to execute sponsored transaction');
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
