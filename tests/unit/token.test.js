import { isValidToken, normalizeToken } from '../../src/utils/validators.js';

describe('Token Validation & Normalization', () => {

  describe('isValidToken', () => {
    test('should return true for valid tokens', () => {
      expect(isValidToken('SW-AB12-CD34-EF56')).toBe(true);
      expect(isValidToken('sw-abcd-efgh-ijkl')).toBe(true);
      expect(isValidToken('  SW-AB12-CD34-EF56  ')).toBe(true);
    });

    test('should return false for invalid formats', () => {
      expect(isValidToken('AB12-CD34-EF56')).toBe(false);
      expect(isValidToken('SW-AB12-CD34')).toBe(false);
      expect(isValidToken('SW-AB12-CD34-EF56-GH78')).toBe(false);
      expect(isValidToken(null)).toBe(false);
      expect(isValidToken(undefined)).toBe(false);
    });
  });

  describe('normalizeToken', () => {
    test('should convert to uppercase and trim', () => {
      expect(normalizeToken('  sw-ab12-cd34-ef56  ')).toBe('SW-AB12-CD34-EF56');
    });

    test('should handle null/undefined safely', () => {
      expect(normalizeToken(null)).toBe('');
      expect(normalizeToken(undefined)).toBe('');
    });
  });
});


