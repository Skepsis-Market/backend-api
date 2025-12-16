import { ApiProperty } from '@nestjs/swagger';

export class UpdateMarketNameDto {
  @ApiProperty({ 
    description: 'New market name',
    example: 'Bitcoin Price Prediction'
  })
  marketName: string;
}
