/**
 * File validation utilities for secure file upload handling
 */

// File size constraints
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MIN_FILE_SIZE = 1; // 1 byte

// Allowed file types
const ALLOWED_EXTENSIONS = ['.bingoCards'];
const ALLOWED_MIME_TYPES = ['text/plain', 'application/octet-stream', '']; // Empty string for when browser doesn't set MIME type

/**
 * Error codes for file validation
 */
export enum FileValidationErrorCode {
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  EMPTY_FILE = 'EMPTY_FILE',
  INVALID_FORMAT = 'INVALID_FORMAT',
  MALICIOUS_CONTENT = 'MALICIOUS_CONTENT',
  INVALID_STRUCTURE = 'INVALID_STRUCTURE',
  INVALID_MIME_TYPE = 'INVALID_MIME_TYPE'
}

/**
 * Validation error with code and details
 */
export interface FileValidationError {
  code: FileValidationErrorCode;
  message: string;
  details?: string;
}

/**
 * Validation result
 */
export interface FileValidationResult {
  isValid: boolean;
  error?: FileValidationError;
}

/**
 * Validates file size is within acceptable limits
 */
export function validateFileSize(file: File): FileValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: {
        code: FileValidationErrorCode.FILE_TOO_LARGE,
        message: 'File too large. Maximum size is 5MB',
        details: `File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
      }
    };
  }

  if (file.size < MIN_FILE_SIZE) {
    return {
      isValid: false,
      error: {
        code: FileValidationErrorCode.EMPTY_FILE,
        message: 'File is empty',
        details: `File size: ${file.size} bytes`
      }
    };
  }

  return { isValid: true };
}

/**
 * Validates file type (extension and MIME type)
 */
export function validateFileType(file: File): FileValidationResult {
  // Check extension
  const extension = file.name.substring(file.name.lastIndexOf('.'));
  
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      isValid: false,
      error: {
        code: FileValidationErrorCode.INVALID_FORMAT,
        message: 'Only .bingoCards files are allowed',
        details: `File extension: ${extension}`
      }
    };
  }

  // Check MIME type (allow empty string as browsers may not set it)
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: {
        code: FileValidationErrorCode.INVALID_MIME_TYPE,
        message: 'Invalid file type',
        details: `MIME type: ${file.type}`
      }
    };
  }

  return { isValid: true };
}

/**
 * Sanitizes filename by removing dangerous characters
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .replace(/\.{2,}/g, '.') // Prevent directory traversal (..)
    .substring(0, 255); // Limit length
}

/**
 * Checks content for malicious patterns
 */
export function validateFileContent(content: string): FileValidationResult {
  // Validate that file starts with CardNo prefix
  if (!content.startsWith('|CardNo.')) {
    return {
      isValid: false,
      error: {
        code: FileValidationErrorCode.INVALID_FORMAT,
        message: 'Invalid file format: Missing CardNo prefix',
        details: 'File must start with |CardNo.'
      }
    };
  }

  // Check for potentially malicious content
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick, onerror
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /data:text\/html/i
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(content)) {
      return {
        isValid: false,
        error: {
          code: FileValidationErrorCode.MALICIOUS_CONTENT,
          message: 'File contains potentially malicious content',
          details: `Matched pattern: ${pattern.source}`
        }
      };
    }
  }

  return { isValid: true };
}

/**
 * Validates the structure of a single card
 */
function isValidCardStructure(cardContent: string): boolean {
  // Card should have format: CardNo.{number};{27 numbers or empty strings separated by semicolons}
  const parts = cardContent.split(';');
  
  // First part should be CardNo.{number}
  if (!parts[0] || !parts[0].match(/^CardNo\.\d+$/)) {
    return false;
  }
  
  // Should have 27 numbers (including empty cells) after CardNo
  // Total parts = 1 (CardNo) + 27 (numbers) = 28
  if (parts.length !== 28) {
    return false;
  }
  
  // Each number part should be either empty or a valid number
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    // Allow empty strings or numbers
    if (part !== '' && (isNaN(Number(part)) || Number(part) < 0 || Number(part) > 90)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validates card structure in the file content
 */
export function validateCardStructure(content: string): FileValidationResult {
  // Split by |CardNo to get individual cards (skip first empty element)
  const cards = content.split('|CardNo.').slice(1);
  
  if (cards.length === 0) {
    return {
      isValid: false,
      error: {
        code: FileValidationErrorCode.INVALID_STRUCTURE,
        message: 'No valid cards found in file',
        details: 'File must contain at least one card'
      }
    };
  }

  // Validate each card
  for (let i = 0; i < cards.length; i++) {
    const cardContent = `CardNo.${cards[i]}`;
    if (!isValidCardStructure(cardContent)) {
      return {
        isValid: false,
        error: {
          code: FileValidationErrorCode.INVALID_STRUCTURE,
          message: `Invalid card structure at position ${i + 1}`,
          details: 'Each card must have exactly 27 number positions'
        }
      };
    }
  }

  return { isValid: true };
}

/**
 * Performs complete file validation (all checks)
 */
export function validateBingoCardsFile(file: File, content: string): FileValidationResult {
  // Step 1: Validate file size
  const sizeResult = validateFileSize(file);
  if (!sizeResult.isValid) {
    return sizeResult;
  }

  // Step 2: Validate file type
  const typeResult = validateFileType(file);
  if (!typeResult.isValid) {
    return typeResult;
  }

  // Step 3: Validate content for malicious patterns
  const contentResult = validateFileContent(content);
  if (!contentResult.isValid) {
    return contentResult;
  }

  // Step 4: Validate card structure
  const structureResult = validateCardStructure(content);
  if (!structureResult.isValid) {
    return structureResult;
  }

  return { isValid: true };
}

/**
 * Gets user-friendly error message for validation error code
 */
export function getUserFriendlyErrorMessage(error: FileValidationError): string {
  const userMessages: Record<FileValidationErrorCode, string> = {
    [FileValidationErrorCode.FILE_TOO_LARGE]: 
      'Your file is too large. Please use a file smaller than 5MB.',
    [FileValidationErrorCode.EMPTY_FILE]: 
      'This file appears to be empty. Please check your file and try again.',
    [FileValidationErrorCode.INVALID_FORMAT]: 
      'This file format is not supported. Please upload a .bingoCards file.',
    [FileValidationErrorCode.MALICIOUS_CONTENT]: 
      'This file contains suspicious content and cannot be uploaded.',
    [FileValidationErrorCode.INVALID_STRUCTURE]: 
      'This file has an invalid structure. Please check the file format.',
    [FileValidationErrorCode.INVALID_MIME_TYPE]: 
      'Invalid file type. Please upload a .bingoCards file.'
  };

  return userMessages[error.code] || 'An unknown error occurred while validating the file.';
}
