/**
 * @xbibzlibrary/kompreser - File Validation Utilities
 * Comprehensive file validation and security checks
 */

import { ValidationError, FormatError } from '../core/ErrorHandler.js';

class FileValidator {
  constructor(options) {
    this.options = options;
    this.maxFileSize = options.maxFileSize || 50 * 1024 * 1024; // 50MB
    this.allowedFormats = options.allowedFormats || [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 
      'image/avif', 'image/svg+xml', 'image/gif', 'image/bmp', 'image/tiff'
    ];
    this.allowedExtensions = options.allowedExtensions || [
      'jpg', 'jpeg', 'png', 'webp', 'avif', 'svg', 'gif', 'bmp', 'tiff'
    ];
  }

  async validateInput(input) {
    const validation = {
      valid: false,
      errors: [],
      warnings: [],
      format: null,
      size: 0,
      hasAlpha: false,
      metadata: {}
    };

    try {
      // Determine input type and validate accordingly
      if (input instanceof File) {
        await this.validateFile(input, validation);
      } else if (input instanceof Blob) {
        await this.validateBlob(input, validation);
      } else if (typeof input === 'string') {
        await this.validateDataURL(input, validation);
      } else if (input instanceof HTMLImageElement) {
        await this.validateImageElement(input, validation);
      } else if (input instanceof HTMLCanvasElement) {
        await this.validateCanvasElement(input, validation);
      } else if (input instanceof ImageData) {
        await this.validateImageData(input, validation);
      } else if (input.data && input.width && input.height) {
        await this.validateImageData(input, validation);
      } else {
        validation.errors.push('Unsupported input type');
      }

      // Final validation check
      if (validation.errors.length === 0) {
        validation.valid = true;
      }

    } catch (error) {
      validation.errors.push(`Validation error: ${error.message}`);
    }

    return validation;
  }

  async validateFile(file, validation) {
    // Check file size
    if (file.size > this.maxFileSize) {
      validation.errors.push(`File size ${this.formatBytes(file.size)} exceeds maximum allowed ${this.formatBytes(this.maxFileSize)}`);
    }
    validation.size = file.size;

    // Check MIME type
    if (!this.allowedFormats.includes(file.type)) {
      validation.errors.push(`File type "${file.type}" is not supported`);
    }
    validation.format = file.type;

    // Check file extension
    const extension = file.name.split('.').pop().toLowerCase();
    if (!this.allowedExtensions.includes(extension)) {
      validation.warnings.push(`File extension ".${extension}" may not be optimal`);
    }

    // Basic security checks
    await this.performSecurityChecks(file, validation);

    // Validate image data
    const imageData = await this.extractImageDataFromFile(file);
    if (imageData) {
      await this.validateImageData(imageData, validation);
    }
  }

  async validateBlob(blob, validation) {
    // Check size
    if (blob.size > this.maxFileSize) {
      validation.errors.push(`Blob size ${this.formatBytes(blob.size)} exceeds maximum allowed`);
    }
    validation.size = blob.size;

    // Check MIME type
    if (blob.type && !this.allowedFormats.includes(blob.type)) {
      validation.errors.push(`Blob type "${blob.type}" is not supported`);
    }
    validation.format = blob.type;

    // Validate image data
    const imageData = await this.extractImageDataFromBlob(blob);
    if (imageData) {
      await this.validateImageData(imageData, validation);
    }
  }

  async validateDataURL(dataURL, validation) {
    if (!dataURL.startsWith('data:image/')) {
      validation.errors.push('Invalid data URL format');
      return;
    }

    // Extract format
    const formatMatch = dataURL.match(/^data:image\/([a-zA-Z+]+);base64,/);
    if (formatMatch) {
      const format = `image/${formatMatch[1]}`;
      if (!this.allowedFormats.includes(format)) {
        validation.errors.push(`Data URL format "${format}" is not supported`);
      }
      validation.format = format;
    }

    // Check size
    const base64Data = dataURL.split(',')[1];
    const size = Math.ceil(base64Data.length * 0.75); // Approximate size
    if (size > this.maxFileSize) {
      validation.errors.push(`Data URL size exceeds maximum allowed`);
    }
    validation.size = size;

    // Validate image data
    const imageData = await this.extractImageDataFromDataURL(dataURL);
    if (imageData) {
      await this.validateImageData(imageData, validation);
    }
  }

  async validateImageElement(img, validation) {
    // Check dimensions
    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
      validation.errors.push('Image element has invalid dimensions');
    }

    // Check if image is loaded
    if (!img.complete) {
      validation.warnings.push('Image element may not be fully loaded');
    }

    // Extract image data
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    await this.validateImageData({
      data: imageData.data,
      width: canvas.width,
      height: canvas.height
    }, validation);
  }

  async validateCanvasElement(canvas, validation) {
    if (canvas.width === 0 || canvas.height === 0) {
      validation.errors.push('Canvas element has invalid dimensions');
    }

    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    await this.validateImageData({
      data: imageData.data,
      width: canvas.width,
      height: canvas.height
    }, validation);
  }

  async validateImageData(imageData, validation) {
    const { data, width, height } = imageData;

    // Check dimensions
    if (width <= 0 || height <= 0) {
      validation.errors.push('Image dimensions must be positive');
    }

    if (width > 32767 || height > 32767) {
      validation.errors.push('Image dimensions exceed maximum supported size (32767x32767)');
    }

    // Check pixel data
    if (!data || data.length === 0) {
      validation.errors.push('Image data is empty');
    }

    // Check data size matches dimensions
    const expectedSize = width * height * 4;
    if (data.length !== expectedSize) {
      validation.warnings.push(`Image data size ${data.length} doesn't match expected size ${expectedSize}`);
    }

    // Check for alpha channel
    validation.hasAlpha = this.checkAlphaChannel(data);

    // Calculate basic statistics
    validation.metadata = {
      width,
      height,
      pixelCount: width * height,
      channels: 4,
      hasAlpha: validation.hasAlpha,
      dataSize: data.length,
      bitsPerPixel: 32
    };

    // Perform advanced validation
    await this.performAdvancedValidation(imageData, validation);
  }

  checkAlphaChannel(data) {
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        return true;
      }
    }
    return false;
  }

  async performAdvancedValidation(imageData, validation) {
    const { data, width, height } = imageData;

    // Check for corrupted pixels
    let corruptedPixels = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] < 0 || data[i] > 255) {
        corruptedPixels++;
      }
    }

    if (corruptedPixels > 0) {
      validation.warnings.push(`Found ${corruptedPixels} corrupted pixels`);
    }

    // Detect extreme colors (potential issues)
    let extremeColors = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Check for pure colors (might indicate issues)
      if ((r === 0 && g === 0 && b === 0) || (r === 255 && g === 255 && b === 255)) {
        extremeColors++;
      }
    }

    const extremeRatio = extremeColors / (width * height);
    if (extremeRatio > 0.9) {
      validation.warnings.push(`Image contains ${Math.round(extremeRatio * 100)}% extreme colors`);
    }

    // Check for potential steganography patterns
    await this.checkSteganographyPatterns(imageData, validation);
  }

  async checkSteganographyPatterns(imageData, validation) {
    const { data } = imageData;
    let suspiciousPatterns = 0;

    // Check LSB patterns (simplified)
    for (let i = 0; i < data.length; i += 4) {
      const lsbPattern = (data[i] & 1) + ((data[i + 1] & 1) << 1) + ((data[i + 2] & 1) << 2);
      if (lsbPattern === 0b111 || lsbPattern === 0b000) {
        suspiciousPatterns++;
      }
    }

    const patternRatio = suspiciousPatterns / (data.length / 4);
    if (patternRatio > 0.8) {
      validation.warnings.push('Suspicious LSB patterns detected - potential steganography');
    }
  }

  async performSecurityChecks(file, validation) {
    // Check for suspicious file names
    const suspiciousPatterns = [
      /\.(php|js|html|exe|bat|sh)$/i,
      /script/i,
      /shell/i,
      /exec/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(file.name)) {
        validation.errors.push('Potentially dangerous file name detected');
        break;
      }
    }

    // Check file signature (magic bytes)
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer.slice(0, 16));
    
    const fileSignature = this.detectFileSignature(uint8Array);
    if (fileSignature && !fileSignature.startsWith('image/')) {
      validation.errors.push(`File signature indicates non-image format: ${fileSignature}`);
    }

    // Check for embedded scripts in metadata
    await this.checkMetadataForScripts(file, validation);
  }

  detectFileSignature(data) {
    // Check for common image format signatures
    const signatures = {
      'image/jpeg': [0xFF, 0xD8],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/gif': [0x47, 0x49, 0x46],
      'image/webp': [0x52, 0x49, 0x46, 0x46],
      'image/bmp': [0x42, 0x4D],
      'image/tiff': [0x49, 0x49, 0x2A, 0x00]
    };

    for (const [format, signature] of Object.entries(signatures)) {
      if (this.compareSignatures(data, signature)) {
        return format;
      }
    }

    return null;
  }

  compareSignatures(data, signature) {
    if (data.length < signature.length) return false;
    
    for (let i = 0; i < signature.length; i++) {
      if (data[i] !== signature[i]) return false;
    }
    return true;
  }

  async checkMetadataForScripts(file, validation) {
    try {
      // Basic check for suspicious strings in file header
      const text = await file.text();
      const suspiciousStrings = [
        '<script',
        'javascript:',
        'eval(',
        'function()',
        'document.write'
      ];

      for (const str of suspiciousStrings) {
        if (text.toLowerCase().includes(str)) {
          validation.warnings.push('Suspicious content detected in file metadata');
          break;
        }
      }
    } catch (error) {
      // Ignore text extraction errors for binary files
    }
  }

  async extractImageDataFromFile(file) {
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (error) {
      return null;
    }
  }

  async extractImageDataFromBlob(blob) {
    try {
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0);
      
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (error) {
      return null;
    }
  }

  async extractImageDataFromDataURL(dataURL) {
    try {
      const response = await fetch(dataURL);
      const blob = await response.blob();
      return this.extractImageDataFromBlob(blob);
    } catch (error) {
      return null;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Batch validation
  async validateBatch(inputs) {
    const results = [];
    
    for (const input of inputs) {
      try {
        const validation = await this.validateInput(input);
        results.push({
          input,
          validation,
          success: validation.valid
        });
      } catch (error) {
        results.push({
          input,
          validation: { valid: false, errors: [error.message] },
          success: false
        });
      }
    }
    
    return results;
  }
}

export default FileValidator;