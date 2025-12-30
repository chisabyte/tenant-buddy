/**
 * File Validation Tests
 * 
 * Tests to verify file validation works correctly, especially for JPEG files
 * Run with: npm test or pnpm test
 */

import { validateFile, normalizeMimeType, inferMimeTypeFromExtension } from '../file-validation';

// Mock File constructor for testing
function createMockFile(
  name: string,
  content: Uint8Array,
  mimeType: string = ''
): File {
  const blob = new Blob([content], { type: mimeType });
  return Object.assign(blob, {
    name,
    lastModified: Date.now(),
  }) as File;
}

describe('File Validation', () => {
  describe('normalizeMimeType', () => {
    it('should normalize image/jpg to image/jpeg', () => {
      expect(normalizeMimeType('image/jpg')).toBe('image/jpeg');
    });

    it('should keep image/jpeg as is', () => {
      expect(normalizeMimeType('image/jpeg')).toBe('image/jpeg');
    });
  });

  describe('inferMimeTypeFromExtension', () => {
    it('should infer image/jpeg from .jpg extension', () => {
      expect(inferMimeTypeFromExtension('photo.jpg')).toBe('image/jpeg');
    });

    it('should infer image/jpeg from .jpeg extension', () => {
      expect(inferMimeTypeFromExtension('photo.jpeg')).toBe('image/jpeg');
    });

    it('should infer image/png from .png extension', () => {
      expect(inferMimeTypeFromExtension('photo.png')).toBe('image/png');
    });
  });

  describe('validateFile - JPEG files', () => {
    it('should accept a valid JPEG file with FF D8 FF E0 header', async () => {
      // JPEG with standard JFIF header (FF D8 FF E0)
      const jpegBytes = new Uint8Array([
        0xFF, 0xD8, 0xFF, 0xE0, // JPEG signature + JFIF marker
        0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, // JFIF identifier
        0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, // Rest of header
      ]);
      const file = createMockFile('test.jpg', jpegBytes, 'image/jpeg');
      
      const result = await validateFile(file, 'photo');
      expect(result.valid).toBe(true);
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should accept a valid JPEG file with FF D8 FF E1 header (EXIF)', async () => {
      // JPEG with EXIF header (FF D8 FF E1)
      const jpegBytes = new Uint8Array([
        0xFF, 0xD8, 0xFF, 0xE1, // JPEG signature + EXIF marker
        0x00, 0x10, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // EXIF identifier
        0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, // Rest of header
      ]);
      const file = createMockFile('test.jpg', jpegBytes, 'image/jpeg');
      
      const result = await validateFile(file, 'photo');
      expect(result.valid).toBe(true);
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should accept a valid JPEG file with FF D8 FF DB header', async () => {
      // JPEG with quantization table (FF D8 FF DB)
      const jpegBytes = new Uint8Array([
        0xFF, 0xD8, 0xFF, 0xDB, // JPEG signature + quantization marker
        0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, // Quantization data
        0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, // More data
      ]);
      const file = createMockFile('test.jpg', jpegBytes, 'image/jpeg');
      
      const result = await validateFile(file, 'photo');
      expect(result.valid).toBe(true);
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should accept JPEG even if browser reports image/jpg', async () => {
      const jpegBytes = new Uint8Array([
        0xFF, 0xD8, 0xFF, 0xE0,
        0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      const file = createMockFile('test.jpg', jpegBytes, 'image/jpg'); // Non-standard MIME
      
      const result = await validateFile(file, 'photo');
      expect(result.valid).toBe(true);
      expect(result.mimeType).toBe('image/jpeg'); // Should be normalized
    });

    it('should accept JPEG even if browser MIME type is empty', async () => {
      const jpegBytes = new Uint8Array([
        0xFF, 0xD8, 0xFF, 0xE0,
        0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      const file = createMockFile('test.jpg', jpegBytes, ''); // Empty MIME
      
      const result = await validateFile(file, 'photo');
      expect(result.valid).toBe(true);
      expect(result.mimeType).toBe('image/jpeg'); // Should be detected from signature
    });

    it('should reject a renamed .exe file as .jpg', async () => {
      // PE executable header (MZ)
      const exeBytes = new Uint8Array([
        0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00,
        0x04, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00,
      ]);
      const file = createMockFile('malware.jpg', exeBytes, 'image/jpeg'); // Fake MIME
      
      const result = await validateFile(file, 'photo');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not supported');
    });

    it('should reject a renamed .zip file as .jpg', async () => {
      // ZIP file header (PK)
      const zipBytes = new Uint8Array([
        0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00,
        0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);
      const file = createMockFile('archive.jpg', zipBytes, 'image/jpeg'); // Fake MIME
      
      const result = await validateFile(file, 'photo');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not supported');
    });
  });

  describe('validateFile - PNG files', () => {
    it('should accept a valid PNG file', async () => {
      const pngBytes = new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      ]);
      const file = createMockFile('test.png', pngBytes, 'image/png');
      
      const result = await validateFile(file, 'photo');
      expect(result.valid).toBe(true);
      expect(result.mimeType).toBe('image/png');
    });
  });

  describe('validateFile - PDF files', () => {
    it('should accept a valid PDF file', async () => {
      const pdfBytes = new Uint8Array([
        0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, // %PDF-1.4
        0x0A, 0x25, 0xC4, 0xE5, 0xCF, 0xE9, 0x0A, 0x0A, // PDF header
      ]);
      const file = createMockFile('test.pdf', pdfBytes, 'application/pdf');
      
      const result = await validateFile(file, 'pdf');
      expect(result.valid).toBe(true);
      expect(result.mimeType).toBe('application/pdf');
    });
  });
});

