import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMarketStatusDto {
  @ApiProperty({
    description: 'Market status to update to',
    enum: ['resolved', 'cancelled'],
    example: 'resolved',
  })
  @IsString()
  @IsIn(['resolved', 'cancelled'])
  status: 'resolved' | 'cancelled';

  @ApiProperty({
    description: 'Resolved value (required when status is "resolved")',
    example: 108500,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  resolvedValue?: number;
}