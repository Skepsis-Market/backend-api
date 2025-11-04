import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActivateCodeDto {
  @ApiProperty({
    description: '6-character access code received from admin',
    example: 'ABC123',
    pattern: '^[A-Z0-9]{6}$',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Z0-9]{6}$/, { message: 'Invalid access code format' })
  access_code: string;

  @ApiProperty({
    description: 'Sui wallet address to link to the access code',
    example: '0x57400cf44ad97dac479671bb58b96d444e87972f09a6e17fa9650a2c60fbc054',
    pattern: '^0x[a-fA-F0-9]+$',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]+$/, { message: 'Invalid wallet address format' })
  wallet_address: string;
}
