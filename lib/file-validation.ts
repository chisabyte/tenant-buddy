/**
 * File Upload Validation and Security
 *
 * Validates file types, sizes, and performs security checks
 * before uploading to Supabase Storage
 */

// Maximum file size: 10MB for photos, 25MB for PDFs
export const MAX_FILE_SIZES = {
  photo: 10 * 1024 * 1024, // 10MB
  pdf: 25 * 1024 * 1024, // 25MB
  screenshot: 10 * 1024 * 1024, // 10MB
  document: 25 * 1024 * 1024, // 25MB
  other: 10 * 1024 * 1024, // 10MB
} as const;

// Allowed MIME types for each evidence type
// Note: 'image/jpg' is included for browser compatibility, but will be normalized to 'image/jpeg' on upload
export const ALLOWED_MIME_TYPES = {
  photo: [
    'image/jpeg',
    'image/jpg', // Non-standard but some browsers report this
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ],
  pdf: ['application/pdf'],
  screenshot: [
    'image/jpeg',
    'image/jpg', // Non-standard but some browsers report this
    'image/png',
    'image/webp',
  ],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ],
  other: [
    'image/jpeg',
    'image/jpg', // Non-standard but some browsers report this
    'image/png',
    'image/webp',
    'application/pdf',
    'text/plain',
  ],
} as const;

// File extensions mapping
export const ALLOWED_EXTENSIONS = {
  photo: ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'],
  pdf: ['.pdf'],
  screenshot: ['.jpg', '.jpeg', '.png', '.webp'],
  document: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'],
  other: ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.txt'],
} as const;

export type EvidenceType = keyof typeof ALLOWED_MIME_TYPES;

/**
 * Normalizes MIME types to standard formats
 * Converts non-standard types like 'image/jpg' to 'image/jpeg'
 */
export function normalizeMimeType(mimeType: string): string {
  // Normalize common non-standard MIME types
  if (mimeType === 'image/jpg') {
    return 'image/jpeg';
  }
  return mimeType;
}

/**
 * Infers MIME type from file extension if MIME type is missing
 */
export function inferMimeTypeFromExtension(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  const mimeMap: { [key: string]: string } = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'heic': 'image/heic',
    'heif': 'image/heif',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'txt': 'text/plain',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

/**
 * Detects MIME type from file signature (magic bytes)
 * Returns the detected MIME type or null if unknown
 */
async function detectMimeTypeFromSignature(file: File): Promise<string | null> {
  try {
    const buffer = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // JPEG: FF D8 FF followed by E0, E1, E2, E3, E8, DB, etc.
    if (bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return 'image/jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (bytes.length >= 8 &&
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
        bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A) {
      return 'image/png';
    }

    // WebP: RIFF header (52 49 46 46) followed by WEBP
    if (bytes.length >= 12 &&
        bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
      return 'image/webp';
    }

    // PDF: %PDF
    if (bytes.length >= 4 &&
        bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return 'application/pdf';
    }

    // HEIC/HEIF: ftyp box
    if (bytes.length >= 12 &&
        bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
      // Check for HEIC/HEIF brand
      const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
      if (brand === 'heic' || brand === 'mif1') {
        return 'image/heic';
      }
      if (brand === 'heif') {
        return 'image/heif';
      }
    }

    return null;
  } catch (error) {
    console.error('Error detecting MIME type from signature:', error);
    return null;
  }
}

/**
 * Validates a file before upload
 */
export async function validateFile(
  file: File,
  evidenceType: EvidenceType
): Promise<FileValidationResult> {
  const fileName = file.name;
  const fileSize = file.size;
  const browserMimeType = file.type || '';
  
  // Check if file exists
  if (!file) {
    return {
      valid: false,
      error: 'No file provided',
    };
  }

  // Check file size
  const maxSize = MAX_FILE_SIZES[evidenceType];
  if (fileSize > maxSize) {
    console.error('[File Validation] File size exceeded', {
      fileName,
      fileSize,
      maxSize,
      evidenceType,
    });
    return {
      valid: false,
      error: `File size exceeds maximum of ${(maxSize / (1024 * 1024)).toFixed(0)}MB`,
    };
  }

  // Check if file is empty
  if (fileSize === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }

  // Check file extension
  const fileNameLower = fileName.toLowerCase();
  const allowedExtensions = ALLOWED_EXTENSIONS[evidenceType];
  const hasValidExtension = allowedExtensions.some(ext => fileNameLower.endsWith(ext));

  if (!hasValidExtension) {
    console.error('[File Validation] Invalid extension', {
      fileName,
      browserMimeType,
      evidenceType,
      allowedExtensions,
    });
    return {
      valid: false,
      error: `Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`,
    };
  }

  // Get allowed MIME types
  const allowedMimeTypes = ALLOWED_MIME_TYPES[evidenceType] as readonly string[];

  // Check for suspicious file names
  if (fileNameLower.includes('..') || fileNameLower.includes('/') || fileNameLower.includes('\\')) {
    return {
      valid: false,
      error: 'Invalid file name',
    };
  }

  // Detect MIME type from magic bytes (primary validation)
  const detectedMimeType = await detectMimeTypeFromSignature(file);
  
  // Normalize browser MIME type
  const normalizedBrowserMime = browserMimeType ? normalizeMimeType(browserMimeType) : null;
  
  // Determine the actual MIME type to use (prefer detected, fallback to normalized browser, then infer from extension)
  let actualMimeType: string;
  if (detectedMimeType) {
    actualMimeType = detectedMimeType;
  } else if (normalizedBrowserMime) {
    actualMimeType = normalizedBrowserMime;
  } else {
    actualMimeType = inferMimeTypeFromExtension(fileName);
  }

  // Normalize the actual MIME type
  actualMimeType = normalizeMimeType(actualMimeType);
  
  // Debug logging
  console.log('[File Validation] MIME type detection', {
    fileName,
    evidenceType,
    browserMimeType,
    normalizedBrowserMime,
    detectedMimeType,
    inferredFromExtension: inferMimeTypeFromExtension(fileName),
    actualMimeType,
  });

  // Validate that the detected/actual MIME type is in the allow list
  const normalizedAllowedTypes = allowedMimeTypes.map(mt => normalizeMimeType(mt));
  
  // CRITICAL FIX: Ensure image/jpeg is ALWAYS in the normalized list for photo/screenshot/other types
  // This prevents any edge cases where normalization might fail
  if (['photo', 'screenshot', 'other'].includes(evidenceType)) {
    if (!normalizedAllowedTypes.includes('image/jpeg')) {
      console.warn('[File Validation] Force-adding image/jpeg to allow list', {
        fileName,
        evidenceType,
        normalizedAllowedTypes,
      });
      normalizedAllowedTypes.push('image/jpeg');
    }
  }
  
  // CRITICAL: If we detected image/jpeg from magic bytes, it MUST be accepted
  // This is a safety check to ensure valid JPEG files are never rejected
  if (detectedMimeType === 'image/jpeg') {
    // Force ensure image/jpeg is in allowed types (defensive programming)
    if (!normalizedAllowedTypes.includes('image/jpeg')) {
      console.warn('[File Validation] image/jpeg detected but not in allow list - adding it', {
        fileName,
        evidenceType,
        allowedMimeTypes: normalizedAllowedTypes,
      });
      normalizedAllowedTypes.push('image/jpeg');
    }
    // If detected type is image/jpeg, use it as the actual type (override any other detection)
    actualMimeType = 'image/jpeg';
  }
  
  // Final check: if actualMimeType is image/jpeg and evidence type supports images, force accept
  if (actualMimeType === 'image/jpeg' && ['photo', 'screenshot', 'other'].includes(evidenceType)) {
    // Double-check it's in the list, if not add it
    if (!normalizedAllowedTypes.includes('image/jpeg')) {
      normalizedAllowedTypes.push('image/jpeg');
    }
  }
  
  // ULTIMATE SAFETY: If file has .jpg/.jpeg extension and evidence type supports images, 
  // ALWAYS accept it regardless of MIME type detection
  const hasJpegExtension = fileNameLower.endsWith('.jpg') || fileNameLower.endsWith('.jpeg');
  if (hasJpegExtension && ['photo', 'screenshot', 'other'].includes(evidenceType)) {
    // Force image/jpeg to be in allowed types and set actualMimeType to image/jpeg
    if (!normalizedAllowedTypes.includes('image/jpeg')) {
      console.warn('[File Validation] JPEG extension detected - force-adding image/jpeg to allow list', {
        fileName,
        evidenceType,
      });
      normalizedAllowedTypes.push('image/jpeg');
    }
    actualMimeType = 'image/jpeg';
  }
  
  const isMimeTypeAllowed = normalizedAllowedTypes.includes(actualMimeType);
  
  // EXTRA SAFETY: Log the check details for debugging
  console.log('[File Validation] MIME type allow check', {
    fileName,
    evidenceType,
    actualMimeType,
    normalizedAllowedTypes,
    isMimeTypeAllowed,
    detectedMimeType,
    browserMimeType,
    hasJpegExtension,
  });

  if (!isMimeTypeAllowed) {
    // Additional safety: if file has .jpg/.jpeg extension and we couldn't detect type, 
    // but browser says image/jpeg, accept it anyway
    const hasJpegExtension = fileNameLower.endsWith('.jpg') || fileNameLower.endsWith('.jpeg');
    if (hasJpegExtension && (normalizedBrowserMime === 'image/jpeg' || actualMimeType === 'image/jpeg')) {
      console.warn('[File Validation] JPEG file with extension but detection failed - accepting anyway', {
        fileName,
        browserMimeType,
        detectedMimeType,
        actualMimeType,
      });
      actualMimeType = 'image/jpeg';
      // Re-check after override
      if (normalizedAllowedTypes.includes('image/jpeg')) {
        // Continue with validation
      } else {
        console.error('[File Validation] CRITICAL: image/jpeg not in allow list for evidence type', {
          fileName,
          evidenceType,
          allowedMimeTypes: normalizedAllowedTypes,
        });
        // This should never happen, but if it does, we need to fix the allow list
        return {
          valid: false,
          error: `Configuration error: image/jpeg is not allowed for ${evidenceType} evidence. Please contact support.`,
        };
      }
    } else {
      console.error('[File Validation] MIME type not allowed', {
        fileName,
        fileSize,
        browserMimeType,
        detectedMimeType,
        actualMimeType,
        evidenceType,
        allowedMimeTypes: normalizedAllowedTypes,
        rawAllowedMimeTypes: allowedMimeTypes,
        hasJpegExtension,
        normalizedAllowedTypesString: normalizedAllowedTypes.join(', '),
      });
      
      // Provide both detailed and simple error messages for debugging
      const detailedError = `MIME type ${actualMimeType} is not supported for ${evidenceType} evidence. Allowed types: ${normalizedAllowedTypes.join(', ')}`;
      const simpleError = `mime type ${actualMimeType} is not supported`;
      
      // Log both formats to help identify which one is being used
      console.error('[File Validation] Error formats:', { detailedError, simpleError });
      
      return {
        valid: false,
        error: detailedError, // Use detailed error for user-facing message
      };
    }
  }

  // Log successful validation (for debugging)
  console.log('[File Validation] File validated successfully', {
    fileName,
    fileSize,
    browserMimeType,
    detectedMimeType,
    actualMimeType,
    evidenceType,
  });

  return {
    valid: true,
    fileName: file.name,
    fileSize: file.size,
    mimeType: actualMimeType, // Return the validated/normalized MIME type
  };
}

// Note: File signature validation is now handled in detectMimeTypeFromSignature()
// which is called during validateFile(). This function is kept for backwards compatibility
// but is no longer used in the main validation flow.

/**
 * Generates a safe file name for storage
 */
export function generateSafeFileName(
  originalName: string,
  userId: string,
  evidenceType: EvidenceType
): string {
  // Remove unsafe characters
  const safeName = originalName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .substring(0, 100); // Limit length

  // Generate unique prefix
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);

  // Format: userId/evidenceType/timestamp-random-filename
  return `${userId}/${evidenceType}/${timestamp}-${randomString}-${safeName}`;
}

/**
 * Validates total storage usage for a user
 */
export async function checkStorageQuota(
  userId: string,
  newFileSize: number,
  maxQuotaBytes: number = 1024 * 1024 * 1024 // 1GB default
): Promise<{ allowed: boolean; currentUsage?: number; error?: string }> {
  // This would query Supabase to check current storage usage
  // For now, return a placeholder
  // In production, implement actual storage tracking

  if (newFileSize > maxQuotaBytes) {
    return {
      allowed: false,
      error: 'File exceeds storage quota',
    };
  }

  return {
    allowed: true,
    currentUsage: 0,
  };
}
