import { SuiClient } from '@mysten/sui/client';
import { getSellQuote, calculatePositionPnL } from '../../common/utils/skepsis-sdk';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SuiPriceService {
  private client: SuiClient;

  constructor() {
    const rpcUrl = process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443';
    this.client = new SuiClient({ url: rpcUrl });
  }

  /**
   * Get current value of a position using SDK
   */
  async getCurrentPositionValue(
    marketId: string,
    rangeStart: bigint,
    rangeEnd: bigint,
    shares: bigint,
  ): Promise<{
    currentValue: number; // in USDC
    currentPrice: number; // price per share
    probability: number;
  }> {
    try {
      const quote = await getSellQuote(
        this.client,
        marketId,
        rangeStart,
        rangeEnd,
        shares,
        0, // No slippage for price check
      );

      return {
        currentValue: quote.payoutUSDC,
        currentPrice: quote.pricePerShare,
        probability: quote.probability,
      };
    } catch (error) {
      // Fallback to 0 if market not found or SDK error
      console.error(`Error fetching price for market ${marketId}:`, error);
      return {
        currentValue: 0,
        currentPrice: 0,
        probability: 0,
      };
    }
  }

  /**
   * Get unrealized PnL for a position using SDK
   */
  async getPositionPnL(
    marketId: string,
    rangeStart: bigint,
    rangeEnd: bigint,
    shares: bigint,
    costBasis: bigint,
  ): Promise<{
    currentValue: bigint;
    unrealizedPnL: bigint;
    unrealizedPnLPercent: number;
    probability: number;
  }> {
    try {
      const pnl = await calculatePositionPnL(
        this.client,
        marketId,
        rangeStart,
        rangeEnd,
        shares,
        costBasis,
      );

      return {
        currentValue: pnl.currentValue,
        unrealizedPnL: pnl.unrealizedPnL,
        unrealizedPnLPercent: pnl.unrealizedPnLPercent,
        probability: pnl.probability,
      };
    } catch (error) {
      console.error(`Error calculating PnL for market ${marketId}:`, error);
      return {
        currentValue: costBasis,
        unrealizedPnL: 0n,
        unrealizedPnLPercent: 0,
        probability: 0,
      };
    }
  }

  /**
   * Batch get current values for multiple positions (optimized)
   */
  async batchGetPositionValues(
    positions: Array<{
      marketId: string;
      rangeStart: bigint;
      rangeEnd: bigint;
      shares: bigint;
      costBasis: bigint;
    }>,
  ): Promise<
    Array<{
      currentValue: number;
      currentPrice: number;
      probability: number;
      unrealizedPnL: number;
      unrealizedPnLPercent: number;
    }>
  > {
    // Execute all SDK calls in parallel
    const results = await Promise.all(
      positions.map(async (pos) => {
        const pnl = await this.getPositionPnL(
          pos.marketId,
          pos.rangeStart,
          pos.rangeEnd,
          pos.shares,
          pos.costBasis,
        );

        return {
          currentValue: Number(pnl.currentValue) / 1_000_000,
          currentPrice: Number(pnl.currentValue) / Number(pos.shares),
          probability: pnl.probability,
          unrealizedPnL: Number(pnl.unrealizedPnL) / 1_000_000,
          unrealizedPnLPercent: pnl.unrealizedPnLPercent,
        };
      }),
    );

    return results;
  }
}
