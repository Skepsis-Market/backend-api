import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserPosition, UserPositionDocument } from '../schemas/user-position.schema';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectModel(UserPosition.name) private userPositionModel: Model<UserPositionDocument>,
  ) {}

  /**
   * Convert micro-units to display value
   */
  private toDecimal(microUnits: string | number): number {
    return Number(microUnits) / 1_000_000;
  }

  /**
   * Get leaderboard rankings
   */
  async getLeaderboard(
    metric: 'total_pnl' | 'roi' | 'volume' = 'total_pnl',
    period: '24h' | '7d' | '30d' | 'all' = 'all',
    limit: number = 100,
  ) {
    // Calculate timestamp filter based on period
    let timestampFilter: any = {};
    if (period !== 'all') {
      const now = Date.now();
      const periodMs = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      };
      const cutoff = String(now - periodMs[period]);
      timestampFilter = { last_updated_at: { $gte: cutoff } };
    }

    // Aggregate user statistics
    const userStats = await this.userPositionModel.aggregate([
      { $match: timestampFilter },
      {
        $group: {
          _id: '$user_address',
          total_pnl: { $sum: { $toLong: '$realized_pnl' } },
          total_invested: { $sum: { $toLong: '$total_cost_basis' } },
          total_volume: { $sum: { $toLong: '$total_cost_basis' } },
          positions_count: { $sum: 1 },
          winning_positions: {
            $sum: {
              $cond: [{ $gt: [{ $toLong: '$realized_pnl' }, 0] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          user_address: '$_id',
          total_pnl: { $toString: '$total_pnl' },
          total_invested: { $toString: '$total_invested' },
          total_volume: { $toString: '$total_volume' },
          positions_count: 1,
          winning_positions: 1,
          roi_percent: {
            $cond: [
              { $gt: ['$total_invested', 0] },
              { $multiply: [{ $divide: ['$total_pnl', '$total_invested'] }, 100] },
              0,
            ],
          },
          win_rate: {
            $cond: [
              { $gt: ['$positions_count', 0] },
              { $multiply: [{ $divide: ['$winning_positions', '$positions_count'] }, 100] },
              0,
            ],
          },
        },
      },
    ]);

    // Sort based on metric
    const sortedStats = userStats.sort((a, b) => {
      if (metric === 'total_pnl') {
        return Number(b.total_pnl) - Number(a.total_pnl);
      } else if (metric === 'roi') {
        return b.roi_percent - a.roi_percent;
      } else if (metric === 'volume') {
        return Number(b.total_volume) - Number(a.total_volume);
      }
      return 0;
    });

    // Take top N and add ranks
    const leaderboard = sortedStats.slice(0, limit).map((stat, index) => ({
      rank: index + 1,
      user_address: stat.user_address,
      total_pnl: stat.total_pnl,
      roi_percent: stat.roi_percent,
      total_volume: stat.total_volume,
      positions_count: stat.positions_count,
      win_rate: stat.win_rate,
    }));

    return {
      leaderboard,
      updated_at: new Date().toISOString(),
      metadata: {
        decimals: 6,
        value_unit: 'micro_usdc',
        note: 'All monetary values in micro-units. Divide by 1,000,000 for display.',
      },
    };
  }
}
