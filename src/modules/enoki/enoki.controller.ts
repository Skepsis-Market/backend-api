import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { EnokiService } from './enoki.service';
import { SponsorTransactionDto } from './dto/sponsor-transaction.dto';
import { CheckEligibilityDto } from './dto/check-eligibility.dto';

@ApiTags('Enoki')
@Controller('enoki')
export class EnokiController {
  constructor(private readonly enokiService: EnokiService) {}

  /**
   * POST /api/enoki/sponsor-transaction
   * Sponsor a transaction using Enoki
   */
  @Post('sponsor-transaction')
  @ApiOperation({
    summary: 'Sponsor transaction',
    description: `Sponsor a user's transaction (gas fees paid by backend).
    
**Allowed Operations:**
- place_bet
- sell_shares
- claim_winnings

**Rate Limits:**
- Per user: 0.2 SUI/day
- Global: 5 SUI/day
- Per transaction: 0.2 SUI max

**Example:**
\`\`\`bash
curl -X POST https://api.skepsis.live/api/enoki/sponsor-transaction \\
  -H "Content-Type: application/json" \\
  -d '{
    "transactionKindBytes": [1, 2, 3, ...],
    "userAddress": "0x57400cf44ad97dac479671bb58b96d444e87972f09a6e17fa9650a2c60fbc054"
  }'
\`\`\`
    `,
  })
  @ApiBody({
    type: SponsorTransactionDto,
    examples: {
      placeBet: {
        summary: 'Place Bet Transaction',
        value: {
          transactionKindBytes: [1, 2, 3, 4, 5],
          userAddress: '0x57400cf44ad97dac479671bb58b96d444e87972f09a6e17fa9650a2c60fbc054',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction sponsored successfully',
    schema: {
      example: {
        success: true,
        digest: '4utQS71inTmTV5rZKB83oRLi6Tro2QTUyWciSTbPauak',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid transaction or sponsorship failed' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async sponsorTransaction(@Body() dto: SponsorTransactionDto) {
    return this.enokiService.sponsorTransaction(dto.transactionKindBytes, dto.userAddress);
  }

  /**
   * POST /api/enoki/check-eligibility
   * Check if user can get sponsored transactions
   */
  @Post('check-eligibility')
  @ApiOperation({
    summary: 'Check sponsorship eligibility',
    description: `Check if a user is eligible for transaction sponsorship.
    
Returns remaining daily quota in MIST (1 SUI = 1,000,000,000 MIST).

**Example:**
\`\`\`bash
curl -X POST https://api.skepsis.live/api/enoki/check-eligibility \\
  -H "Content-Type: application/json" \\
  -d '{
    "userAddress": "0x57400cf44ad97dac479671bb58b96d444e87972f09a6e17fa9650a2c60fbc054"
  }'
\`\`\`
    `,
  })
  @ApiBody({
    type: CheckEligibilityDto,
    examples: {
      checkUser: {
        summary: 'Check User Eligibility',
        value: {
          userAddress: '0x57400cf44ad97dac479671bb58b96d444e87972f09a6e17fa9650a2c60fbc054',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Eligibility check result',
    schema: {
      example: {
        eligible: true,
        remainingQuota: 200000000,
        reason: null,
      },
    },
  })
  async checkEligibility(@Body() dto: CheckEligibilityDto) {
    return this.enokiService.checkUserEligibility(dto.userAddress);
  }
}
