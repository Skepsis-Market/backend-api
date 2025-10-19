# Contact Input - Validation Rules Reference

## Quick Reference Card

### **Telegram**
- **Formats**: `@username`, `username`, `t.me/username`, `telegram.me/username`
- **Length**: 5-32 characters
- **Characters**: Letters, numbers, underscores only
- **Restrictions**: Cannot start with a number

### **Twitter/X**
- **Formats**: `x.com/handle`, `twitter.com/handle`, `https://x.com/handle`
- **Length**: 1-15 characters (handle only)
- **Characters**: Letters, numbers, underscores only

---

## Detailed Validation Rules

### **Telegram Username Rules**

✅ **Valid Formats:**
```
alice_trader          → tg:alice_trader
@bob_lp               → tg:bob_lp
t.me/crypto_user      → tg:crypto_user
telegram.me/trader123 → tg:trader123
https://t.me/user_lp  → tg:user_lp
```

❌ **Invalid Formats:**
```
abc                   → Too short (< 5 chars)
1username             → Starts with number
user-name             → Contains hyphen (only _ allowed)
very_long_username_that_exceeds_32_chars → Too long (> 32 chars)
user name             → Contains space
user@name             → Invalid character (@)
```

**Regex Pattern:**
```regex
^[a-zA-Z][a-zA-Z0-9_]{4,31}$
```

**Character Set:**
- First character: `a-z`, `A-Z` (must be letter)
- Following characters: `a-z`, `A-Z`, `0-9`, `_`
- Minimum length: 5
- Maximum length: 32

---

### **Twitter/X Handle Rules**

✅ **Valid Formats:**
```
x.com/alice                    → x:alice
twitter.com/bob                → x:bob
https://x.com/crypto           → x:crypto
https://twitter.com/user123    → x:user123
```

❌ **Invalid Formats:**
```
x.com/                         → Missing handle
twitter.com/verylonghandlethatexceeds15chars → Too long (> 15 chars)
x.com/user-name                → Contains hyphen
https://x.com/user name        → Contains space
```

**Regex Pattern (for handle extraction):**
```regex
(?:https?:\/\/)?(?:www\.)?(twitter\.com|x\.com)\/([a-zA-Z0-9_]{1,15})
```

**Character Set:**
- Characters: `a-z`, `A-Z`, `0-9`, `_`
- Minimum length: 1
- Maximum length: 15

---

## Detection Priority

The backend uses this priority to determine platform:

1. **Twitter URL detected** → Twitter
   - `x.com/` or `twitter.com/` in input
   
2. **Telegram URL detected** → Telegram
   - `t.me/` or `telegram.me/` in input

3. **Short handle (< 5 chars)** → Twitter
   - `@bob` → Twitter (bob)
   - `alice` → Twitter (if < 5 chars)

4. **Long handle (≥ 5 chars)** → Telegram
   - `@alice` → Telegram (alice)
   - `crypto_user` → Telegram

---

## Ambiguous Cases

| Input | Detected As | Reason |
|-------|-------------|--------|
| `@abc` | Twitter | < 5 chars |
| `@alice` | Telegram | ≥ 5 chars |
| `abc` | Twitter | < 5 chars |
| `alice` | Telegram | ≥ 5 chars |
| `user123` | Telegram | ≥ 5 chars |
| `bob` | Twitter | < 5 chars |

**Recommendation for Frontend:**
- Add a platform selector (radio buttons) if you want explicit control
- OR accept the backend auto-detection
- OR add hint text: "Telegram usernames are 5+ characters"

---

## Frontend Validation (TypeScript)

```typescript
interface ValidationResult {
  valid: boolean;
  error?: string;
  platform?: 'telegram' | 'twitter';
}

function validateContact(input: string): ValidationResult {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return { valid: false, error: 'Contact is required' };
  }

  // Check Twitter URL
  const twitterRegex = /(?:https?:\/\/)?(?:www\.)?(twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/i;
  const twitterMatch = trimmed.match(twitterRegex);
  
  if (twitterMatch) {
    const handle = twitterMatch[2];
    if (handle.length > 15) {
      return { valid: false, error: 'Twitter handle must be 15 characters or less' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(handle)) {
      return { valid: false, error: 'Invalid characters in Twitter handle' };
    }
    return { valid: true, platform: 'twitter' };
  }

  // Check Telegram URL
  const telegramRegex = /(?:https?:\/\/)?(?:www\.)?(t\.me|telegram\.me)\/([a-zA-Z0-9_]+)/i;
  const telegramMatch = trimmed.match(telegramRegex);
  
  if (telegramMatch) {
    const username = telegramMatch[2];
    if (username.length < 5) {
      return { valid: false, error: 'Telegram username must be at least 5 characters' };
    }
    if (username.length > 32) {
      return { valid: false, error: 'Telegram username must be 32 characters or less' };
    }
    if (/^[0-9]/.test(username)) {
      return { valid: false, error: 'Telegram username cannot start with a number' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { valid: false, error: 'Invalid characters in Telegram username' };
    }
    return { valid: true, platform: 'telegram' };
  }

  // Plain text (no URL)
  const withoutAt = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;

  // Validate characters
  if (!/^[a-zA-Z0-9_]+$/.test(withoutAt)) {
    return { valid: false, error: 'Only letters, numbers, and underscores allowed' };
  }

  // Check if starts with number
  if (/^[0-9]/.test(withoutAt) && withoutAt.length >= 5) {
    return { valid: false, error: 'Username cannot start with a number' };
  }

  // Determine platform based on length
  if (withoutAt.length < 5) {
    // Treat as Twitter
    if (withoutAt.length < 1) {
      return { valid: false, error: 'Handle is too short' };
    }
    return { valid: true, platform: 'twitter' };
  } else {
    // Treat as Telegram
    if (withoutAt.length > 32) {
      return { valid: false, error: 'Username is too long (max 32 characters)' };
    }
    return { valid: true, platform: 'telegram' };
  }
}
```

---

## Real-Time Validation Example

```tsx
function ContactInput() {
  const [value, setValue] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  useEffect(() => {
    if (value) {
      const result = validateContact(value);
      setValidation(result);
    } else {
      setValidation(null);
    }
  }, [value]);

  return (
    <div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="@username or x.com/handle"
        className={validation?.valid === false ? 'border-red-500' : ''}
      />
      
      {validation?.valid === false && (
        <p className="text-red-500 text-sm">{validation.error}</p>
      )}
      
      {validation?.valid && (
        <p className="text-green-500 text-sm">
          ✓ Valid {validation.platform} handle
        </p>
      )}
    </div>
  );
}
```

---

## Test Cases

### **Should Pass**
```javascript
validateContact('@alice_trader')         // Telegram
validateContact('crypto_user_123')       // Telegram
validateContact('t.me/bob_lp')          // Telegram
validateContact('telegram.me/alice')    // Telegram
validateContact('x.com/bob')            // Twitter
validateContact('twitter.com/alice')    // Twitter
validateContact('https://x.com/crypto') // Twitter
validateContact('@bob')                 // Twitter (< 5 chars)
validateContact('xyz')                  // Twitter (< 5 chars)
```

### **Should Fail**
```javascript
validateContact('')                     // Empty
validateContact('ab')                   // Too short (< 3 chars)
validateContact('1username')            // Starts with number (Telegram)
validateContact('user-name')            // Invalid character (-)
validateContact('user name')            // Space not allowed
validateContact('verylongusernamethatexceedsthirtytwochars') // Too long
validateContact('x.com/verylonghandlethatexceeds') // Twitter > 15 chars
```

---

## Error Messages Reference

| Error | Message | Fix |
|-------|---------|-----|
| Empty input | "Contact is required" | Enter a username |
| Too short | "Username must be at least 5 characters" | Use longer username |
| Too long | "Username is too long (max 32 characters)" | Shorten username |
| Starts with number | "Username cannot start with a number" | Start with letter |
| Invalid chars | "Only letters, numbers, and underscores allowed" | Remove special chars |
| Twitter too long | "Twitter handle must be 15 characters or less" | Shorten handle |

---

## Platform Icons/Hints (Optional)

Show platform icon after validation:

```tsx
{validation?.valid && validation.platform === 'telegram' && (
  <span className="text-blue-500">📱 Telegram</span>
)}

{validation?.valid && validation.platform === 'twitter' && (
  <span className="text-sky-500">🐦 Twitter/X</span>
)}
```

---

## Summary

### **Do's ✅**
- Accept both `@username` and `username` formats
- Accept URLs (`t.me/`, `x.com/`, etc.)
- Validate length (5-32 for Telegram, 1-15 for Twitter)
- Validate characters (alphanumeric + underscore only)
- Show clear error messages
- Auto-detect platform when possible

### **Don'ts ❌**
- Don't require users to select platform manually (auto-detect)
- Don't allow special characters (except underscore)
- Don't allow spaces
- Don't allow usernames starting with numbers (Telegram)
- Don't accept empty input

---

## Backend Processing

Whatever format the user enters, backend will normalize to:

```
Input: @alice_trader
Output: tg:alice_trader

Input: x.com/bob
Output: x:bob

Input: t.me/crypto_user
Output: tg:crypto_user
```

The normalized format is stored in the database and used for uniqueness checking.

---

## Quick Integration Checklist

- [ ] Add single text input field
- [ ] Implement client-side validation (optional but recommended)
- [ ] Show platform indicator (Telegram/Twitter icon)
- [ ] Display validation errors in real-time
- [ ] Call API on submit
- [ ] Handle 409 error (already registered)
- [ ] Show success message with platform
- [ ] Test all formats (with/without @, URLs, etc.)

**Done!** Your frontend is ready to integrate. 🚀
