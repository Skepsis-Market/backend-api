import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';
import { ActivateCodeDto } from './dto/activate-code.dto';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  /**
   * POST /api/waitlist/join
   * Add user to waitlist
   */
  @Post('join')
  async join(@Body() dto: JoinWaitlistDto) {
    return this.waitlistService.joinWaitlist(dto);
  }

  /**
   * GET /api/waitlist/validate/:code
   * Validate access code
   */
  @Get('validate/:code')
  async validate(@Param('code') code: string) {
    return this.waitlistService.validateCode(code);
  }

  /**
   * POST /api/waitlist/activate
   * Activate access code and link wallet
   */
  @Post('activate')
  async activate(@Body() dto: ActivateCodeDto) {
    return this.waitlistService.activateCode(dto);
  }
}
