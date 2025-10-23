/**
 * Skepsis Market SDK - Complete Calculation Library
 * Single file with all quote and PnL calculations
 * 
 * Usage:
 *   import { getBuyQuote, getSellQuote, calculatePnL } from './lib/skepsis-sdk';
 */

import { SuiClient } from '@mysten/sui/client';

// ========================================
// TYPES
// ========================================

export interface MarketState {
  distribution: Map<number, bigint>; // Sparse: bucket_index -> shares
  activeBuckets: number[];            // Sorted list of active bucket indices
  alpha: bigint;
  balance: bigint;
  minValue: bigint;
  maxValue: bigint;
  bucketWidth: bigint;
  bucketCount: number;
  maxSharesPerBucket: bigint;
}

export interface BuyQuote {
  shares: bigint;
  cost: bigint;
  costUSDC: number;
  probability: number;
  pricePerShare: number;
  minSharesOut: bigint;
}

export interface SellQuote {
  payout: bigint;
  payoutUSDC: number;
  pricePerShare: number;
  probability: number;
  minUsdcOut: bigint;
}

export interface Trade {
  type: 'buy' | 'sell';
  rangeStart: bigint;
  rangeEnd: bigint;
  shares: bigint;
  amount: bigint;
  timestamp: number;
}

export interface PositionPnL {
  rangeStart: bigint;
  rangeEnd: bigint;
  shares: bigint;
  costBasis: bigint;
  currentValue: bigint;
  unrealizedPnL: bigint;
  unrealizedPnLPercent: number;
  probability: number;
}

// ========================================
// MARKET STATE FETCHING
// ========================================

/**
 * Fetch market state from blockchain
 */
export async function getMarketState(
  client: SuiClient,
  marketId: string
): Promise<MarketState> {
  const marketObj = await client.getObject({
    id: marketId,
    options: { showContent: true },
  });

  if (!marketObj.data?.content || !('fields' in marketObj.data.content)) {
    throw new Error('Invalid market object');
  }

  const fields = marketObj.data.content.fields as any;
  const lmsr = fields.lmsr_state?.fields || fields;

  // Read sparse distribution
  const sparseDistFields = lmsr.sparse_distribution?.fields;
  if (!sparseDistFields) {
    throw new Error('Sparse distribution not found in market state');
  }

  const activeBuckets: number[] = (sparseDistFields.active_buckets || []).map((b: any) => Number(b));
  const bucketsTableId = sparseDistFields.buckets?.fields?.id?.id;
  
  if (!bucketsTableId) {
    throw new Error('Buckets table ID not found');
  }

  // Fetch all active bucket values from the Table into a Map
  const distribution = new Map<number, bigint>();
  const virtualMin = BigInt(sparseDistFields.virtual_min || lmsr.virtual_min || 0);
  const virtualMax = BigInt(sparseDistFields.virtual_max || lmsr.virtual_max || 0);
  const bucketWidth = BigInt(sparseDistFields.bucket_width || lmsr.bucket_width || 0);
  
  // Fetch each active bucket's shares from the Table
  for (const bucketIdx of activeBuckets) {
    try {
      // Get dynamic field from Table
      const dynamicField = await client.getDynamicFieldObject({
        parentId: bucketsTableId,
        name: {
          type: 'u64',
          value: bucketIdx.toString(),
        },
      });

      if (dynamicField.data?.content && 'fields' in dynamicField.data.content) {
        const shares = BigInt((dynamicField.data.content.fields as any).value || 0);
        distribution.set(bucketIdx, shares);
      }
    } catch (e) {
      // Bucket not found in table, skip
    }
  }
  
  // Calculate total buckets based on value range
  const bucketCount = Number((virtualMax - virtualMin) / bucketWidth) + 1;

  const maxSharesPerBucket = BigInt(lmsr.max_shares_per_bucket || 0);
  const alpha = BigInt(lmsr.liquidity_parameter || lmsr.alpha || lmsr.calculated_alpha || 0);
  
  // Fallback: if max_shares_per_bucket is 0, use alpha as the limit
  const effectiveMaxShares = maxSharesPerBucket > 0n ? maxSharesPerBucket : alpha;

  return {
    distribution,
    activeBuckets,
    alpha,
    balance: BigInt(fields.balance || 0),
    minValue: virtualMin,
    maxValue: virtualMax,
    bucketWidth,
    bucketCount,
    maxSharesPerBucket: effectiveMaxShares,
  };
}

// ========================================
// LMSR CALCULATIONS
// ========================================

/**
 * Map range to bucket indices
 */
function mapRangeToBuckets(
  rangeMin: bigint,
  rangeMax: bigint,
  bucketWidth: bigint,
  minValue: bigint
): { start: number; end: number } {
  // Convert value to bucket index: bucket_index = value / bucket_width
  // For sparse distribution, bucket indices are absolute (not relative to market min)
  const start = Number(rangeMin / bucketWidth);
  const end = Number((rangeMax - 1n) / bucketWidth);
  
  console.log(`[DEBUG] mapRangeToBuckets: ${rangeMin}-${rangeMax} → buckets ${start}-${end}`);
  
  return { start, end };
}

/**
 * Calculate probability for a range
 * OPTIMIZED: Only iterate active buckets
 */
export function calculateProbability(
  state: MarketState,
  rangeMin: bigint,
  rangeMax: bigint
): number {
  const { start, end } = mapRangeToBuckets(rangeMin, rangeMax, state.bucketWidth, state.minValue);
  const alpha = Number(state.alpha);

  let rangeSum = 0;
  let totalSum = 0;

  for (const bucketIdx of state.activeBuckets) {
    const qi = Number(state.distribution.get(bucketIdx) || 0n);
    const expTerm = Math.exp(qi / alpha);
    totalSum += expTerm;
    if (bucketIdx >= start && bucketIdx <= end) rangeSum += expTerm;
  }

  return totalSum > 0 ? (rangeSum / totalSum) * 100 : 0;
}

/**
 * Calculate cost to buy shares using LMSR
 * OPTIMIZED: Only iterate active buckets (matches Move code)
 * 
 * CRITICAL: The on-chain contract adds THE SAME number of shares to EACH bucket in the range
 * Not divided across buckets! This is how LMSR works for range bets.
 * 
 * Formula: Cost = alpha * ln(Σ exp((q_i + shares)/alpha) / Σ exp(q_i/alpha))
 * Where shares are added to EACH bucket in [start, end]
 */
function calculateCostForShares(
  state: MarketState,
  rangeMin: bigint,
  rangeMax: bigint,
  shares: bigint
): bigint {
  const { start, end } = mapRangeToBuckets(rangeMin, rangeMax, state.bucketWidth, state.minValue);
  const alpha = Number(state.alpha);
  const sharesToAdd = Number(shares);

  // Initial sum: Σ exp(q_i/alpha) - ONLY iterate active buckets
  let initialSum = 0;
  for (const bucketIdx of state.activeBuckets) {
    const qi = Number(state.distribution.get(bucketIdx) || 0n);
    initialSum += Math.exp(qi / alpha);
  }

  // Final sum after adding shares - iterate active buckets + new buckets in buy range
  const affectedBuckets = new Set([...state.activeBuckets]);
  for (let i = start; i <= end; i++) {
    affectedBuckets.add(i);
  }

  let finalSum = 0;
  for (const bucketIdx of affectedBuckets) {
    const qi = Number(state.distribution.get(bucketIdx) || 0n);
    // Add shares to THIS bucket if it's in range
    const newQi = (bucketIdx >= start && bucketIdx <= end) ? qi + sharesToAdd : qi;
    finalSum += Math.exp(newQi / alpha);
  }

  // Cost = alpha * (ln(finalSum) - ln(initialSum))
  const cost = alpha * (Math.log(finalSum) - Math.log(initialSum));
  
  return BigInt(Math.round(cost));
}

/**
 * Binary search to find shares for amount (AGGRESSIVE OFF-CHAIN VERSION)
 * Uses more iterations and tighter convergence for maximum accuracy
 */
function calculateSharesForAmount(
  state: MarketState,
  rangeMin: bigint,
  rangeMax: bigint,
  amount: bigint
): { shares: bigint; cost: bigint } {
  // Start with a reasonable estimate based on probability and amount
  const prob = calculateProbability(state, rangeMin, rangeMax);
  const estimatedPrice = prob / 100; // Higher probability = higher price
  const estimatedShares = BigInt(Math.floor(Number(amount) / Math.max(estimatedPrice, 0.01)));
  
  let low = 1n;
  let high = estimatedShares < state.maxSharesPerBucket ? estimatedShares * 3n : state.maxSharesPerBucket;
  let bestShares = 0n;
  let bestCost = 0n;

  // AGGRESSIVE: 50 iterations instead of 20
  for (let i = 0; i < 50; i++) {
    if (low > high) break;
    
    const mid = (low + high) / 2n;
    
    try {
      const cost = calculateCostForShares(state, rangeMin, rangeMax, mid);

      if (cost <= amount) {
        bestShares = mid;
        bestCost = cost;
        
        // AGGRESSIVE: Target 99% utilization instead of 95%
        const utilization = Number(cost) / Number(amount);
        if (utilization >= 0.99) break;
        
        // AGGRESSIVE: Use smaller increments near the target
        const gap = high - low;
        if (gap <= 1000n && utilization >= 0.98) {
          // Fine-grained search in the final range
          low = mid + 1n;
        } else if (utilization >= 0.95) {
          // Close to target, slow down
          low = mid + 1n;
        } else {
          // Still far from target, keep aggressive jumps
          low = mid + 1n;
        }
      } else {
        high = mid - 1n;
      }
    } catch (error) {
      // If calculation fails, reduce high
      high = mid - 1n;
    }
  }

  // REFINEMENT PHASE: If we're close but not quite there, do micro adjustments
  if (bestShares > 0n && bestCost < amount) {
    const utilization = Number(bestCost) / Number(amount);
    
    if (utilization >= 0.95 && utilization < 0.99) {
      // Try adding small increments to get closer
      for (let delta = 1n; delta <= 10000n; delta += 100n) {
        const testShares = bestShares + delta;
        if (testShares > state.maxSharesPerBucket) break;
        
        try {
          const testCost = calculateCostForShares(state, rangeMin, rangeMax, testShares);
          if (testCost <= amount) {
            bestShares = testShares;
            bestCost = testCost;
            
            const newUtil = Number(testCost) / Number(amount);
            if (newUtil >= 0.99) break;
          } else {
            break;
          }
        } catch {
          break;
        }
      }
    }
  }

  return { shares: bestShares, cost: bestCost };
}

/**
 * Calculate payout for selling shares
 * OPTIMIZED: Only iterate active buckets (matches Move code)
 */
function calculatePayoutForShares(
  state: MarketState,
  rangeMin: bigint,
  rangeMax: bigint,
  shares: bigint
): bigint {
  const { start, end } = mapRangeToBuckets(rangeMin, rangeMax, state.bucketWidth, state.minValue);
  const alpha = Number(state.alpha);
  const sharesToRemove = Number(shares);

  // Initial sum: Σ exp(q_i/alpha) - ONLY iterate active buckets
  let initialSum = 0;
  for (const bucketIdx of state.activeBuckets) {
    const qi = Number(state.distribution.get(bucketIdx) || 0n);
    initialSum += Math.exp(qi / alpha);
  }

  // Final sum after removing shares - ONLY iterate active buckets
  // (buckets with 0 shares after sell will be removed later, but still contribute 0 to sum)
  let finalSum = 0;
  for (const bucketIdx of state.activeBuckets) {
    const qi = Number(state.distribution.get(bucketIdx) || 0n);
    // Subtract shares from THIS bucket if it's in range
    let newQi = qi;
    if (bucketIdx >= start && bucketIdx <= end) {
      newQi = Math.max(0, qi - sharesToRemove); // Don't go negative
    }
    if (newQi > 0) {
      finalSum += Math.exp(newQi / alpha);
    }
  }

  // Payout = alpha * (ln(initialSum) - ln(finalSum))
  // This is the reverse of buying: we get back the cost difference
  const payout = alpha * (Math.log(initialSum) - Math.log(finalSum));
  
  return BigInt(Math.round(payout));
}

// ========================================
// QUOTE FUNCTIONS
// ========================================

/**
 * Get a buy quote for a given range and amount
 * 
 * NOTE: Shares are in MICRO-UNITS (like USDC)
 * - 1,000,000 shares = $1 payout at settlement
 * - This matches the on-chain representation where potential_payout = shares
 */
export async function getBuyQuote(
  client: SuiClient,
  marketId: string,
  rangeMin: bigint,
  rangeMax: bigint,
  amount: bigint, // Amount to spend in micro-USDC
  slippagePercent: number = 0.05 // Default 5%
): Promise<BuyQuote> {
  const state = await getMarketState(client, marketId);
  const result = calculateSharesForAmount(state, rangeMin, rangeMax, amount);
  const probability = calculateProbability(state, rangeMin, rangeMax);
  
  // Calculate price per share in human-readable terms
  // Both shares and cost are in micro-units (6 decimals)
  // Price per share = (cost in USDC) / (shares in whole units)
  // = (cost / 1_000_000) / (shares / 1_000_000)
  // = cost / shares (the micro units cancel out!)
  const pricePerShare = result.shares > 0n ? Number(result.cost) / Number(result.shares) : 0;
  
  // Apply slippage protection
  const minSharesOut = result.shares - (result.shares * BigInt(Math.floor(slippagePercent * 100))) / 100n;
  
  return {
    shares: result.shares,
    cost: result.cost,
    costUSDC: Number(result.cost) / 1_000_000,
    pricePerShare, // Price per share in dollars (e.g., 0.10 means $0.10 per share)
    probability,
    minSharesOut,
  };
}

/**
 * Get sell quote with slippage protection
 */
export async function getSellQuote(
  client: SuiClient,
  marketId: string,
  rangeMin: bigint,
  rangeMax: bigint,
  shares: bigint,
  slippage: number = 0.05
): Promise<SellQuote> {
  const state = await getMarketState(client, marketId);
  const payout = calculatePayoutForShares(state, rangeMin, rangeMax, shares);
  const probability = calculateProbability(state, rangeMin, rangeMax);
  
  return {
    payout,
    payoutUSDC: Number(payout) / 1_000_000,
    pricePerShare: Number(payout) / Number(shares), // Both in micro-units, so they cancel out
    probability,
    minUsdcOut: BigInt(Math.floor(Number(payout) * (1 - slippage))),
  };
}

// ========================================
// PNL CALCULATIONS
// ========================================

/**
 * Calculate unrealized PnL for an open position
 */
export async function calculatePositionPnL(
  client: SuiClient,
  marketId: string,
  rangeStart: bigint,
  rangeEnd: bigint,
  shares: bigint,
  costBasis: bigint
): Promise<PositionPnL> {
  const sellQuote = await getSellQuote(client, marketId, rangeStart, rangeEnd, shares, 0);
  const unrealizedPnL = sellQuote.payout - costBasis;
  
  return {
    rangeStart,
    rangeEnd,
    shares,
    costBasis,
    currentValue: sellQuote.payout,
    unrealizedPnL,
    unrealizedPnLPercent: Number(unrealizedPnL) / Number(costBasis) * 100,
    probability: sellQuote.probability,
  };
}

/**
 * Calculate realized PnL from trade history
 */
export function calculateRealizedPnL(trades: Trade[]): {
  totalBought: bigint;
  totalSold: bigint;
  realizedPnL: bigint;
  realizedPnLPercent: number;
} {
  let totalBought = 0n;
  let totalSold = 0n;

  for (const trade of trades) {
    if (trade.type === 'buy') {
      totalBought += trade.amount;
    } else {
      totalSold += trade.amount;
    }
  }

  const realizedPnL = totalSold - totalBought;
  const realizedPnLPercent = totalBought > 0n 
    ? Number(realizedPnL) / Number(totalBought) * 100 
    : 0;

  return { totalBought, totalSold, realizedPnL, realizedPnLPercent };
}

/**
 * Calculate total PnL (realized + unrealized)
 */
export async function calculateTotalPnL(
  client: SuiClient,
  marketId: string,
  openPositions: { rangeStart: bigint; rangeEnd: bigint; shares: bigint; costBasis: bigint }[],
  trades: Trade[]
): Promise<{
  unrealizedPnL: bigint;
  realizedPnL: bigint;
  totalPnL: bigint;
  totalPnLPercent: number;
  positions: PositionPnL[];
}> {
  // Calculate realized PnL
  const realized = calculateRealizedPnL(trades);

  // Calculate unrealized PnL for all open positions
  const positions = await Promise.all(
    openPositions.map(p => 
      calculatePositionPnL(client, marketId, p.rangeStart, p.rangeEnd, p.shares, p.costBasis)
    )
  );

  const unrealizedPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0n);
  const totalPnL = realized.realizedPnL + unrealizedPnL;
  const totalInvested = realized.totalBought + positions.reduce((sum, p) => sum + p.costBasis, 0n);
  const totalPnLPercent = totalInvested > 0n 
    ? Number(totalPnL) / Number(totalInvested) * 100 
    : 0;

  return {
    unrealizedPnL,
    realizedPnL: realized.realizedPnL,
    totalPnL,
    totalPnLPercent,
    positions,
  };
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Convert USDC amount to micro units (6 decimals)
 */
export function toMicroUSDC(amount: number): bigint {
  return BigInt(Math.floor(amount * 1_000_000));
}

/**
 * Convert micro units to USDC (6 decimals)
 */
export function fromMicroUSDC(amount: bigint): number {
  return Number(amount) / 1_000_000;
}

/**
 * Format USDC amount for display
 */
export function formatUSDC(amount: bigint): string {
  return `$${fromMicroUSDC(amount).toFixed(2)}`;
}

/**
 * Format percentage for display
 */
export function formatPercent(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}
