#!/bin/bash

# Test script for Skepsis Waitlist API
# Make sure the server is running: npm run dev

API_URL="http://localhost:3000/api/waitlist"

echo "🧪 Testing Skepsis Waitlist API"
echo "================================"
echo ""

# Test 1: Join waitlist with Telegram username
echo "1️⃣  Test: Join waitlist with Telegram username"
echo "Request: POST /api/waitlist/join"
echo "Body: {\"contact\": \"@alice_trader\"}"
curl -X POST "$API_URL/join" \
  -H "Content-Type: application/json" \
  -d '{"contact": "@alice_trader"}' \
  -w "\n\n"

sleep 1

# Test 2: Try joining again (should get 409)
echo "2️⃣  Test: Try joining again (expect 409 Conflict)"
curl -X POST "$API_URL/join" \
  -H "Content-Type: application/json" \
  -d '{"contact": "@alice_trader"}' \
  -w "\n\n"

sleep 1

# Test 3: Join with Twitter handle
echo "3️⃣  Test: Join waitlist with Twitter handle"
echo "Request: POST /api/waitlist/join"
echo "Body: {\"contact\": \"x.com/bob_lp\"}"
curl -X POST "$API_URL/join" \
  -H "Content-Type: application/json" \
  -d '{"contact": "x.com/bob_lp"}' \
  -w "\n\n"

sleep 1

echo "================================"
echo "✅ Basic API tests completed!"
echo ""
echo "Next steps:"
echo "1. Run: npm run script:generate-codes"
echo "2. Select entries and assign personas"
echo "3. Test validate and activate endpoints with generated codes"
echo ""
