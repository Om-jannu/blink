/**
 * File name validation utilities
 */

export interface FileNameValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a file name for database compatibility and security
 * @param fileName - The file name to validate
 * @returns Validation result with error message if invalid
 */
export function validateFileName(fileName: string): FileNameValidationResult {
  // Check if file name is empty
  if (!fileName || fileName.trim().length === 0) {
    return {
      isValid: false,
      error: 'File name cannot be empty'
    };
  }

  // Check file name length (max 255 characters for database compatibility)
  if (fileName.length > 255) {
    return {
      isValid: false,
      error: 'File name is too long. Please rename the file to be shorter than 255 characters.'
    };
  }

  // Check for invalid characters (basic security validation)
  // Allow: letters, numbers, dots, hyphens, underscores, spaces, parentheses, brackets
  const validFileNameRegex = /^[a-zA-Z0-9._\-\s()\[\]]+$/;
  if (!validFileNameRegex.test(fileName)) {
    return {
      isValid: false,
      error: 'File name contains invalid characters. Please use only letters, numbers, dots, hyphens, underscores, spaces, parentheses, and brackets.'
    };
  }

  // Check for dangerous file extensions (basic security)
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.vbs', '.js', '.jar'];
  const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  if (dangerousExtensions.includes(fileExtension)) {
    return {
      isValid: false,
      error: 'This file type is not allowed for security reasons. Please choose a different file.'
    };
  }

  // Check for reserved names (Windows reserved names)
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  const fileNameWithoutExtension = fileName.split('.')[0].toUpperCase();
  if (reservedNames.includes(fileNameWithoutExtension)) {
    return {
      isValid: false,
      error: 'This file name is reserved and cannot be used. Please choose a different name.'
    };
  }

  return {
    isValid: true
  };
}

/**
 * Sanitizes a file name by removing or replacing invalid characters
 * @param fileName - The file name to sanitize
 * @returns Sanitized file name
 */
export function sanitizeFileName(fileName: string): string {
  // Remove or replace invalid characters
  let sanitized = fileName
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters with underscore
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Remove leading/trailing spaces

  // Ensure it's not empty after sanitization
  if (!sanitized) {
    sanitized = 'file';
  }

  // Truncate if too long
  if (sanitized.length > 255) {
    const extension = sanitized.substring(sanitized.lastIndexOf('.'));
    const nameWithoutExtension = sanitized.substring(0, sanitized.lastIndexOf('.'));
    sanitized = nameWithoutExtension.substring(0, 255 - extension.length) + extension;
  }

  return sanitized;
}

/**
 * Gets a safe file name by sanitizing and ensuring uniqueness
 * @param fileName - The original file name
 * @param existingNames - Array of existing file names to avoid duplicates
 * @returns Safe file name
 */
export function getSafeFileName(fileName: string, existingNames: string[] = []): string {
  let safeName = sanitizeFileName(fileName);
  
  // Check if name already exists and add a number suffix if needed
  let counter = 1;
  const extension = safeName.substring(safeName.lastIndexOf('.'));
  const nameWithoutExtension = safeName.substring(0, safeName.lastIndexOf('.'));
  
  while (existingNames.includes(safeName)) {
    safeName = `${nameWithoutExtension}_${counter}${extension}`;
    counter++;
  }
  
  return safeName;
}
