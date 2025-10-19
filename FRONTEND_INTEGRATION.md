# Frontend Integration Guide

## Contact Input - Validation Rules

### **Single Text Field Strategy**

Use **one text input** for both Telegram and Twitter handles. Backend will automatically detect the platform.

---

## ✅ **Accepted Formats**

### **Telegram**
| Input Format | Parsed As | Valid |
|-------------|-----------|-------|
| `@username` | `tg:username` | ✅ |
| `username` | `tg:username` | ✅ |
| `telegram.me/username` | `tg:username` | ✅ |
| `t.me/username` | `tg:username` | ✅ |

**Requirements:**
- Length: 5-32 characters
- Characters: `a-z`, `A-Z`, `0-9`, `_` (underscore)
- Cannot start with a number
- Case-insensitive (will be normalized to lowercase)

**Valid Examples:**
```
alice_trader
@bob_lp
BobLP
crypto_user_123
t.me/alice_trader
```

**Invalid Examples:**
```
abc          → Too short (< 5 chars)
1username    → Cannot start with number
user-name    → No hyphens allowed
user@name    → No @ in middle
averylongusernamethatexceedsmax32chars → Too long
```

---

### **Twitter/X**
| Input Format | Parsed As | Valid |
|-------------|-----------|-------|
| `x.com/handle` | `x:handle` | ✅ |
| `twitter.com/handle` | `x:handle` | ✅ |
| `https://x.com/handle` | `x:handle` | ✅ |
| `https://twitter.com/handle` | `x:handle` | ✅ |

**Requirements:**
- Length: 1-15 characters (after extracting from URL)
- Characters: `a-z`, `A-Z`, `0-9`, `_` (underscore)
- Case-insensitive

**Valid Examples:**
```
x.com/alice
twitter.com/bob_trader
https://x.com/crypto_lp
https://twitter.com/user123
```

**Invalid Examples:**
```
x.com/          → Missing handle
twitter.com/averylonghandleexceeds15 → Too long (> 15 chars)
x.com/user-name → No hyphens allowed
```

---

## 🎯 **Detection Logic**

### **Priority Order:**
1. **Contains URL** → Check for `x.com` or `twitter.com` → Twitter
2. **Short handle (< 5 chars)** → Twitter
3. **Long handle (≥ 5 chars)** → Telegram

### **Ambiguous Cases:**
| Input | Detected As | Reason |
|-------|-------------|--------|
| `@alice` | Telegram | Default for @ without URL context |
| `alice` | Telegram | ≥ 5 chars → Telegram |
| `bob` | Twitter | < 5 chars → Twitter |
| `x.com/alice` | Twitter | URL detected |

---

## 📝 **Frontend Implementation**

### **React Example**

```tsx
import { useState } from 'react';

interface ContactInputProps {
  onSubmit: (contact: string) => Promise<void>;
}

export function WaitlistForm({ onSubmit }: ContactInputProps) {
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateInput = (value: string): string | null => {
    const trimmed = value.trim();
    
    if (!trimmed) {
      return 'Please enter your Telegram or Twitter handle';
    }

    // Check for Twitter URL
    const twitterUrlRegex = /(?:https?:\/\/)?(?:www\.)?(twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/i;
    const twitterMatch = trimmed.match(twitterUrlRegex);
    
    if (twitterMatch) {
      const handle = twitterMatch[2];
      if (handle.length > 15) {
        return 'Twitter handle must be 15 characters or less';
      }
      if (!/^[a-zA-Z0-9_]+$/.test(handle)) {
        return 'Twitter handle can only contain letters, numbers, and underscores';
      }
      return null; // Valid Twitter
    }

    // Remove @ if present
    const withoutAt = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;

    // Check if it's a valid Telegram username
    if (withoutAt.length >= 5 && withoutAt.length <= 32) {
      if (!/^[a-zA-Z0-9_]+$/.test(withoutAt)) {
        return 'Username can only contain letters, numbers, and underscores';
      }
      if (/^[0-9]/.test(withoutAt)) {
        return 'Username cannot start with a number';
      }
      return null; // Valid Telegram
    }

    // Short handle (< 5 chars) - treat as Twitter
    if (withoutAt.length < 5) {
      if (!/^[a-zA-Z0-9_]+$/.test(withoutAt)) {
        return 'Handle can only contain letters, numbers, and underscores';
      }
      return null; // Valid Twitter (short)
    }

    // Too long (> 32 chars)
    if (withoutAt.length > 32) {
      return 'Username is too long (max 32 characters)';
    }

    return 'Invalid format';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateInput(contact);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setLoading(true);

    try {
      await onSubmit(contact);
      setContact('');
      // Show success message
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join waitlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="contact" className="block text-sm font-medium">
          Telegram or Twitter Handle
        </label>
        <input
          id="contact"
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="@username or x.com/handle"
          className="mt-1 block w-full rounded-md border px-3 py-2"
          disabled={loading}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Enter your Telegram username or Twitter/X profile URL
        </p>
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Joining...' : 'Join Waitlist'}
      </button>
    </form>
  );
}
```

---

## 🔌 **API Integration**

### **1. Join Waitlist**

```typescript
async function joinWaitlist(contact: string) {
  const response = await fetch('http://localhost:3000/api/waitlist/join', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ contact }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
  // Returns: { message: "Added to waitlist", platform: "telegram" | "twitter" }
}
```

**Usage:**
```typescript
try {
  const result = await joinWaitlist('@alice_trader');
  console.log(result.message); // "Added to waitlist"
  console.log(result.platform); // "telegram"
  // Show success: "You're on the waitlist! We'll send your access code soon."
} catch (error) {
  console.error(error.message);
  // Show error: "Already registered in waitlist" or other error
}
```

---

### **2. Validate Access Code**

```typescript
async function validateAccessCode(code: string) {
  const response = await fetch(
    `http://localhost:3000/api/waitlist/validate/${code.toUpperCase()}`,
  );

  return await response.json();
  // Returns:
  // { valid: true, persona: ["trader"] }
  // OR { valid: false }
}
```

**Usage:**
```typescript
const result = await validateAccessCode('K9MX4P');

if (!result.valid) {
  // Show error: "Invalid access code"
} else {
  // Code is valid! Show "Connect Wallet" button
  console.log('Persona:', result.persona); // ["trader", "lp"]
}
```

---

### **3. Activate Access Code (Connect Wallet)**

```typescript
async function activateCode(accessCode: string, walletAddress: string) {
  const response = await fetch('http://localhost:3000/api/waitlist/activate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      access_code: accessCode.toUpperCase(),
      wallet_address: walletAddress,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
  // Returns: { message: "Access granted", persona: ["trader"], wallet: "0x..." }
}
```

**Usage:**
```typescript
try {
  const result = await activateCode('K9MX4P', '0xabc123...');
  console.log(result.message); // "Access granted"
  console.log(result.persona); // ["trader", "lp"]
  
  // Store in localStorage or state
  localStorage.setItem('wallet', result.wallet);
  localStorage.setItem('persona', JSON.stringify(result.persona));
  
  // Redirect to platform or show success
} catch (error) {
  // Show error: "Invalid access code" or "Code already used"
}
```

---

## 🎨 **UI/UX Recommendations**

### **Waitlist Page**

```tsx
// Step 1: Join Waitlist
<WaitlistForm onSubmit={joinWaitlist} />

// On Success:
<SuccessMessage>
  🎉 You're on the waitlist!
  <br />
  We'll send your access code to your {platform} DM soon.
</SuccessMessage>
```

---

### **Access Code Page**

```tsx
// Step 1: Enter Access Code
<input
  placeholder="Enter 6-character code"
  maxLength={6}
  onChange={(e) => setCode(e.target.value.toUpperCase())}
/>

// Step 2: Validate on blur or button click
useEffect(() => {
  if (code.length === 6) {
    validateAccessCode(code).then(result => {
      if (result.valid) {
        setShowWalletConnect(true);
      }
    });
  }
}, [code]);

// Step 3: Connect Wallet (show only if code is valid)
{showWalletConnect && (
  <button onClick={connectWallet}>
    Connect Sui Wallet
  </button>
)}

// Step 4: Activate on wallet connection
async function connectWallet() {
  const wallet = await sui.connect(); // Your Sui wallet logic
  await activateCode(code, wallet.address);
  // Redirect to platform
}
```

---

## 📋 **Complete User Flow**

### **Flow 1: Join Waitlist**
```
1. User visits waitlist page
2. Enters: "@alice_trader" or "x.com/bob"
3. Frontend validates format
4. POST /api/waitlist/join
5. Success: "You're on the waitlist! Check your DMs for access code."
6. Error (409): "Already registered"
```

### **Flow 2: Access Platform**
```
1. User receives access code via DM (e.g., "K9MX4P")
2. User visits platform, enters code
3. GET /api/waitlist/validate/K9MX4P
4. Valid? Show "Connect Wallet" button
5. User clicks "Connect Wallet"
6. Sui wallet connects → Get address (0xabc123...)
7. POST /api/waitlist/activate { code, wallet }
8. Success: Store wallet + persona in localStorage
9. Redirect to platform homepage
10. Use persona to show/hide features (trader vs LP views)
```

---

## 🚨 **Error Handling**

### **Common Errors**

| Status | Message | Action |
|--------|---------|--------|
| 400 | Invalid contact format | Show validation error |
| 409 | Already registered in waitlist | Show "Already on waitlist" |
| 404 | Invalid access code | Show "Code not found" (from validate endpoint returns `{ valid: false }`) |
| 409 | Access code already used | Show "Code already activated" (from activate endpoint) |
| 409 | Wallet already linked | Show "Wallet already registered" |

### **Error Display Example**

```tsx
{error && (
  <div className="rounded-md bg-red-50 p-4">
    <p className="text-sm text-red-800">{error}</p>
  </div>
)}
```

---

## 🔒 **Security Notes**

1. **No authentication required** - Stateless API
2. **Wallet verification** - Frontend should verify wallet ownership (optional)
3. **Rate limiting** - Consider adding rate limiting on frontend (not implemented backend)
4. **Input sanitization** - Backend validates all inputs
5. **CORS** - Backend allows your frontend URL (set in `.env`)

---

## 📱 **Mobile Considerations**

### **Telegram Deep Links**
```tsx
// Optional: Add "Open Telegram" button after signup
<a href="https://t.me/skepsis_bot" target="_blank">
  Open Telegram to receive code
</a>
```

### **Twitter Deep Links**
```tsx
// Optional: Add "Open Twitter DMs" button
<a href="twitter://messages" target="_blank">
  Check Twitter DMs for code
</a>
```

---

## ✅ **Testing Checklist**

- [ ] Valid Telegram username (@alice, username)
- [ ] Valid Twitter URL (x.com/handle, twitter.com/handle)
- [ ] Too short (< 5 chars for Telegram)
- [ ] Too long (> 32 chars for Telegram, > 15 for Twitter)
- [ ] Invalid characters (special chars, spaces)
- [ ] Duplicate submission (409 error)
- [ ] Valid access code
- [ ] Invalid access code
- [ ] Already used code
- [ ] Wallet connection
- [ ] Duplicate wallet (409 error)

---

## 🎉 **Quick Integration Summary**

### **3 API Calls, 3 States**

```typescript
// State 1: Waitlist
const { message, platform } = await joinWaitlist('@alice');

// State 2: Validation
const { valid, persona } = await validateAccessCode('K9MX4P');

// State 3: Activation
const { message, persona, wallet } = await activateCode('K9MX4P', '0xabc...');
```

**That's it!** No auth tokens, no sessions, no complexity. Just 3 simple API calls. 🚀
