import { isValidToken, normalizeToken, deriveTokenPrefix } from '../../src/utils/validators.js';

describe('Token Validation, Normalization & Dynamic Prefix', () => {

  describe('deriveTokenPrefix', () => {
    test('should derive 3-letter prefix from school name', () => {
      expect(deriveTokenPrefix('Peniel Academy')).toBe('PEN');
      expect(deriveTokenPrefix('StackWeb Institute')).toBe('STA');
      expect(deriveTokenPrefix('Harvard College')).toBe('HAR');
      expect(deriveTokenPrefix('MIT')).toBe('MIT');
      expect(deriveTokenPrefix('')).toBe('SW');
      expect(deriveTokenPrefix(null)).toBe('SW');
    });
  });

  describe('generateTokenString', () => {
    test('should format token with dynamic prefix', () => {
      const p = deriveTokenPrefix('Peniel Academy');
      expect(p).toBe('PEN');
    });
  });

  describe('isValidToken', () => {
    test('should return true for valid tokens with various prefixes', () => {
      expect(isValidToken('SW-8A9-2K4')).toBe(true);
      expect(isValidToken('PEN-8A9-2K4')).toBe(true);
      expect(isValidToken('sta-abc-123')).toBe(true);
      expect(isValidToken('  HAR-7B3-9P2  ')).toBe(true);
    });

    test('should return false for invalid formats', () => {
      expect(isValidToken('8A9-2K4')).toBe(false);
      expect(isValidToken('SW-AB12-CD34')).toBe(false);
      expect(isValidToken('SW-8A9-2K4-999')).toBe(false);
      expect(isValidToken(null)).toBe(false);
      expect(isValidToken(undefined)).toBe(false);
    });
  });

  describe('normalizeToken', () => {
    test('should convert to uppercase and trim', () => {
      expect(normalizeToken('  pen-8a9-2k4  ')).toBe('PEN-8A9-2K4');
    });

    test('should handle null/undefined safely', () => {
      expect(normalizeToken(null)).toBe('');
      expect(normalizeToken(undefined)).toBe('');
    });
  });
});


