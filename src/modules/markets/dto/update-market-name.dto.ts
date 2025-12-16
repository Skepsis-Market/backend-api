import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateMarketNameDto {
  @ApiProperty({ 
    description: 'New market name',
    example: 'Bitcoin Price Prediction'
  })
  @IsString()
  @IsNotEmpty()
  marketName: string;
}
