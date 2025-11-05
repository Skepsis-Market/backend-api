import { IsArray, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SponsorTransactionDto {
  @ApiProperty({
    description: 'Transaction bytes from frontend (serialized transaction)',
    example: [1, 2, 3, 4, 5],
    type: [Number],
  })
  @IsArray()
  @IsNotEmpty()
  transactionKindBytes: number[];

  @ApiProperty({
    description: 'Sui wallet address of the user',
    example: '0x57400cf44ad97dac479671bb58b96d444e87972f09a6e17fa9650a2c60fbc054',
  })
  @IsString()
  @IsNotEmpty()
  userAddress: string;
}
