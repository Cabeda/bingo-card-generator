import {
  FileValidationErrorCode,
  getUserFriendlyErrorMessage,
  sanitizeFilename,
  validateBingoCardsFile,
  validateCardStructure,
  validateFileContent,
  validateFileSize,
  validateFileType
} from './fileValidation';

describe('fileValidation', () => {
  describe('validateFileSize', () => {
    it('should accept files within size limits', () => {
      const file = new File(['test content'], 'test.bingoCards', { type: 'text/plain' });
      const result = validateFileSize(file);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject files larger than 5MB', () => {
      const largeContent = 'x'.repeat(6 * 1024 * 1024); // 6MB
      const file = new File([largeContent], 'large.bingoCards', { type: 'text/plain' });
      const result = validateFileSize(file);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(FileValidationErrorCode.FILE_TOO_LARGE);
      expect(result.error?.message).toContain('5MB');
    });

    it('should reject empty files', () => {
      const file = new File([], 'empty.bingoCards', { type: 'text/plain' });
      const result = validateFileSize(file);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(FileValidationErrorCode.EMPTY_FILE);
    });
  });

  describe('validateFileType', () => {
    it('should accept .bingoCards files', () => {
      const file = new File(['content'], 'test.bingoCards', { type: 'text/plain' });
      const result = validateFileType(file);
      expect(result.isValid).toBe(true);
    });

    it('should accept .bingoCards files with application/octet-stream MIME type', () => {
      const file = new File(['content'], 'test.bingoCards', { type: 'application/octet-stream' });
      const result = validateFileType(file);
      expect(result.isValid).toBe(true);
    });

    it('should accept .bingoCards files with empty MIME type', () => {
      const file = new File(['content'], 'test.bingoCards', { type: '' });
      const result = validateFileType(file);
      expect(result.isValid).toBe(true);
    });

    it('should reject files without .bingoCards extension', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = validateFileType(file);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(FileValidationErrorCode.INVALID_FORMAT);
    });

    it('should reject files with wrong MIME type', () => {
      const file = new File(['content'], 'test.bingoCards', { type: 'image/png' });
      const result = validateFileType(file);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(FileValidationErrorCode.INVALID_MIME_TYPE);
    });
  });

  describe('sanitizeFilename', () => {
    it('should preserve alphanumeric characters, dots and hyphens', () => {
      expect(sanitizeFilename('test-file.bingoCards')).toBe('test-file.bingoCards');
      expect(sanitizeFilename('File123.bingoCards')).toBe('File123.bingoCards');
    });

    it('should replace special characters with underscores', () => {
      expect(sanitizeFilename('test@file#.bingoCards')).toBe('test_file_.bingoCards');
      expect(sanitizeFilename('test file.bingoCards')).toBe('test_file.bingoCards');
    });

    it('should prevent directory traversal attacks', () => {
      expect(sanitizeFilename('../../../etc/passwd')).toBe('._._._etc_passwd');
      expect(sanitizeFilename('..file.bingoCards')).toBe('.file.bingoCards');
    });

    it('should limit filename length to 255 characters', () => {
      const longName = 'a'.repeat(300);
      const sanitized = sanitizeFilename(longName);
      expect(sanitized.length).toBeLessThanOrEqual(255);
    });

    it('should handle Unicode characters', () => {
      expect(sanitizeFilename('test-файл-文件.bingoCards')).toBe('test-____-__.bingoCards');
    });

    it('should handle filenames with multiple dots', () => {
      expect(sanitizeFilename('test...bingoCards')).toBe('test.bingoCards');
      expect(sanitizeFilename('test....bingoCards')).toBe('test.bingoCards');
    });

    it('should handle empty filename', () => {
      expect(sanitizeFilename('')).toBe('');
    });

    it('should handle filename with only special characters', () => {
      expect(sanitizeFilename('@#$%^&*()')).toBe('_________');
    });
  });

  describe('validateFileContent', () => {
    it('should accept valid content starting with |CardNo.', () => {
      const content = '|CardNo.1;1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16;17;18;19;20;21;22;23;24;25;26;27';
      const result = validateFileContent(content);
      expect(result.isValid).toBe(true);
    });

    it('should reject content not starting with |CardNo.', () => {
      const content = 'CardNo.1;1;2;3';
      const result = validateFileContent(content);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(FileValidationErrorCode.INVALID_FORMAT);
      expect(result.error?.message).toContain('Missing CardNo prefix');
    });

    it('should detect script tags', () => {
      const content = '|CardNo.1;<script>alert("xss")</script>;2;3';
      const result = validateFileContent(content);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(FileValidationErrorCode.MALICIOUS_CONTENT);
    });

    it('should detect javascript: protocol', () => {
      const content = '|CardNo.1;javascript:alert(1);2;3';
      const result = validateFileContent(content);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(FileValidationErrorCode.MALICIOUS_CONTENT);
    });

    it('should detect event handlers', () => {
      const content = '|CardNo.1;onclick=alert(1);2;3';
      const result = validateFileContent(content);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(FileValidationErrorCode.MALICIOUS_CONTENT);
    });

    it('should detect iframe tags', () => {
      const content = '|CardNo.1;<iframe src="evil.com"></iframe>;2;3';
      const result = validateFileContent(content);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(FileValidationErrorCode.MALICIOUS_CONTENT);
    });

    it('should detect object tags', () => {
      const content = '|CardNo.1;<object data="evil.com"></object>;2;3';
      const result = validateFileContent(content);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(FileValidationErrorCode.MALICIOUS_CONTENT);
    });

    it('should detect embed tags', () => {
      const content = '|CardNo.1;<embed src="evil.com">;2;3';
      const result = validateFileContent(content);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(FileValidationErrorCode.MALICIOUS_CONTENT);
    });

    it('should detect data URLs with HTML', () => {
      const content = '|CardNo.1;data:text/html,<script>alert(1)</script>;2;3';
      const result = validateFileContent(content);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(FileValidationErrorCode.MALICIOUS_CONTENT);
    });
  });

  describe('validateCardStructure', () => {
    it('should accept valid single card structure', () => {
      // Valid card with 27 numbers (some empty)
      const content = '|CardNo.1;1;;3;;5;6;;8;9;10;;12;;14;15;;17;18;19;;21;;23;24;;26;27';
      const result = validateCardStructure(content);
      expect(result.isValid).toBe(true);
    });

    it('should accept valid multiple card structure', () => {
      const content = '|CardNo.1;1;;3;;5;6;;8;9;10;;12;;14;15;;17;18;19;;21;;23;24;;26;27|CardNo.2;2;;4;;6;7;;9;10;11;;13;;15;16;;18;19;20;;22;;24;25;;27;28';
      const result = validateCardStructure(content);
      expect(result.isValid).toBe(true);
    });

    it('should reject empty content', () => {
      const content = '|CardNo.';
      const result = validateCardStructure(content);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(FileValidationErrorCode.INVALID_STRUCTURE);
    });

    it('should reject cards with too few numbers', () => {
      const content = '|CardNo.1;1;2;3;4;5'; // Only 5 numbers instead of 27
      const result = validateCardStructure(content);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(FileValidationErrorCode.INVALID_STRUCTURE);
    });

    it('should reject cards with too many numbers', () => {
      const content = '|CardNo.1;1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16;17;18;19;20;21;22;23;24;25;26;27;28;29;30'; // 30 numbers
      const result = validateCardStructure(content);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(FileValidationErrorCode.INVALID_STRUCTURE);
    });

    it('should reject cards with invalid CardNo format', () => {
      const content = '|Card.1;1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16;17;18;19;20;21;22;23;24;25;26;27'; // Missing "No."
      const result = validateCardStructure(content);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(FileValidationErrorCode.INVALID_STRUCTURE);
    });

    it('should reject cards with invalid number values', () => {
      const content = '|CardNo.1;1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16;17;18;19;20;21;22;23;24;25;26;abc'; // "abc" is not a number
      const result = validateCardStructure(content);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(FileValidationErrorCode.INVALID_STRUCTURE);
    });

    it('should reject cards with numbers out of range', () => {
      const content = '|CardNo.1;1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16;17;18;19;20;21;22;23;24;25;26;91'; // 91 is out of range
      const result = validateCardStructure(content);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(FileValidationErrorCode.INVALID_STRUCTURE);
    });

    it('should accept cards with empty cells', () => {
      const content = '|CardNo.1;;;;;;;;;;;;;;;;;;;;;;;;;;;'; // All empty (27 semicolons)
      const result = validateCardStructure(content);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateBingoCardsFile', () => {
    it('should pass all validations for a valid file', () => {
      const content = '|CardNo.1;1;;3;;5;6;;8;9;10;;12;;14;15;;17;18;19;;21;;23;24;;26;27';
      const file = new File([content], 'test.bingoCards', { type: 'text/plain' });
      const result = validateBingoCardsFile(file, content);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail on file size validation', () => {
      const content = '|CardNo.1;1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16;17;18;19;20;21;22;23;24;25;26;27';
      const largeContent = 'x'.repeat(6 * 1024 * 1024);
      const file = new File([largeContent], 'test.bingoCards', { type: 'text/plain' });
      const result = validateBingoCardsFile(file, content);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(FileValidationErrorCode.FILE_TOO_LARGE);
    });

    it('should fail on file type validation', () => {
      const content = '|CardNo.1;1;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16;17;18;19;20;21;22;23;24;25;26;27';
      const file = new File([content], 'test.txt', { type: 'text/plain' });
      const result = validateBingoCardsFile(file, content);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(FileValidationErrorCode.INVALID_FORMAT);
    });

    it('should fail on content validation', () => {
      const content = '|CardNo.1;<script>alert(1)</script>;2;3;4;5;6;7;8;9;10;11;12;13;14;15;16;17;18;19;20;21;22;23;24;25;26;27';
      const file = new File([content], 'test.bingoCards', { type: 'text/plain' });
      const result = validateBingoCardsFile(file, content);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(FileValidationErrorCode.MALICIOUS_CONTENT);
    });

    it('should fail on structure validation', () => {
      const content = '|CardNo.1;1;2;3'; // Too few numbers
      const file = new File([content], 'test.bingoCards', { type: 'text/plain' });
      const result = validateBingoCardsFile(file, content);
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(FileValidationErrorCode.INVALID_STRUCTURE);
    });

    it('should handle multiple valid cards', () => {
      const content = '|CardNo.1;1;;3;;5;6;;8;9;10;;12;;14;15;;17;18;19;;21;;23;24;;26;27|CardNo.2;2;;4;;6;7;;9;10;11;;13;;15;16;;18;19;20;;22;;24;25;;27;28';
      const file = new File([content], 'test.bingoCards', { type: 'text/plain' });
      const result = validateBingoCardsFile(file, content);
      expect(result.isValid).toBe(true);
    });
  });

  describe('getUserFriendlyErrorMessage', () => {
    it('should return user-friendly message for FILE_TOO_LARGE', () => {
      const error = {
        code: FileValidationErrorCode.FILE_TOO_LARGE,
        message: 'File too large'
      };
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toContain('too large');
      expect(message).toContain('5MB');
    });

    it('should return user-friendly message for EMPTY_FILE', () => {
      const error = {
        code: FileValidationErrorCode.EMPTY_FILE,
        message: 'File is empty'
      };
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toContain('empty');
    });

    it('should return user-friendly message for INVALID_FORMAT', () => {
      const error = {
        code: FileValidationErrorCode.INVALID_FORMAT,
        message: 'Invalid format'
      };
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toContain('.bingoCards');
    });

    it('should return user-friendly message for MALICIOUS_CONTENT', () => {
      const error = {
        code: FileValidationErrorCode.MALICIOUS_CONTENT,
        message: 'Malicious content'
      };
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toContain('suspicious content');
    });

    it('should return user-friendly message for INVALID_STRUCTURE', () => {
      const error = {
        code: FileValidationErrorCode.INVALID_STRUCTURE,
        message: 'Invalid structure'
      };
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toContain('invalid structure');
    });

    it('should return user-friendly message for INVALID_MIME_TYPE', () => {
      const error = {
        code: FileValidationErrorCode.INVALID_MIME_TYPE,
        message: 'Invalid MIME type'
      };
      const message = getUserFriendlyErrorMessage(error);
      expect(message).toContain('.bingoCards');
    });
  });
});
