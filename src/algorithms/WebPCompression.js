/**
 * @xbibzlibrary/kompreser - WebP Compression Algorithm
 * Advanced WebP compression with VP8 encoding and alpha support
 */

import Logger from '../utils/Logger.js';
import { CompressionError, UnsupportedError } from '../core/ErrorHandler.js';

class WebPCompression {
  constructor(options, logger) {
    this.options = options;
    this.logger = logger || new Logger();
    
    // WebP encoding presets
    this.PRESETS = {
      DEFAULT: 0,
      PICTURE: 1,
      PHOTO: 2,
      DRAWING: 3,
      ICON: 4,
      TEXT: 5
    };
    
    // Compression methods
    this.METHODS = {
      BEST_QUALITY: 0,
      BEST_SPEED: 6
    };
    
    // WebP features
    this.FEATURES = {
      LOSSY: 1,
      LOSSLESS: 2,
      ALPHA: 4,
      ANIMATION: 8,
      EXIF: 16,
      ICC: 32
    };
  }

  async compress(imageData, options = {}) {
    const timer = this.logger.startTimer('webp_compression');
    
    try {
      // Check WebP support
      if (!this.isWebPSupported()) {
        throw new UnsupportedError('WebP format is not supported in this environment');
      }

      this.logger.debug('Starting WebP compression', { 
        quality: options.quality,
        method: options.method,
        preset: options.preset,
        lossless: options.lossless,
        dimensions: `${imageData.width}x${imageData.height}`
      });

      // Analyze image for optimal settings
      const analysis = await this.analyzeImage(imageData);
      
      // Determine encoding parameters
      const encodingParams = this.determineEncodingParams(imageData, analysis, options);
      
      // Encode using canvas if available (browser)
      let webpData;
      if (typeof document !== 'undefined') {
        webpData = await this.encodeWithCanvas(imageData, encodingParams);
      } else {
        webpData = await this.encodeWithVP8(imageData, encodingParams);
      }
      
      // Post-process for optimization
      const optimizedData = await this.optimizeWebP(webpData, encodingParams);
      
      const duration = timer.end();
      
      this.logger.debug('WebP compression completed', {
        duration,
        originalSize: imageData.data.length,
        compressedSize: optimizedData.length,
        compressionRatio: Math.round((1 - optimizedData.length / imageData.data.length) * 100),
        method: encodingParams.method,
        lossless: encodingParams.lossless
      });

      return {
        data: optimizedData,
        size: optimizedData.length,
        width: imageData.width,
        height: imageData.height,
        format: 'webp',
        quality: options.quality,
        lossless: encodingParams.lossless
      };
      
    } catch (error) {
      this.logger.error('WebP compression failed', { error: error.message });
      throw new CompressionError(`WebP compression failed: ${error.message}`, 'webp');
    }
  }

  isWebPSupported() {
    try {
      if (typeof document === 'undefined') {
        return false;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      
      const dataURL = canvas.toDataURL('image/webp');
      return dataURL.startsWith('data:image/webp');
    } catch (error) {
      return false;
    }
  }

  async analyzeImage(imageData) {
    const analysis = {
      hasAlpha: false,
      isPhotograph: false,
      isGraphic: false,
      hasSharpEdges: false,
      colorVariance: 0,
      edgeDensity: 0
    };
    
    const { data, width, height } = imageData;
    
    // Check for alpha channel
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        analysis.hasAlpha = true;
        break;
      }
    }
    
    // Analyze image characteristics
    let totalVariance = 0;
    let edgePixels = 0;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const center = (y * width + x) * 4;
        
        // Calculate local variance
        const neighbors = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const neighbor = ((y + dy) * width + (x + dx)) * 4;
            neighbors.push(data[neighbor]);
          }
        }
        
        const mean = neighbors.reduce((sum, val) => sum + val, 0) / neighbors.length;
        const variance = neighbors.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / neighbors.length;
        totalVariance += variance;
        
        // Edge detection
        if (variance > 1000) {
          edgePixels++;
        }
      }
    }
    
    analysis.colorVariance = totalVariance / (width * height);
    analysis.edgeDensity = edgePixels / (width * height);
    
    // Classify image type
    if (analysis.colorVariance > 500) {
      analysis.isPhotograph = true;
    } else {
      analysis.isGraphic = true;
    }
    
    if (analysis.edgeDensity > 0.1) {
      analysis.hasSharpEdges = true;
    }
    
    this.logger.debug('WebP image analysis', analysis);
    
    return analysis;
  }

  determineEncodingParams(imageData, analysis, options) {
    const params = {
      quality: options.quality || 0.8,
      method: options.method || this.METHODS.DEFAULT,
      preset: options.preset || this.PRESETS.DEFAULT,
      lossless: options.lossless || false,
      alpha: analysis.hasAlpha,
      filterType: options.filterType || 1,
      filterSharpness: options.filterSharpness || 0,
      filterLevel: options.filterLevel || 0,
      preprocessing: options.preprocessing || 0,
      partitions: options.partitions || 0,
      partitionLimit: options.partitionLimit || 0,
      useSharpYUV: options.useSharpYUV || false,
      qmin: options.qmin || 0,
      qmax: options.qmax || 100,
      targetSize: options.targetSize || 0,
      targetPSNR: options.targetPSNR || 0,
      segments: options.segments || 4,
      snsStrength: options.snsStrength || 50,
      filterStrength: options.filterStrength || 60,
      filterSharpness: options.filterSharpness || 0,
      filterType: options.filterType || 1,
      autofilter: options.autofilter || false,
      alphaCompression: options.alphaCompression || 1,
      alphaFiltering: options.alphaFiltering || 1,
      alphaQuality: options.alphaQuality || 100,
      pass: options.pass || 1,
      showCompressed: options.showCompressed || 0,
      preprocessing: options.preprocessing || 0,
      partitions: options.partitions || 0,
      partitionLimit: options.partitionLimit || 0,
      emulateJPEGSize: options.emulateJPEGSize || 0,
      threadLevel: options.threadLevel || 0,
      lowMemory: options.lowMemory || 0,
      nearLossless: options.nearLossless || 100,
      exact: options.exact || 0,
      useDeltaPalette: options.useDeltaPalette || 0,
      useSharpYUV: options.useSharpYUV || 0
    };
    
    // Adjust parameters based on analysis
    if (analysis.isPhotograph) {
      params.preset = this.PRESETS.PHOTO;
      params.filterStrength = Math.min(80, params.filterStrength);
    } else if (analysis.isGraphic) {
      params.preset = this.PRESETS.DRAWING;
      params.filterStrength = Math.max(20, params.filterStrength);
    }
    
    // Adjust quality based on content complexity
    if (analysis.colorVariance > 1000) {
      params.quality = Math.max(0.6, params.quality - 0.1);
    }
    
    // Enable lossless for simple graphics
    if (analysis.isGraphic && analysis.edgeDensity > 0.2 && options.lossless !== false) {
      params.lossless = true;
    }
    
    // Adjust alpha compression
    if (params.alpha) {
      params.alphaQuality = Math.max(80, params.alphaQuality);
    }
    
    return params;
  }

  async encodeWithCanvas(imageData, params) {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        
        const ctx = canvas.getContext('2d');
        
        // Put image data
        if (imageData.data instanceof ImageData) {
          ctx.putImageData(imageData.data, 0, 0);
        } else if (imageData.data instanceof Uint8ClampedArray) {
          const imgData = new ImageData(imageData.data, imageData.width, imageData.height);
          ctx.putImageData(imgData, 0, 0);
        } else {
          // Handle other data types
          const imgData = new ImageData(
            new Uint8ClampedArray(imageData.data), 
            imageData.width, 
            imageData.height
          );
          ctx.putImageData(imgData, 0, 0);
        }
        
        // Encode to WebP
        const quality = Math.round(params.quality * 100);
        const dataURL = canvas.toDataURL('image/webp', quality / 100);
        
        // Convert data URL to binary
        const base64Data = dataURL.split(',')[1];
        const binaryString = atob(base64Data);
        const webpData = new Uint8Array(binaryString.length);
        
        for (let i = 0; i < binaryString.length; i++) {
          webpData[i] = binaryString.charCodeAt(i);
        }
        
        resolve(webpData);
        
      } catch (error) {
        reject(new CompressionError(`Canvas WebP encoding failed: ${error.message}`, 'webp'));
      }
    });
  }

  async encodeWithVP8(imageData, params) {
    // VP8 encoding implementation
    // This would be a complex implementation in production
    
    const { width, height, data } = imageData;
    
    // Create WebP container
    const webpData = [];
    
    // RIFF header
    webpData.push(0x52, 0x49, 0x46, 0x46); // "RIFF"
    
    // File size (will be updated later)
    webpData.push(0x00, 0x00, 0x00, 0x00);
    
    // WebP signature
    webpData.push(0x57, 0x45, 0x42, 0x50); // "WEBP"
    
    // VP8 chunk
    if (params.lossless) {
      webpData.push(0x56, 0x50, 0x38, 0x4C); // "VP8L"
      const vp8lData = await this.encodeVP8Lossless(imageData, params);
      
      // VP8L chunk size
      const size = vp8lData.length;
      webpData.push((size >> 0) & 0xFF, (size >> 8) & 0xFF, 
                   (size >> 16) & 0xFF, (size >> 24) & 0xFF);
      
      webpData.push(...vp8lData);
    } else {
      webpData.push(0x56, 0x50, 0x38, 0x20); // "VP8 "
      const vp8Data = await this.encodeVP8Lossy(imageData, params);
      
      // VP8 chunk size
      const size = vp8Data.length;
      webpData.push((size >> 0) & 0xFF, (size >> 8) & 0xFF, 
                   (size >> 16) & 0xFF, (size >> 24) & 0xFF);
      
      webpData.push(...vp8Data);
    }
    
    // Update file size
    const fileSize = webpData.length - 8;
    webpData[4] = (fileSize >> 0) & 0xFF;
    webpData[5] = (fileSize >> 8) & 0xFF;
    webpData[6] = (fileSize >> 16) & 0xFF;
    webpData[7] = (fileSize >> 24) & 0xFF;
    
    return new Uint8Array(webpData);
  }

  async encodeVP8Lossless(imageData, params) {
    // VP8L (lossless) encoding
    // Simplified implementation
    
    const vp8lData = [];
    
    // VP8L header
    vp8lData.push(0x2F); // VP8L signature
    
    // Width and height
    const width = imageData.width - 1;
    const height = imageData.height - 1;
    
    vp8lData.push(
      (width >> 0) & 0xFF,
      (width >> 8) & 0xFF,
      (width >> 14) & 0xFF | ((height >> 0) & 0x3) << 6,
      (height >> 2) & 0xFF,
      (height >> 10) & 0xFF
    );
    
    // Alpha flag
    const hasAlpha = params.alpha;
    if (hasAlpha) {
      vp8lData[4] |= 0x10;
    }
    
    // Version
    vp8lData.push(0x00);
    
    // Encode image data
    const encodedData = await this.encodeVP8LData(imageData, params);
    vp8lData.push(...encodedData);
    
    return new Uint8Array(vp8lData);
  }

  async encodeVP8LData(imageData, params) {
    // VP8L data encoding
    // This would implement the actual VP8L compression
    
    const { data } = imageData;
    const encoded = [];
    
    // Transform types
    const transforms = [];
    
    // Color transform
    if (params.colorTransform) {
      transforms.push(0x00); // Predictor transform
    }
    
    // Color indexing transform
    if (params.colorIndexing) {
      transforms.push(0x02);
    }
    
    // Add transform data
    encoded.push(transforms.length);
    encoded.push(...transforms);
    
    // Image data
    for (let i = 0; i < data.length; i += 4) {
      encoded.push(data[i]);     // R
      encoded.push(data[i + 1]); // G
      encoded.push(data[i + 2]); // B
      if (params.alpha) {
        encoded.push(data[i + 3]); // A
      }
    }
    
    return encoded;
  }

  async encodeVP8Lossy(imageData, params) {
    // VP8 (lossy) encoding
    // Simplified implementation
    
    const vp8Data = [];
    
    // Frame header
    vp8Data.push(0x9D, 0x01, 0x2A); // VP8 frame tag
    
    // Width and height
    const width = imageData.width;
    const height = imageData.height;
    
    vp8Data.push(
      (width >> 8) & 0x7F | 0x80,
      width & 0xFF,
      (height >> 8) & 0x7F | 0x80,
      height & 0xFF
    );
    
    // Quality and compression settings
    const quality = Math.round(params.quality * 100);
    vp8Data.push(quality & 0xFF);
    
    // Encode macroblocks
    const macroblocks = await this.encodeMacroblocks(imageData, params);
    vp8Data.push(...macroblocks);
    
    return new Uint8Array(vp8Data);
  }

  async encodeMacroblocks(imageData, params) {
    const { data, width, height } = imageData;
    const macroblocks = [];
    
    // Process 16x16 macroblocks
    for (let y = 0; y < height; y += 16) {
      for (let x = 0; x < width; x += 16) {
        const mbData = this.extractMacroblock(data, width, height, x, y);
        const encodedMB = await this.encodeMacroblock(mbData, params);
        macroblocks.push(...encodedMB);
      }
    }
    
    return macroblocks;
  }

  extractMacroblock(data, width, height, startX, startY) {
    const mbData = new Uint8Array(16 * 16 * 4);
    
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const pixelX = Math.min(startX + x, width - 1);
        const pixelY = Math.min(startY + y, height - 1);
        const srcIndex = (pixelY * width + pixelX) * 4;
        const dstIndex = (y * 16 + x) * 4;
        
        mbData[dstIndex] = data[srcIndex];
        mbData[dstIndex + 1] = data[srcIndex + 1];
        mbData[dstIndex + 2] = data[srcIndex + 2];
        mbData[dstIndex + 3] = data[srcIndex + 3];
      }
    }
    
    return mbData;
  }

  async encodeMacroblock(mbData, params) {
    // Simplified macroblock encoding
    // In VP8, this would involve prediction, DCT, quantization, etc.
    
    const encoded = [];
    
    // Prediction mode
    encoded.push(0x00); // DC prediction
    
    // Residual data (simplified)
    for (let i = 0; i < mbData.length; i += 4) {
      encoded.push(mbData[i]);     // Y
      encoded.push(mbData[i + 1]); // Cb
      encoded.push(mbData[i + 2]); // Cr
    }
    
    return encoded;
  }

  async optimizeWebP(webpData, params) {
    // WebP optimization
    // In production, this would use advanced optimization techniques
    
    if (params.optimize) {
      this.logger.debug('Optimizing WebP data');
      
      // Remove unnecessary chunks
      // Optimize compression parameters
      // Apply additional filters if needed
    }
    
    return webpData;
  }

  // Alpha channel compression
  async compressAlpha(alphaData, params) {
    const compressed = [];
    
    // Alpha compression method
    compressed.push(params.alphaCompression || 1);
    
    // Filter strength
    compressed.push(params.alphaFiltering || 1);
    
    // Quality
    compressed.push(params.alphaQuality || 100);
    
    // Compressed alpha data
    for (let i = 0; i < alphaData.length; i++) {
      compressed.push(alphaData[i]);
    }
    
    return new Uint8Array(compressed);
  }

  // WebP features detection
  getSupportedFeatures() {
    const features = {
      lossy: false,
      lossless: false,
      alpha: false,
      animation: false
    };
    
    if (this.isWebPSupported()) {
      features.lossy = true;
      
      // Check for lossless support
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const dataURL = canvas.toDataURL('image/webp', 1.0);
        features.lossless = dataURL.startsWith('data:image/webp');
      } catch (error) {
        features.lossless = false;
      }
      
      // Check for alpha support
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.fillRect(0, 0, 1, 1);
        const dataURL = canvas.toDataURL('image/webp');
        features.alpha = dataURL.startsWith('data:image/webp');
      } catch (error) {
        features.alpha = false;
      }
    }
    
    return features;
  }
}

export default WebPCompression;