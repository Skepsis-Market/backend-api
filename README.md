# Skepsis Backend - Waitlist API

Simple waitlist system for Skepsis prediction market platform on Sui blockchain.

## 📚 Documentation

- **[Frontend Integration Guide](FRONTEND_INTEGRATION.md)** - Complete integration guide with React examples
- **[Input Format Rules](INPUT_FORMATS.md)** - Visual guide for accepted input formats
- **[Validation Rules](VALIDATION_RULES.md)** - Detailed validation reference
- **[Deployment Guide](DEPLOYMENT.md)** - EC2 deployment instructions
- **[Project Summary](PROJECT_SUMMARY.md)** - Complete project overview

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Start MongoDB
```bash
brew services start mongodb-community
```

### 3. Configure Environment
Copy `.env.example` to `.env` and update values:
```bash
cp .env.example .env
```

### 4. Start Development Server
```bash
npm run dev
```

Server runs on `http://localhost:3000`

---

## API Endpoints

### Base URL
```
http://localhost:3000/api
```

### 1. Join Waitlist
Add user to waitlist with Telegram or Twitter handle.

**Endpoint:** `POST /api/waitlist/join`

**Request Body:**
```json
{
  "contact": "@username"
}
```

**Supported formats:**
- `@username` → Telegram
- `username` → Telegram
- `x.com/handle` → Twitter
- `twitter.com/handle` → Twitter

**Response (Success):**
```json
{
  "message": "Added to waitlist",
  "platform": "telegram"
}
```

**Response (Already registered):**
```json
{
  "statusCode": 409,
  "message": "Already registered in waitlist"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/waitlist/join \
  -H "Content-Type: application/json" \
  -d '{"contact": "@skepsis_user"}'
```

---

### 2. Validate Access Code
Check if an access code is valid and not yet used.

**Endpoint:** `GET /api/waitlist/validate/:code`

**Response (Valid & Unused):**
```json
{
  "valid": true,
  "already_used": false,
  "persona": ["trader", "lp"]
}
```

**Response (Valid & Already Used):**
```json
{
  "valid": true,
  "already_used": true,
  "wallet": "0x123..."
}
```

**Response (Invalid):**
```json
{
  "valid": false
}
```

**Example:**
```bash
curl http://localhost:3000/api/waitlist/validate/K9MX4P
```

---

### 3. Activate Access Code
Link a wallet address to an access code.

**Endpoint:** `POST /api/waitlist/activate`

**Request Body:**
```json
{
  "access_code": "K9MX4P",
  "wallet_address": "0x123abc..."
}
```

**Response (Success):**
```json
{
  "message": "Access granted",
  "persona": ["trader"],
  "wallet": "0x123abc..."
}
```

**Response (Code not found):**
```json
{
  "statusCode": 404,
  "message": "Invalid access code"
}
```

**Response (Code already used):**
```json
{
  "statusCode": 409,
  "message": "Access code already used"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/waitlist/activate \
  -H "Content-Type: application/json" \
  -d '{
    "access_code": "K9MX4P",
    "wallet_address": "0x123abc..."
  }'
```

---

## Admin: Generate Access Codes

Run the interactive CLI script to generate access codes for waitlist entries.

```bash
npm run script:generate-codes
```

**What it does:**
1. Fetches all pending waitlist entries
2. Lets you select entries (all or specific)
3. Assigns persona tags (Trader/LP/Both)
4. Generates unique 6-character codes
5. Updates database
6. Exports CSV file with codes

**CSV Output:**
```csv
Contact,Platform,Access Code,Persona
@user1,telegram,K9MX4P,trader
x.com/user2,twitter,AB5TGH,lp
```

You can then manually DM users their access codes via Telegram or Twitter.

---

## Project Structure

```
src/
├── main.ts                          # Application entry point
├── app.module.ts                    # Root module
├── modules/
│   └── waitlist/
│       ├── waitlist.module.ts       # Waitlist module
│       ├── waitlist.controller.ts   # API endpoints
│       ├── waitlist.service.ts      # Business logic
│       ├── schemas/
│       │   └── waitlist.schema.ts   # MongoDB schema
│       └── dto/
│           ├── join-waitlist.dto.ts
│           └── activate-code.dto.ts
├── common/
│   └── utils/
│       ├── contact-parser.util.ts   # Parse Telegram/Twitter handles
│       └── code-generator.util.ts   # Generate access codes
└── scripts/
    └── generate-codes.ts            # Admin CLI script
```

---

## Database Schema

**Collection:** `waitlists`

```javascript
{
  _id: ObjectId,
  contact: "tg:username" | "x:handle",     // Normalized
  contact_raw: "@username",                 // Original input
  platform: "telegram" | "twitter",
  access_code: "K9MX4P" | null,            // Generated later
  persona: ["trader"] | ["lp"] | ["trader", "lp"] | null,
  wallet_address: "0x123..." | null,       // Linked on activation
  status: "pending" | "approved" | "used",
  approved_at: Date | null,
  used_at: Date | null,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Build & Deploy

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Deploy to EC2
1. SSH into EC2 instance
2. Install Node.js and MongoDB
3. Clone repository
4. Run `npm install --production`
5. Set environment variables
6. Run `npm run build && npm start`
7. Use PM2 or systemd for process management

---

## Environment Variables

```env
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/skepsis
FRONTEND_URL=https://skepsis.live
```

---

## Testing the API

### 1. Join Waitlist
```bash
curl -X POST http://localhost:3000/api/waitlist/join \
  -H "Content-Type: application/json" \
  -d '{"contact": "@alice"}'
```

### 2. Generate Code (Admin)
```bash
npm run script:generate-codes
# Select entry, assign persona "trader"
# Code generated: K9MX4P
```

### 3. Validate Code
```bash
curl http://localhost:3000/api/waitlist/validate/K9MX4P
```

### 4. Activate Code
```bash
curl -X POST http://localhost:3000/api/waitlist/activate \
  -H "Content-Type: application/json" \
  -d '{
    "access_code": "K9MX4P",
    "wallet_address": "0xabc123"
  }'
```

---

## Notes

- No authentication/JWT - frontend manages wallet state
- Access codes are 6 characters: `[A-Z2-9]` (no O, 0, I, 1)
- One wallet per access code
- Personas: `trader`, `lp`, or both
- MongoDB indexes ensure uniqueness on contact, code, wallet
