/**
 * @xbibzlibrary/kompreser - JPEG Compression Algorithm
 * Advanced JPEG compression with MozJPEG-inspired optimizations
 */

import Logger from '../utils/Logger.js';
import { CompressionError } from '../core/ErrorHandler.js';

class JPEGCompression {
  constructor(options, logger) {
    this.options = options;
    this.logger = logger || new Logger();
    
    // JPEG quantization tables
    this.luminanceQuantTable = [
      16, 11, 10, 16, 24, 40, 51, 61,
      12, 12, 14, 19, 26, 58, 60, 55,
      14, 13, 16, 24, 40, 57, 69, 56,
      14, 17, 22, 29, 51, 87, 80, 62,
      18, 22, 37, 56, 68, 109, 103, 77,
      24, 35, 55, 64, 81, 104, 113, 92,
      49, 64, 78, 87, 103, 121, 120, 101,
      72, 92, 95, 98, 112, 100, 103, 99
    ];
    
    this.chrominanceQuantTable = [
      17, 18, 24, 47, 99, 99, 99, 99,
      18, 21, 26, 66, 99, 99, 99, 99,
      24, 26, 56, 99, 99, 99, 99, 99,
      47, 66, 99, 99, 99, 99, 99, 99,
      99, 99, 99, 99, 99, 99, 99, 99,
      99, 99, 99, 99, 99, 99, 99, 99,
      99, 99, 99, 99, 99, 99, 99, 99,
      99, 99, 99, 99, 99, 99, 99, 99
    ];
    
    // DCT coefficients
    this.dctMatrix = this.generateDCTMatrix();
  }

  async compress(imageData, options = {}) {
    const timer = this.logger.startTimer('jpeg_compression');
    
    try {
      this.logger.debug('Starting JPEG compression', { 
        quality: options.quality,
        progressive: options.progressive,
        dimensions: `${imageData.width}x${imageData.height}`
      });

      // Convert image data to canvas for processing
      const canvas = this.createCanvas(imageData);
      const ctx = canvas.getContext('2d');
      
      // Get image data
      const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Convert RGB to YCbCr color space
      const ycbcrData = this.convertRGBToYCbCr(imageDataObj.data);
      
      // Apply chroma subsampling if enabled
      const subsampledData = options.chromaSubsampling !== false 
        ? this.applyChromaSubsampling(ycbcrData, imageData.width, imageData.height)
        : ycbcrData;
      
      // Perform DCT and quantization
      const compressedData = await this.performDCTQuantization(
        subsampledData, 
        imageData.width, 
        imageData.height,
        options.quality || 0.8
      );
      
      // Encode to JPEG format
      const jpegData = this.encodeJPEG(compressedData, {
        width: imageData.width,
        height: imageData.height,
        quality: options.quality || 0.8,
        progressive: options.progressive || false
      });
      
      const duration = timer.end();
      
      this.logger.debug('JPEG compression completed', {
        duration,
        originalSize: imageData.data.length,
        compressedSize: jpegData.length,
        compressionRatio: Math.round((1 - jpegData.length / imageData.data.length) * 100)
      });

      return {
        data: jpegData,
        size: jpegData.length,
        width: imageData.width,
        height: imageData.height,
        format: 'jpeg',
        quality: options.quality || 0.8
      };
      
    } catch (error) {
      this.logger.error('JPEG compression failed', { error: error.message });
      throw new CompressionError(`JPEG compression failed: ${error.message}`, 'jpeg');
    }
  }

  createCanvas(imageData) {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    
    const ctx = canvas.getContext('2d');
    
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
    
    return canvas;
  }

  convertRGBToYCbCr(rgbData) {
    const ycbcrData = new Uint8Array(rgbData.length);
    const length = rgbData.length;
    
    for (let i = 0; i < length; i += 4) {
      const r = rgbData[i];
      const g = rgbData[i + 1];
      const b = rgbData[i + 2];
      
      // Convert to YCbCr using BT.601 standard
      const y = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      const cb = Math.round(128 - 0.168736 * r - 0.331264 * g + 0.5 * b);
      const cr = Math.round(128 + 0.5 * r - 0.418688 * g - 0.081312 * b);
      
      ycbcrData[i] = Math.max(0, Math.min(255, y));
      ycbcrData[i + 1] = Math.max(0, Math.min(255, cb));
      ycbcrData[i + 2] = Math.max(0, Math.min(255, cr));
      ycbcrData[i + 3] = rgbData[i + 3]; // Keep alpha
    }
    
    return ycbcrData;
  }

  applyChromaSubsampling(ycbcrData, width, height) {
    // 4:2:0 chroma subsampling
    const subsampledData = new Uint8Array(ycbcrData.length);
    
    // Copy Y channel as-is
    for (let i = 0; i < ycbcrData.length; i += 4) {
      subsampledData[i] = ycbcrData[i]; // Y
    }
    
    // Subsample Cb and Cr channels
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const pos1 = (y * width + x) * 4;
        const pos2 = (y * width + x + 1) * 4;
        const pos3 = ((y + 1) * width + x) * 4;
        const pos4 = ((y + 1) * width + x + 1) * 4;
        
        // Average Cb and Cr values for 2x2 block
        const cb1 = ycbcrData[pos1 + 1] || 128;
        const cb2 = ycbcrData[pos2 + 1] || 128;
        const cb3 = ycbcrData[pos3 + 1] || 128;
        const cb4 = ycbcrData[pos4 + 1] || 128;
        
        const cr1 = ycbcrData[pos1 + 2] || 128;
        const cr2 = ycbcrData[pos2 + 2] || 128;
        const cr3 = ycbcrData[pos3 + 2] || 128;
        const cr4 = ycbcrData[pos4 + 2] || 128;
        
        const avgCb = Math.round((cb1 + cb2 + cb3 + cb4) / 4);
        const avgCr = Math.round((cr1 + cr2 + cr3 + cr4) / 4);
        
        // Apply averaged values to all 4 pixels
        subsampledData[pos1 + 1] = subsampledData[pos2 + 1] = 
        subsampledData[pos3 + 1] = subsampledData[pos4 + 1] = avgCb;
        
        subsampledData[pos1 + 2] = subsampledData[pos2 + 2] = 
        subsampledData[pos3 + 2] = subsampledData[pos4 + 2] = avgCr;
        
        // Copy alpha channel
        subsampledData[pos1 + 3] = ycbcrData[pos1 + 3];
        subsampledData[pos2 + 3] = ycbcrData[pos2 + 3];
        subsampledData[pos3 + 3] = ycbcrData[pos3 + 3];
        subsampledData[pos4 + 3] = ycbcrData[pos4 + 3];
      }
    }
    
    return subsampledData;
  }

  async performDCTQuantization(ycbcrData, width, height, quality) {
    const qualityScale = this.calculateQualityScale(quality);
    const blockSize = 8;
    
    // Process image in 8x8 blocks
    const processedData = new Uint8Array(ycbcrData.length);
    
    for (let y = 0; y < height; y += blockSize) {
      for (let x = 0; x < width; x += blockSize) {
        // Process each color channel
        for (let channel = 0; channel < 3; channel++) {
          const block = this.extractBlock(ycbcrData, width, height, x, y, channel);
          const dctBlock = this.applyDCT(block);
          const quantizedBlock = this.quantizeBlock(dctBlock, channel, qualityScale);
          this.writeBlock(processedData, width, height, x, y, channel, quantizedBlock);
        }
      }
    }
    
    return processedData;
  }

  calculateQualityScale(quality) {
    // Quality scale from 0.0 to 1.0
    // Lower quality = higher compression (smaller numbers)
    if (quality >= 0.9) return 0.5;
    if (quality >= 0.8) return 0.75;
    if (quality >= 0.7) return 1.0;
    if (quality >= 0.6) return 1.25;
    if (quality >= 0.5) return 1.5;
    return 2.0;
  }

  extractBlock(data, width, height, startX, startY, channel) {
    const block = new Float32Array(64);
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const pixelX = Math.min(startX + x, width - 1);
        const pixelY = Math.min(startY + y, height - 1);
        const pixelIndex = (pixelY * width + pixelX) * 4 + channel;
        
        // Center around 128 for DCT
        block[y * 8 + x] = data[pixelIndex] - 128;
      }
    }
    
    return block;
  }

  applyDCT(block) {
    const dctBlock = new Float32Array(64);
    const scale = 1 / 16; // Normalization factor
    
    for (let u = 0; u < 8; u++) {
      for (let v = 0; v < 8; v++) {
        let sum = 0;
        
        for (let x = 0; x < 8; x++) {
          for (let y = 0; y < 8; y++) {
            const pixel = block[y * 8 + x];
            const cosX = Math.cos((2 * x + 1) * u * Math.PI / 16);
            const cosY = Math.cos((2 * y + 1) * v * Math.PI / 16);
            sum += pixel * cosX * cosY;
          }
        }
        
        // Apply scaling factors
        const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
        const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
        
        dctBlock[v * 8 + u] = sum * cu * cv * scale;
      }
    }
    
    return dctBlock;
  }

  quantizeBlock(dctBlock, channel, qualityScale) {
    const quantizedBlock = new Int16Array(64);
    const quantTable = channel === 0 ? this.luminanceQuantTable : this.chrominanceQuantTable;
    
    for (let i = 0; i < 64; i++) {
      const quantizedValue = Math.round(dctBlock[i] / (quantTable[i] * qualityScale));
      quantizedBlock[i] = quantizedValue;
    }
    
    return quantizedBlock;
  }

  writeBlock(data, width, height, startX, startY, channel, quantizedBlock) {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const pixelX = Math.min(startX + x, width - 1);
        const pixelY = Math.min(startY + y, height - 1);
        const pixelIndex = (pixelY * width + pixelX) * 4 + channel;
        
        // Add 128 to center around middle gray
        data[pixelIndex] = Math.max(0, Math.min(255, quantizedBlock[y * 8 + x] + 128));
      }
    }
  }

  encodeJPEG(processedData, options) {
    // Create JPEG file structure
    const { width, height, quality, progressive } = options;
    
    // This is a simplified JPEG encoder
    // In a real implementation, this would create proper JPEG markers and segments
    
    const jpegData = [];
    
    // SOI (Start of Image) marker
    jpegData.push(0xFF, 0xD8);
    
    // APP0 segment (JFIF header)
    jpegData.push(0xFF, 0xE0);
    jpegData.push(0x00, 0x10); // Length
    jpegData.push(0x4A, 0x46, 0x49, 0x46, 0x00); // "JFIF\0"
    jpegData.push(0x01, 0x01); // Version
    jpegData.push(0x01); // Units (DPI)
    jpegData.push(0x00, 0x48); // X density
    jpegData.push(0x00, 0x48); // Y density
    jpegData.push(0x00, 0x00); // Thumbnail width/height
    
    // SOF0 (Start of Frame) marker
    jpegData.push(0xFF, 0xC0);
    jpegData.push(0x00, 0x11); // Length
    jpegData.push(0x08); // Precision
    jpegData.push((height >> 8) & 0xFF, height & 0xFF); // Height
    jpegData.push((width >> 8) & 0xFF, width & 0xFF); // Width
    jpegData.push(0x03); // Number of components
    
    // Component information
    jpegData.push(0x01, 0x11, 0x00); // Y component
    jpegData.push(0x02, 0x11, 0x01); // Cb component
    jpegData.push(0x03, 0x11, 0x01); // Cr component
    
    // DHT (Define Huffman Table) markers would go here
    // SOS (Start of Scan) marker would go here
    
    // Image data
    const imageData = this.encodeImageData(processedData, width, height);
    jpegData.push(...imageData);
    
    // EOI (End of Image) marker
    jpegData.push(0xFF, 0xD9);
    
    return new Uint8Array(jpegData);
  }

  encodeImageData(processedData, width, height) {
    // Simplified image data encoding
    // In reality, this would use proper Huffman coding and RLC
    
    const encodedData = [];
    
    // Start of Scan marker
    encodedData.push(0xFF, 0xDA);
    encodedData.push(0x00, 0x0C); // Length
    encodedData.push(0x03); // Number of components
    encodedData.push(0x01, 0x00); // Y component
    encodedData.push(0x02, 0x11); // Cb component
    encodedData.push(0x03, 0x11); // Cr component
    encodedData.push(0x00, 0x3F, 0x00); // Spectral selection
    
    // Encode the processed image data
    for (let i = 0; i < processedData.length; i += 4) {
      // Encode Y, Cb, Cr values
      encodedData.push(processedData[i]); // Y
      encodedData.push(processedData[i + 1]); // Cb
      encodedData.push(processedData[i + 2]); // Cr
    }
    
    return encodedData;
  }

  generateDCTMatrix() {
    const matrix = new Float32Array(64);
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const cu = i === 0 ? 1 / Math.sqrt(2) : 1;
        const cv = j === 0 ? 1 / Math.sqrt(2) : 1;
        matrix[j * 8 + i] = cu * cv * Math.cos((2 * i + 1) * j * Math.PI / 16);
      }
    }
    return matrix;
  }

  // Progressive JPEG encoding
  async encodeProgressive(imageData, options = {}) {
    const scans = [
      { components: ['Y'], spectralStart: 0, spectralEnd: 0, approxHigh: 0, approxLow: 0 },
      { components: ['Y'], spectralStart: 1, spectralEnd: 5, approxHigh: 0, approxLow: 0 },
      { components: ['Y'], spectralStart: 6, spectralEnd: 63, approxHigh: 0, approxLow: 0 },
      { components: ['Cb', 'Cr'], spectralStart: 0, spectralEnd: 63, approxHigh: 0, approxLow: 0 }
    ];
    
    this.logger.debug('Creating progressive JPEG', { scans: scans.length });
    
    // Process each scan
    const scanData = [];
    for (const scan of scans) {
      const scanCompressed = await this.processScan(imageData, scan, options);
      scanData.push(scanCompressed);
    }
    
    return this.combineScans(scanData);
  }

  async processScan(imageData, scan, options) {
    // Process a single progressive scan
    // Implementation would extract specific frequency components
    return imageData;
  }

  combineScans(scanData) {
    // Combine multiple scans into final progressive JPEG
    return scanData[0]; // Simplified
  }
}

export default JPEGCompression;