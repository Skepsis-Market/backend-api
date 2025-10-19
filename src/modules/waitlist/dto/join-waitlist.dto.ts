import { IsNotEmpty, IsString } from 'class-validator';

export class JoinWaitlistDto {
  @IsNotEmpty()
  @IsString()
  contact: string;
}
