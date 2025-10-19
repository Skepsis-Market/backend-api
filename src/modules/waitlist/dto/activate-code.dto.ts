import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ActivateCodeDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Z0-9]{6}$/, { message: 'Invalid access code format' })
  access_code: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]+$/, { message: 'Invalid wallet address format' })
  wallet_address: string;
}
