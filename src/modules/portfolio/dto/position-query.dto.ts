import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PositionQueryDto {
  @ApiProperty({ 
    enum: ['active', 'closed', 'all'], 
    default: 'active', 
    required: false,
    description: 'Filter by position status'
  })
  @IsOptional()
  @IsEnum(['active', 'closed', 'all'])
  status?: 'active' | 'closed' | 'all';

  @ApiProperty({ 
    required: false,
    description: 'Filter by specific market ID'
  })
  @IsOptional()
  @IsString()
  marketId?: string;

  @ApiProperty({ 
    default: 50, 
    required: false,
    description: 'Number of positions to return'
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiProperty({ 
    default: 0, 
    required: false,
    description: 'Offset for pagination'
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class EventHistoryQueryDto {
  @ApiProperty({ 
    required: false,
    description: 'Filter by specific market ID'
  })
  @IsOptional()
  @IsString()
  marketId?: string;

  @ApiProperty({ 
    required: false,
    description: 'Filter by range lower bound'
  })
  @IsOptional()
  @IsString()
  rangeLower?: string;

  @ApiProperty({ 
    required: false,
    description: 'Filter by range upper bound'
  })
  @IsOptional()
  @IsString()
  rangeUpper?: string;

  @ApiProperty({ 
    enum: ['SHARES_PURCHASED', 'SHARES_SOLD', 'REWARDS_CLAIMED'],
    required: false,
    description: 'Filter by event type'
  })
  @IsOptional()
  @IsEnum(['SHARES_PURCHASED', 'SHARES_SOLD', 'REWARDS_CLAIMED'])
  eventType?: 'SHARES_PURCHASED' | 'SHARES_SOLD' | 'REWARDS_CLAIMED';

  @ApiProperty({ 
    required: false,
    description: 'Start timestamp (Unix milliseconds)'
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({ 
    required: false,
    description: 'End timestamp (Unix milliseconds)'
  })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiProperty({ 
    default: 100, 
    required: false,
    description: 'Number of events to return'
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiProperty({ 
    default: 0, 
    required: false,
    description: 'Offset for pagination'
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class MarketPositionsQueryDto {
  @ApiProperty({ 
    enum: ['active', 'all'], 
    default: 'active', 
    required: false,
    description: 'Filter by position status'
  })
  @IsOptional()
  @IsEnum(['active', 'all'])
  status?: 'active' | 'all';

  @ApiProperty({ 
    enum: ['shares', 'value', 'pnl'], 
    default: 'shares', 
    required: false,
    description: 'Sort positions by metric'
  })
  @IsOptional()
  @IsEnum(['shares', 'value', 'pnl'])
  sortBy?: 'shares' | 'value' | 'pnl';

  @ApiProperty({ 
    default: 50, 
    required: false,
    description: 'Number of positions to return'
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiProperty({ 
    default: 0, 
    required: false,
    description: 'Offset for pagination'
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class LeaderboardQueryDto {
  @ApiProperty({ 
    enum: ['total_pnl', 'roi', 'volume'], 
    default: 'total_pnl', 
    required: false,
    description: 'Metric to rank by'
  })
  @IsOptional()
  @IsEnum(['total_pnl', 'roi', 'volume'])
  metric?: 'total_pnl' | 'roi' | 'volume';

  @ApiProperty({ 
    enum: ['24h', '7d', '30d', 'all'], 
    default: 'all', 
    required: false,
    description: 'Time period for rankings'
  })
  @IsOptional()
  @IsEnum(['24h', '7d', '30d', 'all'])
  period?: '24h' | '7d' | '30d' | 'all';

  @ApiProperty({ 
    default: 100, 
    required: false,
    description: 'Number of top users to return'
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
