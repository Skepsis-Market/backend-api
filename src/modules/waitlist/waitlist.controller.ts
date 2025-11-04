import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity, ApiResponse } from '@nestjs/swagger';
import { WaitlistService } from './waitlist.service';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';
import { ActivateCodeDto } from './dto/activate-code.dto';
import { ShareCodeDto } from './dto/share-code.dto';
import { AdminGuard } from '../../common/guards/admin.guard';

@ApiTags('Waitlist')
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  /**
   * POST /api/waitlist/join
   * Add user to waitlist
   */
  @Post('join')
  @ApiOperation({ summary: 'Join waitlist', description: 'Add user to waitlist with auto-generated access code' })
  @ApiResponse({ status: 201, description: 'Successfully added to waitlist' })
  @ApiResponse({ status: 409, description: 'Already registered in waitlist' })
  async join(@Body() dto: JoinWaitlistDto) {
    return this.waitlistService.joinWaitlist(dto);
  }

  /**
   * GET /api/waitlist/validate/:code
   * Validate access code
   */
  @Get('validate/:code')
  @ApiOperation({ summary: 'Validate access code', description: 'Check if an access code is valid and available' })
  @ApiResponse({ status: 200, description: 'Access code validation result' })
  async validate(@Param('code') code: string) {
    return this.waitlistService.validateCode(code);
  }

  /**
   * PATCH /api/waitlist/share
   * Mark or unmark a code as shared by contact
   */
  @UseGuards(AdminGuard)
  @Patch('share')
  @ApiSecurity('admin-key')
  @ApiOperation({ summary: 'Share access code (Admin)', description: 'Mark code as shared with user by contact handle. Returns the access code.' })
  @ApiResponse({ status: 200, description: 'Access code shared status updated' })
  @ApiResponse({ status: 401, description: 'Invalid or missing admin credentials' })
  @ApiResponse({ status: 404, description: 'Contact not found in waitlist' })
  async share(@Body() body: ShareCodeDto) {
    return this.waitlistService.setShared(body.contact, body.isShared, body.sharedBy);
  }

  /**
   * GET /api/waitlist
   * Optional query param: ?status=pending|shared|approved_not_shared
   */
  @UseGuards(AdminGuard)
  @Get()
  @ApiSecurity('admin-key')
  @ApiOperation({ summary: 'List waitlist entries (Admin)', description: 'Get waitlist entries filtered by status' })
  @ApiResponse({ status: 200, description: 'List of waitlist entries' })
  @ApiResponse({ status: 401, description: 'Invalid or missing admin credentials' })
  async listByStatus(@Query('status') status?: string) {
    return this.waitlistService.getByStatus(status);
  }

  /**
   * POST /api/waitlist/activate
   * Activate access code and link wallet
   */
  @Post('activate')
  @ApiOperation({ summary: 'Activate access code', description: 'Activate code and link wallet address' })
  @ApiResponse({ status: 200, description: 'Access code activated successfully' })
  @ApiResponse({ status: 404, description: 'Access code not found or invalid' })
  async activate(@Body() dto: ActivateCodeDto) {
    return this.waitlistService.activateCode(dto);
  }
}
