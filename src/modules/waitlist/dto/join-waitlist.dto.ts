import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinWaitlistDto {
  @ApiProperty({
    description: 'Telegram username (starting with @) or Twitter/X handle',
    example: '@johndoe',
  })
  @IsNotEmpty()
  @IsString()
  contact: string;
}
