/**
 * @xbibzlibrary/kompreser - Progressive Compression
 * Progressive JPEG and interlaced image encoding
 */

import Logger from '../utils/Logger.js';
import { CompressionError } from '../core/ErrorHandler.js';

class ProgressiveCompression {
  constructor(options, logger) {
    this.options = options;
    this.logger = logger || new Logger();
  }

  async encode(imageData, options = {}) {
    const timer = this.logger.startTimer('progressive_encoding');
    
    try {
      this.logger.debug('Starting progressive encoding', {
        format: options.format || 'jpeg',
        scans: options.scans || 3,
        dimensions: `${imageData.width}x${imageData.height}`
      });

      const format = options.format || 'jpeg';
      
      let encodedData;
      switch (format.toLowerCase()) {
        case 'jpeg':
          encodedData = await this.encodeProgressiveJPEG(imageData, options);
          break;
        case 'png':
          encodedData = await this.encodeInterlacedPNG(imageData, options);
          break;
        case 'webp':
          encodedData = await this.encodeProgressiveWebP(imageData, options);
          break;
        default:
          throw new CompressionError(`Progressive encoding not supported for format: ${format}`, format);
      }

      const duration = timer.end();
      
      this.logger.debug('Progressive encoding completed', {
        duration,
        format,
        originalSize: imageData.data.length,
        encodedSize: encodedData.length
      });

      return {
        data: encodedData,
        size: encodedData.length,
        width: imageData.width,
        height: imageData.height,
        format,
        progressive: true,
        scans: options.scans || 3
      };
      
    } catch (error) {
      this.logger.error('Progressive encoding failed', { error: error.message });
      throw new CompressionError(`Progressive encoding failed: ${error.message}`, 'progressive');
    }
  }

  async encodeProgressiveJPEG(imageData, options) {
    const { data, width, height } = imageData;
    const scans = options.scans || 3;
    
    // Create progressive JPEG structure
    const jpegData = [];
    
    // SOI (Start of Image)
    jpegData.push(0xFF, 0xD8);
    
    // APP0 marker
    jpegData.push(0xFF, 0xE0);
    jpegData.push(0x00, 0x10); // Length
    jpegData.push(0x4A, 0x46, 0x49, 0x46, 0x00); // "JFIF\0"
    jpegData.push(0x01, 0x01); // Version
    jpegData.push(0x01); // Units (DPI)
    jpegData.push(0x00, 0x48); // X density
    jpegData.push(0x00, 0x48); // Y density
    jpegData.push(0x00, 0x00); // Thumbnail
    
    // DQT (Define Quantization Tables)
    jpegData.push(...this.createDQTTables(options.quality || 0.8));
    
    // SOF2 (Start of Frame - Progressive DCT)
    jpegData.push(...this.createSOF2Marker(width, height));
    
    // DHT (Define Huffman Tables)
    jpegData.push(...this.createDHTTables());
    
    // SOS (Start of Scan) - Multiple scans for progressive
    for (let scan = 0; scan < scans; scan++) {
      jpegData.push(...this.createSOSMarker(scan, scans));
      jpegData.push(...this.encodeScan(data, width, height, scan, scans));
    }
    
    // EOI (End of Image)
    jpegData.push(0xFF, 0xD9);
    
    return new Uint8Array(jpegData);
  }

  createDQTTables(quality) {
    const tables = [];
    
    // Luminance quantization table
    const luminanceTable = [
      16, 11, 10, 16, 24, 40, 51, 61,
      12, 12, 14, 19, 26, 58, 60, 55,
      14, 13, 16, 24, 40, 57, 69, 56,
      14, 17, 22, 29, 51, 87, 80, 62,
      18, 22, 37, 56, 68, 109, 103, 77,
      24, 35, 55, 64, 81, 104, 113, 92,
      49, 64, 78, 87, 103, 121, 120, 101,
      72, 92, 95, 98, 112, 100, 103, 99
    ];
    
    // Chrominance quantization table
    const chrominanceTable = [
      17, 18, 24, 47, 99, 99, 99, 99,
      18, 21, 26, 66, 99, 99, 99, 99,
      24, 26, 56, 99, 99, 99, 99, 99,
      47, 66, 99, 99, 99, 99, 99, 99,
      99, 99, 99, 99, 99, 99, 99, 99,
      99, 99, 99, 99, 99, 99, 99, 99,
      99, 99, 99, 99, 99, 99, 99, 99,
      99, 99, 99, 99, 99, 99, 99, 99
    ];
    
    // Scale tables based on quality
    const scaleFactor = quality < 0.5 ? 2.0 - quality * 2 : 1.0 / quality;
    
    const scaledLuminance = luminanceTable.map(val => Math.max(1, Math.round(val * scaleFactor)));
    const scaledChrominance = chrominanceTable.map(val => Math.max(1, Math.round(val * scaleFactor)));
    
    // DQT marker for luminance
    tables.push(0xFF, 0xDB); // DQT
    tables.push(0x00, 0x43); // Length
    tables.push(0x00); // Table index 0, 8-bit precision
    tables.push(...scaledLuminance);
    
    // DQT marker for chrominance
    tables.push(0xFF, 0xDB); // DQT
    tables.push(0x00, 0x43); // Length
    tables.push(0x01); // Table index 1, 8-bit precision
    tables.push(...scaledChrominance);
    
    return tables;
  }

  createSOF2Marker(width, height) {
    const marker = [];
    
    marker.push(0xFF, 0xC2); // SOF2 (Progressive DCT)
    marker.push(0x00, 0x11); // Length
    marker.push(0x08); // Sample precision (8 bits)
    
    // Height
    marker.push((height >> 8) & 0xFF);
    marker.push(height & 0xFF);
    
    // Width
    marker.push((width >> 8) & 0xFF);
    marker.push(width & 0xFF);
    
    marker.push(0x03); // Number of components
    
    // Component specifications
    marker.push(0x01, 0x11, 0x00); // Y component (ID, sampling, Q table)
    marker.push(0x02, 0x11, 0x01); // Cb component
    marker.push(0x03, 0x11, 0x01); // Cr component
    
    return marker;
  }

  createDHTTables() {
    const tables = [];
    
    // DC Huffman table for luminance
    tables.push(0xFF, 0xC4); // DHT
    tables.push(0x00, 0x1F); // Length
    tables.push(0x00); // Table index 0, DC
    
    // Huffman code lengths and values for DC luminance
    const dcLuminanceLengths = [0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
    const dcLuminanceValues = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    
    tables.push(...dcLuminanceLengths, ...dcLuminanceValues);
    
    // AC Huffman table for luminance
    tables.push(0xFF, 0xC4); // DHT
    tables.push(0x00, 0xB5); // Length
    tables.push(0x10); // Table index 1, AC
    
    // Huffman code lengths and values for AC luminance
    const acLuminanceLengths = [0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7D];
    const acLuminanceValues = [
      0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07,
      0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08, 0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0,
      0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
      0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49,
      0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69,
      0x6A, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
      0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7,
      0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5,
      0xC6, 0xC7, 0xC8, 0xC9, 0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
      0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8,
      0xF9, 0xFA
    ];
    
    tables.push(...acLuminanceLengths, ...acLuminanceValues);
    
    return tables;
  }

  createSOSMarker(scan, totalScans) {
    const marker = [];
    
    marker.push(0xFF, 0xDA); // SOS
    marker.push(0x00, 0x0C); // Length
    marker.push(0x03); // Number of components
    
    // Component selectors and tables
    marker.push(0x01, 0x00); // Y component
    marker.push(0x02, 0x11); // Cb component
    marker.push(0x03, 0x11); // Cr component
    
    // Spectral selection and approximation
    const spectralStart = scan === 0 ? 0 : Math.floor(64 / totalScans) * scan;
    const spectralEnd = scan === totalScans - 1 ? 63 : Math.floor(64 / totalScans) * (scan + 1) - 1;
    
    marker.push(spectralStart, spectralEnd, 0x00);
    
    return marker;
  }

  encodeScan(data, width, height, scan, totalScans) {
    // Simplified scan encoding
    // In reality, this would involve complex DCT and entropy coding
    
    const scanData = [];
    
    // Encode image data for this scan
    const blockSize = 8;
    const scanIndex = Math.floor((scan / totalScans) * 64);
    
    for (let y = 0; y < height; y += blockSize) {
      for (let x = 0; x < width; x += blockSize) {
        const block = this.extractBlock(data, width, height, x, y);
        const dctBlock = this.applyDCT(block);
        const quantizedBlock = this.quantizeBlock(dctBlock, scanIndex);
        
        scanData.push(...this.encodeBlock(quantizedBlock));
      }
    }
    
    return scanData;
  }

  extractBlock(data, width, height, startX, startY) {
    const block = new Float32Array(64);
    
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const pixelX = Math.min(startX + x, width - 1);
        const pixelY = Math.min(startY + y, height - 1);
        const index = (pixelY * width + pixelX) * 4;
        
        // Convert to grayscale for simplicity
        block[y * 8 + x] = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
      }
    }
    
    return block;
  }

  applyDCT(block) {
    // Simplified DCT implementation
    const dctBlock = new Float32Array(64);
    const scale = 1 / 16;
    
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
        
        const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
        const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
        
        dctBlock[v * 8 + u] = sum * cu * cv * scale;
      }
    }
    
    return dctBlock;
  }

  quantizeBlock(dctBlock, startIndex) {
    const quantized = new Int16Array(64);
    
    for (let i = startIndex; i < 64; i++) {
      quantized[i] = Math.round(dctBlock[i] / 16); // Simplified quantization
    }
    
    return quantized;
  }

  encodeBlock(block) {
    // Simplified block encoding (RLC + Huffman)
    const encoded = [];
    
    for (let i = 0; i < 64; i++) {
      if (block[i] !== 0) {
        encoded.push(0x00); // Run length
        encoded.push(block[i]); // Amplitude
      }
    }
    
    return encoded;
  }

  async encodeInterlacedPNG(imageData, options) {
    // PNG interlacing using Adam7 algorithm
    const { data, width, height } = imageData;
    
    // Adam7 pattern
    const passes = [
      { xStart: 0, yStart: 0, xStep: 8, yStep: 8 }, // Pass 1: 1/64
      { xStart: 4, yStart: 0, xStep: 8, yStep: 8 }, // Pass 2: 1/32
      { xStart: 0, yStart: 4, xStep: 4, yStep: 8 }, // Pass 3: 1/16
      { xStart: 2, yStart: 0, xStep: 4, yStep: 4 }, // Pass 4: 1/8
      { xStart: 0, yStart: 2, xStep: 2, yStep: 4 }, // Pass 5: 1/4
      { xStart: 1, yStart: 0, xStep: 2, yStep: 2 }, // Pass 6: 1/2
      { xStart: 0, yStart: 1, xStep: 1, yStep: 2 }  // Pass 7: full
    ];
    
    const interlacedData = [];
    
    for (const pass of passes) {
      for (let y = pass.yStart; y < height; y += pass.yStep) {
        for (let x = pass.xStart; x < width; x += pass.xStep) {
          const index = (y * width + x) * 4;
          interlacedData.push(data[index], data[index + 1], data[index + 2], data[index + 3]);
        }
      }
    }
    
    return new Uint8Array(interlacedData);
  }

  async encodeProgressiveWebP(imageData, options) {
    // WebP progressive encoding
    // This would use VP8L (lossless) or VP8 (lossy) with progressive features
    
    const { data, width, height } = imageData;
    
    // Simplified progressive WebP encoding
    const webpData = [];
    
    // RIFF header
    webpData.push(0x52, 0x49, 0x46, 0x46); // "RIFF"
    webpData.push(0x00, 0x00, 0x00, 0x00); // File size (placeholder)
    webpData.push(0x57, 0x45, 0x42, 0x50); // "WEBP"
    
    // VP8L chunk for progressive lossless
    webpData.push(0x56, 0x50, 0x38, 0x4C); // "VP8L"
    
    // Calculate chunk size and data
    const vp8lData = this.createProgressiveVP8LData(data, width, height, options);
    webpData.push((vp8lData.length >> 0) & 0xFF, (vp8lData.length >> 8) & 0xFF,
                  (vp8lData.length >> 16) & 0xFF, (vp8lData.length >> 24) & 0xFF);
    webpData.push(...vp8lData);
    
    // Update file size
    const fileSize = webpData.length - 8;
    webpData[4] = (fileSize >> 0) & 0xFF;
    webpData[5] = (fileSize >> 8) & 0xFF;
    webpData[6] = (fileSize >> 16) & 0xFF;
    webpData[7] = (fileSize >> 24) & 0xFF;
    
    return new Uint8Array(webpData);
  }

  createProgressiveVP8LData(data, width, height, options) {
    // Simplified progressive VP8L encoding
    const vp8lData = [];
    
    // VP8L header
    vp8lData.push(0x2F); // VP8L signature
    
    // Width and height
    const w = width - 1;
    const h = height - 1;
    vp8lData.push((w >> 0) & 0xFF, (w >> 8) & 0xFF, (w >> 14) & 0xFF | ((h >> 0) & 0x3) << 6);
    vp8lData.push((h >> 2) & 0xFF, (h >> 10) & 0xFF);
    
    // Alpha flag
    let hasAlpha = false;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        hasAlpha = true;
        break;
      }
    }
    
    if (hasAlpha) {
      vp8lData[4] |= 0x10;
    }
    
    // Version
    vp8lData.push(0x00);
    
    // Progressive encoding - multiple resolution levels
    const levels = Math.min(4, Math.floor(Math.log2(Math.max(width, height))));
    
    for (let level = levels; level >= 0; level--) {
      const levelWidth = Math.max(1, width >> level);
      const levelHeight = Math.max(1, height >> level);
      
      // Encode this level
      for (let y = 0; y < levelHeight; y++) {
        for (let x = 0; x < levelWidth; x++) {
          const srcY = y << level;
          const srcX = x << level;
          const index = (srcY * width + srcX) * 4;
          
          vp8lData.push(data[index], data[index + 1], data[index + 2]);
          if (hasAlpha) {
            vp8lData.push(data[index + 3]);
          }
        }
      }
    }
    
    return vp8lData;
  }
}

export default ProgressiveCompression;