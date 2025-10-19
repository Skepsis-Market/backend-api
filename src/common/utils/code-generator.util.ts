/**
 * Generate a unique 6-character access code
 * 
 * Character set: A-Z, 2-9 (excluding ambiguous chars: O, 0, I, 1)
 * Total possibilities: 32^6 = ~1 billion combinations
 * 
 * Example: K9MX4P, AB5TGH, PQRS67
 */
export function generateAccessCode(): string {
  // Exclude ambiguous characters: O, 0, I, 1
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const length = 6;
  
  let code = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }
  
  return code;
}

/**
 * Generate multiple unique access codes
 * Note: This doesn't check database, just ensures no duplicates in the batch
 */
export function generateUniqueAccessCodes(count: number): string[] {
  const codes = new Set<string>();
  
  while (codes.size < count) {
    codes.add(generateAccessCode());
  }
  
  return Array.from(codes);
}
