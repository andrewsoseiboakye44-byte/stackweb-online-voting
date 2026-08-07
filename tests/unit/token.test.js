import { isValidToken, normalizeToken } from '../../src/utils/validators.js';

describe('Token Validation & Normalization', () => {

  describe('isValidToken', () => {
    test('should return true for valid tokens', () => {
      expect(isValidToken('SW-8A9-2K4')).toBe(true);
      expect(isValidToken('sw-abc-123')).toBe(true);
      expect(isValidToken('  SW-7B3-9P2  ')).toBe(true);
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
      expect(normalizeToken('  sw-8a9-2k4  ')).toBe('SW-8A9-2K4');
    });

    test('should handle null/undefined safely', () => {
      expect(normalizeToken(null)).toBe('');
      expect(normalizeToken(undefined)).toBe('');
    });
  });
});


