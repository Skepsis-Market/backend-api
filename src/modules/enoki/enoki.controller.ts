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
   * Create a sponsored transaction (Step 1 of 2)
   */
  @Post('sponsor-transaction')
  @ApiOperation({
    summary: 'Create sponsored transaction',
    description: `Step 1: Create a sponsored transaction that frontend can sign.
    
**New Flow (Official Enoki Pattern):**
1. Frontend builds transaction with \`onlyTransactionKind: true\`
2. Frontend calls this endpoint with transactionKindBytes + userAddress
3. Backend creates sponsored transaction via Enoki SDK
4. Returns sponsored bytes + digest for frontend to sign
5. Frontend signs the sponsored bytes
6. Frontend calls /execute-transaction with digest + signature

**Example Frontend Code:**
\`\`\`typescript
// Step 1: Build transaction
const txb = new Transaction();
// ... add your transaction commands
const bytes = await txb.build({ client, onlyTransactionKind: true });

// Step 2: Request sponsorship
const sponsorRes = await fetch('/api/enoki/sponsor-transaction', {
  method: 'POST',
  body: JSON.stringify({
    transactionKindBytes: Array.from(bytes),
    userAddress: currentAccount.address
  })
});
const { bytes: sponsoredBytes, digest } = await sponsorRes.json();

// Step 3: Sign sponsored transaction
const { signature } = await signTransaction({ 
  transaction: Transaction.from(sponsoredBytes) 
});

// Step 4: Execute
await fetch('/api/enoki/execute-transaction', {
  method: 'POST',
  body: JSON.stringify({ digest, signature })
});
\`\`\`
    `,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        transactionKindBytes: {
          type: 'array',
          items: { type: 'number' },
          description: 'Transaction bytes from frontend (serialized with onlyTransactionKind: true)',
          example: [1, 2, 3, 4, 5],
        },
        userAddress: {
          type: 'string',
          description: 'Sui wallet address of the user',
          example: '0x57400cf44ad97dac479671bb58b96d444e87972f09a6e17fa9650a2c60fbc054',
        },
      },
      required: ['transactionKindBytes', 'userAddress'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Sponsored transaction created - ready for signing',
    schema: {
      example: {
        success: true,
        bytes: 'base64_sponsored_transaction_bytes',
        digest: '4utQS71inTmTV5rZKB83oRLi6Tro2QTUyWciSTbPauak',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid transaction or sponsorship failed' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async sponsorTransaction(@Body() body: { transactionKindBytes: number[]; userAddress: string }) {
    return this.enokiService.sponsorTransaction(
      body.transactionKindBytes,
      body.userAddress,
    );
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

  /**
   * POST /api/enoki/execute-transaction
   * Execute a sponsored transaction with user signature
   */
  @Post('execute-transaction')
  @ApiOperation({
    summary: 'Execute sponsored transaction',
    description: `Execute a previously sponsored transaction with user signature.
    
**Flow:**
1. Frontend calls /sponsor-transaction to get sponsored bytes
2. Frontend signs the sponsored bytes with wallet
3. Frontend calls this endpoint with digest + signature
4. Backend executes the transaction on Sui

**Example:**
\`\`\`typescript
// Step 2: Sign sponsored transaction
const { signature } = await signTransaction({ transaction: sponsoredTx });

// Step 3: Execute
await fetch('/api/enoki/execute-transaction', {
  method: 'POST',
  body: JSON.stringify({
    digest: sponsoredTx.digest,
    signature: signature
  })
});
\`\`\`
    `,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        digest: {
          type: 'string',
          description: 'Transaction digest from sponsor-transaction call',
          example: '4utQS71inTmTV5rZKB83oRLi6Tro2QTUyWciSTbPauak',
        },
        signature: {
          type: 'string',
          description: 'User signature of the sponsored transaction bytes',
          example: 'base64_encoded_signature',
        },
      },
      required: ['digest', 'signature'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction executed successfully',
    schema: {
      example: {
        success: true,
        digest: '4utQS71inTmTV5rZKB83oRLi6Tro2QTUyWciSTbPauak',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid digest or signature' })
  async executeTransaction(@Body() body: { digest: string; signature: string }) {
    return this.enokiService.executeTransaction(body.digest, body.signature);
  }
}
