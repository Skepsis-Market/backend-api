import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckEligibilityDto {
  @ApiProperty({
    description: 'Sui wallet address to check eligibility',
    example: '0x57400cf44ad97dac479671bb58b96d444e87972f09a6e17fa9650a2c60fbc054',
  })
  @IsString()
  @IsNotEmpty()
  userAddress: string;
}
