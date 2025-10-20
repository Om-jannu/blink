import { validateFileName, sanitizeFileName, getSafeFileName } from '../validation';

describe('File Name Validation', () => {
  describe('validateFileName', () => {
    it('should accept valid file names', () => {
      const validNames = [
        'document.pdf',
        'image.jpg',
        'my-file.txt',
        'file with spaces.doc',
        'file(with)parentheses.pdf',
        'file[with]brackets.txt',
        'very-long-filename-that-is-still-under-255-characters.pdf'
      ];

      validNames.forEach(name => {
        const result = validateFileName(name);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject empty file names', () => {
      const result = validateFileName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should reject file names that are too long', () => {
      const longName = 'a'.repeat(256); // 256 characters
      const result = validateFileName(longName);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should reject file names with invalid characters', () => {
      const invalidNames = [
        'file<with>invalid:chars',
        'file/with\\backslashes',
        'file|with|pipes',
        'file?with?question',
        'file*with*asterisks',
        'file"with"quotes'
      ];

      invalidNames.forEach(name => {
        const result = validateFileName(name);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('invalid characters');
      });
    });

    it('should reject dangerous file extensions', () => {
      const dangerousFiles = [
        'malware.exe',
        'script.bat',
        'virus.cmd',
        'trojan.scr',
        'payload.vbs',
        'malicious.js'
      ];

      dangerousFiles.forEach(name => {
        const result = validateFileName(name);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('not allowed');
      });
    });

    it('should reject reserved Windows names', () => {
      const reservedNames = [
        'CON.txt',
        'PRN.pdf',
        'AUX.doc',
        'NUL.jpg',
        'COM1.txt',
        'LPT1.pdf'
      ];

      reservedNames.forEach(name => {
        const result = validateFileName(name);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('reserved');
      });
    });
  });

  describe('sanitizeFileName', () => {
    it('should replace invalid characters with underscores', () => {
      expect(sanitizeFileName('file<with>invalid:chars')).toBe('file_with_invalid_chars');
      expect(sanitizeFileName('file/with\\backslashes')).toBe('file_with_backslashes');
    });

    it('should handle multiple spaces', () => {
      expect(sanitizeFileName('file   with   spaces')).toBe('file with spaces');
    });

    it('should trim leading and trailing spaces', () => {
      expect(sanitizeFileName('  file.txt  ')).toBe('file.txt');
    });

    it('should provide default name for empty input', () => {
      expect(sanitizeFileName('')).toBe('file');
      expect(sanitizeFileName('   ')).toBe('file');
    });

    it('should truncate long names', () => {
      const longName = 'a'.repeat(300);
      const sanitized = sanitizeFileName(longName);
      expect(sanitized.length).toBeLessThanOrEqual(255);
    });
  });

  describe('getSafeFileName', () => {
    it('should return original name if not in existing names', () => {
      const result = getSafeFileName('document.pdf', []);
      expect(result).toBe('document.pdf');
    });

    it('should add number suffix for duplicate names', () => {
      const existing = ['document.pdf', 'document_1.pdf'];
      const result = getSafeFileName('document.pdf', existing);
      expect(result).toBe('document_2.pdf');
    });

    it('should handle multiple duplicates', () => {
      const existing = ['file.txt', 'file_1.txt', 'file_2.txt'];
      const result = getSafeFileName('file.txt', existing);
      expect(result).toBe('file_3.txt');
    });

    it('should sanitize before checking duplicates', () => {
      const existing = ['file_with_invalid_chars.txt'];
      const result = getSafeFileName('file<with>invalid:chars.txt', existing);
      expect(result).toBe('file_with_invalid_chars_1.txt');
    });
  });
});
