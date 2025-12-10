import { IsNotEmpty, IsString, IsEmail, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinWaitlistDto {
  @ApiProperty({
    description: 'Email address',
    example: 'user@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User consent for newsletter subscription',
    example: true,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  newsletter_consent?: boolean;
}
