import { Controller, Get, Post, Body, Param, Patch, Query } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';
import { ActivateCodeDto } from './dto/activate-code.dto';
import { ShareCodeDto } from './dto/share-code.dto';
import { GenerateCodesDto } from './dto/generate-codes.dto';

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
   * PATCH /api/waitlist/:access_code/share
   * Mark or unmark a code as shared
   */
  @Patch(':access_code/share')
  async share(
    @Param('access_code') access_code: string,
    @Body() body: ShareCodeDto,
  ) {
    return this.waitlistService.setShared(access_code, body.isShared, body.sharedBy);
  }

  /**
   * GET /api/waitlist
   * Optional query param: ?status=pending|shared|approved_not_shared
   */
  @Get()
  async listByStatus(@Query('status') status?: string) {
    return this.waitlistService.getByStatus(status);
  }

  /**
   * POST /api/waitlist/generate-codes
   * Generate access codes for pending entries
   */
  @Post('generate-codes')
  async generateCodes(@Body() dto: GenerateCodesDto) {
    return this.waitlistService.generateCodes(dto.limit, dto.persona, dto.contacts);
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
