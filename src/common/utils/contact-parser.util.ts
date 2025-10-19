export interface ParsedContact {
  contact: string;       // Normalized format: "tg:username" or "x:handle"
  contact_raw: string;   // Original input
  platform: 'telegram' | 'twitter';
}

/**
 * Parse and normalize user input to detect Telegram or Twitter handle
 * 
 * Supported formats:
 * - @username → Telegram
 * - username → Telegram (if alphanumeric + underscore, 5-32 chars)
 * - t.me/username → Telegram
 * - telegram.me/username → Telegram
 * - x.com/handle → Twitter
 * - twitter.com/handle → Twitter
 */
export function parseContact(input: string): ParsedContact {
  const trimmed = input.trim();
  
  // Twitter URL patterns
  const twitterUrlRegex = /(?:https?:\/\/)?(?:www\.)?(twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/i;
  const twitterMatch = trimmed.match(twitterUrlRegex);
  
  if (twitterMatch) {
    const handle = twitterMatch[2];
    return {
      contact: `x:${handle}`,
      contact_raw: trimmed,
      platform: 'twitter',
    };
  }
  
  // Telegram URL patterns (t.me or telegram.me)
  const telegramUrlRegex = /(?:https?:\/\/)?(?:www\.)?(t\.me|telegram\.me)\/([a-zA-Z0-9_]+)/i;
  const telegramMatch = trimmed.match(telegramUrlRegex);
  
  if (telegramMatch) {
    const username = telegramMatch[2];
    return {
      contact: `tg:${username}`,
      contact_raw: trimmed,
      platform: 'telegram',
    };
  }
  
  // Remove @ symbol if present
  const withoutAt = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  
  // Telegram username validation: 5-32 chars, alphanumeric + underscore
  const telegramRegex = /^[a-zA-Z0-9_]{5,32}$/;
  
  if (telegramRegex.test(withoutAt)) {
    return {
      contact: `tg:${withoutAt}`,
      contact_raw: trimmed,
      platform: 'telegram',
    };
  }
  
  // Twitter handle validation: 1-15 chars, alphanumeric + underscore
  const twitterRegex = /^[a-zA-Z0-9_]{1,15}$/;
  
  if (twitterRegex.test(withoutAt)) {
    // Ambiguous case - default to Telegram if >= 5 chars, Twitter if < 5
    if (withoutAt.length >= 5) {
      return {
        contact: `tg:${withoutAt}`,
        contact_raw: trimmed,
        platform: 'telegram',
      };
    } else {
      return {
        contact: `x:${withoutAt}`,
        contact_raw: trimmed,
        platform: 'twitter',
      };
    }
  }
  
  throw new Error('Invalid contact format. Please enter a valid Telegram username or Twitter/X URL.');
}
