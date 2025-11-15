/**
 * @xbibzlibrary/kompreser - Image Processing Core
 * Core image processing and data conversion utilities
 */

import Logger from '../utils/Logger.js';
import { ValidationError, FormatError } from './ErrorHandler.js';

class ImageProcessor {
  constructor(options, logger) {
    this.options = options;
    this.logger = logger || new Logger();
    
    // Processing options
    this.maxCanvasSize = options.maxCanvasSize || 32767;
    this.enableImageBitmap = options.enableImageBitmap !== false;
    this.enableOffscreenCanvas = options.enableOffscreenCanvas !== false;
  }

  async processInput(input, options = {}) {
    const timer = this.logger.startTimer('image_processing');
    
    try {
      this.logger.debug('Processing input', { 
        inputType: this.getInputType(input),
        options 
      });

      let imageData;
      
      // Handle different input types
      if (input instanceof File || input instanceof Blob) {
        imageData = await this.processFile(input, options);
      } else if (typeof input === 'string') {
        imageData = await this.processDataURL(input, options);
      } else if (input instanceof HTMLImageElement) {
        imageData = await this.processImageElement(input, options);
      } else if (input instanceof HTMLCanvasElement) {
        imageData = await this.processCanvasElement(input, options);
      } else if (input instanceof ImageData) {
        imageData = await this.processImageData(input, options);
      } else if (input.data && input.width && input.height) {
        imageData = await this.processImageData(input, options);
      } else {
        throw new ValidationError(`Unsupported input type: ${this.getInputType(input)}`);
      }

      // Apply preprocessing
      const processedData = await this.preprocessImageData(imageData, options);
      
      const duration = timer.end();
      
      this.logger.debug('Image processing completed', {
        duration,
        originalSize: input.size || input.data?.length,
        processedSize: processedData.data.length,
        dimensions: `${processedData.width}x${processedData.height}`
      });

      return processedData;
      
    } catch (error) {
      this.logger.error('Image processing failed', { error: error.message });
      throw new FormatError(`Image processing failed: ${error.message}`, 'unknown');
    }
  }

  async processFile(file, options) {
    // Use ImageBitmap if available for better performance
    if (this.enableImageBitmap && typeof createImageBitmap !== 'undefined') {
      try {
        const bitmap = await createImageBitmap(file);
        return this.processImageBitmap(bitmap, options);
      } catch (error) {
        this.logger.warn('ImageBitmap processing failed, falling back to canvas', { error: error.message });
      }
    }

    // Fallback to canvas-based processing
    const url = URL.createObjectURL(file);
    try {
      const img = await this.loadImage(url);
      return this.processImageElement(img, options);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async processDataURL(dataURL, options) {
    // Validate data URL
    if (!dataURL.startsWith('data:image/')) {
      throw new ValidationError('Invalid data URL format');
    }

    const img = await this.loadImage(dataURL);
    return this.processImageElement(img, options);
  }

  async processImageElement(img, options) {
    // Check if image is loaded
    if (!img.complete || img.naturalWidth === 0) {
      throw new ValidationError('Image element is not loaded');
    }

    // Apply resize options if specified
    if (options.maxWidth || options.maxHeight || options.width || options.height) {
      return this.resizeImage(img, options);
    }

    // Process at original size
    const canvas = this.createCanvas(img.naturalWidth, img.naturalHeight);
    const ctx = canvas.getContext('2d');
    
    // Disable image smoothing for better quality
    ctx.imageSmoothingEnabled = options.imageSmoothing !== false;
    ctx.imageSmoothingQuality = options.imageSmoothingQuality || 'high';
    
    ctx.drawImage(img, 0, 0);
    
    return this.extractImageData(canvas);
  }

  async processCanvasElement(canvas, options) {
    // Apply resize if needed
    if (options.maxWidth || options.maxHeight || options.width || options.height) {
      return this.resizeCanvas(canvas, options);
    }

    return this.extractImageData(canvas);
  }

  async processImageData(imageData, options) {
    // Apply resize if needed
    if (options.maxWidth || options.maxHeight || options.width || options.height) {
      return this.resizeImageData(imageData, options);
    }

    return {
      data: imageData.data,
      width: imageData.width,
      height: imageData.height,
      size: imageData.data.length
    };
  }

  async processImageBitmap(bitmap, options) {
    // Apply resize if needed
    if (options.maxWidth || options.maxHeight || options.width || options.height) {
      return this.resizeImageBitmap(bitmap, options);
    }

    // Extract ImageData from ImageBitmap
    const canvas = this.createCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    
    return this.extractImageData(canvas);
  }

  async resizeImage(img, options) {
    const { width, height } = this.calculateDimensions(
      img.naturalWidth,
      img.naturalHeight,
      options
    );

    // Use high-quality downsampling if available
    if (this.enableImageBitmap && typeof createImageBitmap !== 'undefined') {
      try {
        const resizedBitmap = await createImageBitmap(img, {
          resizeWidth: width,
          resizeHeight: height,
          resizeQuality: options.resizeQuality || 'high'
        });
        
        return this.processImageBitmap(resizedBitmap, options);
      } catch (error) {
        this.logger.warn('ImageBitmap resize failed, using canvas', { error: error.message });
      }
    }

    // Canvas-based resize
    const canvas = this.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Configure for high-quality resize
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(img, 0, 0, width, height);
    
    return this.extractImageData(canvas);
  }

  async resizeCanvas(canvas, options) {
    const { width, height } = this.calculateDimensions(
      canvas.width,
      canvas.height,
      options
    );

    // Use OffscreenCanvas if available for better performance
    if (this.enableOffscreenCanvas && typeof OffscreenCanvas !== 'undefined') {
      const offscreen = new OffscreenCanvas(width, height);
      const ctx = offscreen.getContext('2d');
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(canvas, 0, 0, width, height);
      
      return this.extractImageData(offscreen);
    }

    // Regular canvas resize
    const resizedCanvas = this.createCanvas(width, height);
    const ctx = resizedCanvas.getContext('2d');
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, width, height);
    
    return this.extractImageData(resizedCanvas);
  }

  async resizeImageData(imageData, options) {
    const { width, height } = this.calculateDimensions(
      imageData.width,
      imageData.height,
      options
    );

    // Use canvas for high-quality resize
    const canvas = this.createCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d');
    
    // Put original ImageData
    ctx.putImageData(imageData, 0, 0);
    
    // Create resized canvas
    const resizedCanvas = this.createCanvas(width, height);
    const resizedCtx = resizedCanvas.getContext('2d');
    
    resizedCtx.imageSmoothingEnabled = true;
    resizedCtx.imageSmoothingQuality = 'high';
    resizedCtx.drawImage(canvas, 0, 0, width, height);
    
    return this.extractImageData(resizedCanvas);
  }

  async resizeImageBitmap(bitmap, options) {
    const { width, height } = this.calculateDimensions(
      bitmap.width,
      bitmap.height,
      options
    );

    // Use createImageBitmap for resize
    const resizedBitmap = await createImageBitmap(bitmap, {
      resizeWidth: width,
      resizeHeight: height,
      resizeQuality: options.resizeQuality || 'high'
    });

    return this.processImageBitmap(resizedBitmap, options);
  }

  calculateDimensions(originalWidth, originalHeight, options) {
    let { width, height } = options;
    
    // Use explicit dimensions if provided
    if (width && height) {
      return { width, height };
    }

    // Calculate based on max dimensions
    const maxWidth = options.maxWidth || originalWidth;
    const maxHeight = options.maxHeight || originalHeight;

    // Calculate scale factor
    let scale = 1;
    
    if (originalWidth > maxWidth || originalHeight > maxHeight) {
      const widthScale = maxWidth / originalWidth;
      const heightScale = maxHeight / originalHeight;
      scale = Math.min(widthScale, heightScale);
    }

    // Apply fit mode
    if (options.fit) {
      switch (options.fit) {
        case 'cover':
          scale = Math.max(maxWidth / originalWidth, maxHeight / originalHeight);
          break;
        case 'contain':
          scale = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);
          break;
        case 'fill':
          // Use exact dimensions
          return { width: maxWidth, height: maxHeight };
        case 'inside':
          scale = Math.min(1, Math.min(maxWidth / originalWidth, maxHeight / originalHeight));
          break;
        case 'outside':
          scale = Math.max(1, Math.max(maxWidth / originalWidth, maxHeight / originalHeight));
          break;
      }
    }

    // Calculate final dimensions
    width = Math.round(originalWidth * scale);
    height = Math.round(originalHeight * scale);

    // Ensure minimum dimensions
    width = Math.max(1, width);
    height = Math.max(1, height);

    // Ensure maximum dimensions
    width = Math.min(this.maxCanvasSize, width);
    height = Math.min(this.maxCanvasSize, height);

    return { width, height };
  }

  createCanvas(width, height) {
    // Use OffscreenCanvas if available
    if (this.enableOffscreenCanvas && typeof OffscreenCanvas !== 'undefined') {
      return new OffscreenCanvas(width, height);
    }

    // Fallback to regular canvas
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    }

    throw new Error('Canvas creation not supported in this environment');
  }

  extractImageData(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    return {
      data: imageData.data,
      width: canvas.width,
      height: canvas.height,
      size: imageData.data.length
    };
  }

  async preprocessImageData(imageData, options) {
    let processedData = { ...imageData };

    // Apply color space conversion
    if (options.colorSpace && options.colorSpace !== 'srgb') {
      processedData = await this.convertColorSpace(processedData, options.colorSpace);
    }

    // Apply preprocessing filters
    if (options.preprocess) {
      processedData = await this.applyPreprocessingFilters(processedData, options);
    }

    // Optimize for compression
    if (options.optimize) {
      processedData = await this.optimizeForCompression(processedData, options);
    }

    return processedData;
  }

  async convertColorSpace(imageData, targetColorSpace) {
    const { data } = imageData;
    const converted = new Uint8ClampedArray(data.length);

    switch (targetColorSpace.toLowerCase()) {
      case 'adobe-rgb':
        // Convert sRGB to Adobe RGB
        for (let i = 0; i < data.length; i += 4) {
          const [r, g, b] = this.sRGBToAdobeRGB(data[i], data[i + 1], data[i + 2]);
          converted[i] = r;
          converted[i + 1] = g;
          converted[i + 2] = b;
          converted[i + 3] = data[i + 3];
        }
        break;
        
      case 'prophoto-rgb':
        // Convert sRGB to ProPhoto RGB
        for (let i = 0; i < data.length; i += 4) {
          const [r, g, b] = this.sRGBToProPhotoRGB(data[i], data[i + 1], data[i + 2]);
          converted[i] = r;
          converted[i + 1] = g;
          converted[i + 2] = b;
          converted[i + 3] = data[i + 3];
        }
        break;
        
      default:
        // Keep as sRGB
        converted.set(data);
    }

    return {
      ...imageData,
      data: converted
    };
  }

  sRGBToAdobeRGB(r, g, b) {
    // sRGB to Adobe RGB conversion matrix
    const matrix = [
      [0.7152, 0.2848, 0.0000],
      [0.0722, 0.9280, -0.0002],
      [0.2126, 0.7874, 0.0000]
    ];

    const rLinear = r / 255;
    const gLinear = g / 255;
    const bLinear = b / 255;

    const rAdobe = matrix[0][0] * rLinear + matrix[0][1] * gLinear + matrix[0][2] * bLinear;
    const gAdobe = matrix[1][0] * rLinear + matrix[1][1] * gLinear + matrix[1][2] * bLinear;
    const bAdobe = matrix[2][0] * rLinear + matrix[2][1] * gLinear + matrix[2][2] * bLinear;

    return [
      Math.round(Math.pow(Math.max(0, Math.min(1, rAdobe)), 1/2.2) * 255),
      Math.round(Math.pow(Math.max(0, Math.min(1, gAdobe)), 1/2.2) * 255),
      Math.round(Math.pow(Math.max(0, Math.min(1, bAdobe)), 1/2.2) * 255)
    ];
  }

  sRGBToProPhotoRGB(r, g, b) {
    // Simplified ProPhoto RGB conversion
    const rLinear = Math.pow(r / 255, 2.2);
    const gLinear = Math.pow(g / 255, 2.2);
    const bLinear = Math.pow(b / 255, 2.2);

    // ProPhoto RGB matrix (simplified)
    const rPro = 0.7977 * rLinear + 0.1352 * gLinear + 0.0313 * bLinear;
    const gPro = 0.2880 * rLinear + 0.7119 * gLinear + 0.0001 * bLinear;
    const bPro = 0.0000 * rLinear + 0.0000 * gLinear + 1.0000 * bLinear;

    return [
      Math.round(Math.pow(Math.max(0, Math.min(1, rPro)), 1/1.8) * 255),
      Math.round(Math.pow(Math.max(0, Math.min(1, gPro)), 1/1.8) * 255),
      Math.round(Math.pow(Math.max(0, Math.min(1, bPro)), 1/1.8) * 255)
    ];
  }

  async applyPreprocessingFilters(imageData, options) {
    let processedData = { ...imageData };

    // Apply denoising if needed
    if (options.denoise && options.denoise > 0) {
      processedData = await this.applyDenoising(processedData, options.denoise);
    }

    // Apply sharpening if needed
    if (options.sharpen && options.sharpen > 0) {
      processedData = await this.applySharpening(processedData, options.sharpen);
    }

    // Apply gamma correction
    if (options.gamma && options.gamma !== 1.0) {
      processedData = await this.applyGammaCorrection(processedData, options.gamma);
    }

    return processedData;
  }

  async applyDenoising(imageData, strength) {
    // Simple box blur denoising
    const { data, width, height } = imageData;
    const output = new Uint8ClampedArray(data);

    const kernelSize = Math.floor(strength * 2) + 1;
    const halfKernel = Math.floor(kernelSize / 2);

    for (let y = halfKernel; y < height - halfKernel; y++) {
      for (let x = halfKernel; x < width - halfKernel; x++) {
        let r = 0, g = 0, b = 0, a = 0;
        let count = 0;

        for (let dy = -halfKernel; dy <= halfKernel; dy++) {
          for (let dx = -halfKernel; dx <= halfKernel; dx++) {
            const index = ((y + dy) * width + (x + dx)) * 4;
            r += data[index];
            g += data[index + 1];
            b += data[index + 2];
            a += data[index + 3];
            count++;
          }
        }

        const outputIndex = (y * width + x) * 4;
        output[outputIndex] = Math.round(r / count);
        output[outputIndex + 1] = Math.round(g / count);
        output[outputIndex + 2] = Math.round(b / count);
        output[outputIndex + 3] = Math.round(a / count);
      }
    }

    return {
      ...imageData,
      data: output
    };
  }

  async applySharpening(imageData, strength) {
    // Unsharp mask sharpening
    const { data, width, height } = imageData;
    const output = new Uint8ClampedArray(data);

    // Create blurred version
    const blurred = await this.applyDenoising(imageData, 1);

    const factor = strength / 100;

    for (let i = 0; i < data.length; i += 4) {
      output[i] = Math.min(255, Math.max(0, data[i] + (data[i] - blurred.data[i]) * factor));
      output[i + 1] = Math.min(255, Math.max(0, data[i + 1] + (data[i + 1] - blurred.data[i + 1]) * factor));
      output[i + 2] = Math.min(255, Math.max(0, data[i + 2] + (data[i + 2] - blurred.data[i + 2]) * factor));
      // Keep alpha unchanged
    }

    return {
      ...imageData,
      data: output
    };
  }

  async applyGammaCorrection(imageData, gamma) {
    const { data } = imageData;
    const output = new Uint8ClampedArray(data);
    const gammaCorrection = 1 / gamma;

    // Pre-calculate gamma table
    const gammaTable = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      gammaTable[i] = Math.min(255, Math.max(0, Math.round(Math.pow(i / 255, gammaCorrection) * 255)));
    }

    // Apply gamma correction
    for (let i = 0; i < data.length; i += 4) {
      output[i] = gammaTable[data[i]];
      output[i + 1] = gammaTable[data[i + 1]];
      output[i + 2] = gammaTable[data[i + 2]];
      output[i + 3] = data[i + 3]; // Keep alpha unchanged
    }

    return {
      ...imageData,
      data: output
    };
  }

  async optimizeForCompression(imageData, options) {
    let optimizedData = { ...imageData };

    // Optimize alpha channel if present
    if (options.optimizeAlpha) {
      optimizedData = await this.optimizeAlphaChannel(optimizedData);
    }

    // Optimize color palette if applicable
    if (options.optimizePalette && options.format === 'png') {
      optimizedData = await this.optimizeColorPalette(optimizedData);
    }

    // Remove unnecessary metadata
    optimizedData = await this.stripMetadata(optimizedData);

    return optimizedData;
  }

  async optimizeAlphaChannel(imageData) {
    const { data, width, height } = imageData;
    let hasTransparency = false;
    let hasSemiTransparency = false;

    // Analyze alpha channel
    for (let i = 3; i < data.length; i += 4) {
      const alpha = data[i];
      if (alpha < 255) {
        hasTransparency = true;
        if (alpha > 0 && alpha < 255) {
          hasSemiTransparency = true;
          break;
        }
      }
    }

    // If only binary transparency, optimize
    if (hasTransparency && !hasSemiTransparency) {
      const output = new Uint8ClampedArray(data);
      
      for (let i = 3; i < output.length; i += 4) {
        output[i] = output[i] > 127 ? 255 : 0;
      }

      return {
        ...imageData,
        data: output,
        hasBinaryAlpha: true
      };
    }

    return {
      ...imageData,
      hasTransparency,
      hasSemiTransparency
    };
  }

  async optimizeColorPalette(imageData) {
    // Simplified color palette optimization
    // In production, this would use advanced quantization
    return imageData;
  }

  async stripMetadata(imageData) {
    // Remove any embedded metadata
    // This is a placeholder - actual metadata stripping depends on the format
    return imageData;
  }

  getInputType(input) {
    if (input instanceof File) return 'File';
    if (input instanceof Blob) return 'Blob';
    if (typeof input === 'string') {
      if (input.startsWith('data:')) return 'Data URL';
      if (input.startsWith('http')) return 'URL';
    }
    if (input instanceof HTMLImageElement) return 'Image Element';
    if (input instanceof HTMLCanvasElement) return 'Canvas Element';
    if (input instanceof ImageData) return 'ImageData';
    if (input.data && input.width && input.height) return 'ImageData-like';
    return 'Unknown';
  }

  async loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      
      // Set cross-origin attribute for external images
      if (src.startsWith('http')) {
        img.crossOrigin = 'anonymous';
      }
      
      img.src = src;
    });
  }
}

export default ImageProcessor;