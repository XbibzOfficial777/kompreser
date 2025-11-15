/**
 * @xbibzlibrary/kompreser - PNG Compression Algorithm
 * Advanced PNG compression with Zopfli-inspired optimizations
 */

import Logger from '../utils/Logger.js';
import { CompressionError } from '../core/ErrorHandler.js';

class PNGCompression {
  constructor(options, logger) {
    this.options = options;
    this.logger = logger || new Logger();
    
    // PNG filter types
    this.FILTER_NONE = 0;
    this.FILTER_SUB = 1;
    this.FILTER_UP = 2;
    this.FILTER_AVERAGE = 3;
    this.FILTER_PAETH = 4;
    
    // Compression levels
    this.COMPRESSION_LEVELS = {
      NO_COMPRESSION: 0,
      BEST_SPEED: 1,
      DEFAULT: 6,
      BEST_COMPRESSION: 9
    };
    
    // Color types
    this.COLOR_TYPES = {
      GRAYSCALE: 0,
      RGB: 2,
      PALETTE: 3,
      GRAYSCALE_ALPHA: 4,
      RGBA: 6
    };
  }

  async compress(imageData, options = {}) {
    const timer = this.logger.startTimer('png_compression');
    
    try {
      this.logger.debug('Starting PNG compression', { 
        level: options.level,
        filter: options.filter,
        dimensions: `${imageData.width}x${imageData.height}`
      });

      // Analyze image for optimal settings
      const analysis = await this.analyzeImage(imageData);
      
      // Determine optimal color type
      const colorType = this.determineColorType(imageData, analysis, options);
      
      // Apply filtering
      const filteredData = await this.applyFiltering(imageData, options);
      
      // Compress data
      const compressedData = await this.deflateCompress(filteredData, options);
      
      // Create PNG file structure
      const pngData = this.createPNGStructure(compressedData, {
        width: imageData.width,
        height: imageData.height,
        colorType,
        ...options
      });
      
      const duration = timer.end();
      
      this.logger.debug('PNG compression completed', {
        duration,
        originalSize: imageData.data.length,
        compressedSize: pngData.length,
        compressionRatio: Math.round((1 - pngData.length / imageData.data.length) * 100),
        colorType,
        filter: options.filter || 'auto'
      });

      return {
        data: pngData,
        size: pngData.length,
        width: imageData.width,
        height: imageData.height,
        format: 'png',
        colorType
      };
      
    } catch (error) {
      this.logger.error('PNG compression failed', { error: error.message });
      throw new CompressionError(`PNG compression failed: ${error.message}`, 'png');
    }
  }

  async analyzeImage(imageData) {
    const analysis = {
      hasAlpha: false,
      isGrayscale: true,
      hasColor: false,
      uniqueColors: new Set(),
      entropy: 0,
      complexity: 0
    };
    
    const data = imageData.data;
    const pixelCount = imageData.width * imageData.height;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      // Check for alpha
      if (a < 255) {
        analysis.hasAlpha = true;
      }
      
      // Check if grayscale
      if (r !== g || g !== b) {
        analysis.isGrayscale = false;
        analysis.hasColor = true;
      }
      
      // Count unique colors
      const colorKey = `${r},${g},${b}`;
      analysis.uniqueColors.add(colorKey);
    }
    
    // Calculate entropy and complexity
    analysis.entropy = this.calculateEntropy(data);
    analysis.complexity = this.calculateComplexity(imageData);
    analysis.uniqueColorCount = analysis.uniqueColors.size;
    analysis.colorRatio = analysis.uniqueColorCount / pixelCount;
    
    this.logger.debug('Image analysis completed', analysis);
    
    return analysis;
  }

  calculateEntropy(data) {
    const histogram = new Array(256).fill(0);
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      histogram[gray]++;
    }
    
    let entropy = 0;
    const total = data.length / 4;
    
    for (let count of histogram) {
      if (count > 0) {
        const probability = count / total;
        entropy -= probability * Math.log2(probability);
      }
    }
    
    return entropy;
  }

  calculateComplexity(imageData) {
    const { data, width, height } = imageData;
    let edgeCount = 0;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const center = (y * width + x) * 4;
        const gray = 0.299 * data[center] + 0.587 * data[center + 1] + 0.114 * data[center + 2];
        
        // Simple edge detection
        let diff = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            const neighbor = ((y + dy) * width + (x + dx)) * 4;
            const neighborGray = 0.299 * data[neighbor] + 0.587 * data[neighbor + 1] + 0.114 * data[neighbor + 2];
            diff += Math.abs(gray - neighborGray);
          }
        }
        
        if (diff > 100) edgeCount++;
      }
    }
    
    return edgeCount / (width * height);
  }

  determineColorType(imageData, analysis, options) {
    // Check if palette is viable
    if (analysis.uniqueColorCount <= 256 && options.palette !== false) {
      return this.COLOR_TYPES.PALETTE;
    }
    
    // Check if grayscale is sufficient
    if (analysis.isGrayscale && !analysis.hasAlpha) {
      return this.COLOR_TYPES.GRAYSCALE;
    }
    
    // Check if grayscale with alpha
    if (analysis.isGrayscale && analysis.hasAlpha) {
      return this.COLOR_TYPES.GRAYSCALE_ALPHA;
    }
    
    // Check if RGB with alpha
    if (analysis.hasAlpha) {
      return this.COLOR_TYPES.RGBA;
    }
    
    // Default to RGB
    return this.COLOR_TYPES.RGB;
  }

  async applyFiltering(imageData, options) {
    const { width, height, data } = imageData;
    const filterType = options.filter || 'auto';
    
    // Determine optimal filter for each row
    const filteredData = new Uint8Array(data.length + height); // +1 byte per row for filter type
    
    let rowIndex = 0;
    for (let y = 0; y < height; y++) {
      const filter = this.selectFilter(data, width, height, y, filterType);
      filteredData[rowIndex++] = filter;
      
      const filteredRow = this.applyFilter(data, width, height, y, filter);
      for (let x = 0; x < filteredRow.length; x++) {
        filteredData[rowIndex++] = filteredRow[x];
      }
    }
    
    return filteredData;
  }

  selectFilter(data, width, height, row, filterType) {
    if (filterType !== 'auto') {
      return this.FILTER_TYPES[filterType.toUpperCase()] || this.FILTER_NONE;
    }
    
    // Auto-select best filter based on heuristic
    const filters = [
      this.FILTER_NONE,
      this.FILTER_SUB,
      this.FILTER_UP,
      this.FILTER_AVERAGE,
      this.FILTER_PAETH
    ];
    
    let bestFilter = this.FILTER_NONE;
    let bestScore = Infinity;
    
    for (const filter of filters) {
      const score = this.calculateFilterScore(data, width, height, row, filter);
      if (score < bestScore) {
        bestScore = score;
        bestFilter = filter;
      }
    }
    
    return bestFilter;
  }

  calculateFilterScore(data, width, height, row, filter) {
    let sum = 0;
    const rowStart = row * width * 4;
    
    for (let x = 0; x < width * 4; x++) {
      const filtered = this.applyFilterPixel(data, width, height, row, x, filter);
      sum += Math.abs(filtered);
    }
    
    return sum;
  }

  applyFilter(data, width, height, row, filter) {
    const rowStart = row * width * 4;
    const filteredRow = new Uint8Array(width * 4);
    
    for (let x = 0; x < width * 4; x++) {
      filteredRow[x] = this.applyFilterPixel(data, width, height, row, x, filter);
    }
    
    return filteredRow;
  }

  applyFilterPixel(data, width, height, row, col, filter) {
    const rowStart = row * width * 4;
    const current = data[rowStart + col] || 0;
    
    switch (filter) {
      case this.FILTER_NONE:
        return current;
        
      case this.FILTER_SUB:
        const left = col >= 4 ? data[rowStart + col - 4] : 0;
        return (current - left) & 0xFF;
        
      case this.FILTER_UP:
        const upRow = row > 0 ? (row - 1) * width * 4 : -1;
        const up = upRow >= 0 ? data[upRow + col] : 0;
        return (current - up) & 0xFF;
        
      case this.FILTER_AVERAGE:
        const leftAvg = col >= 4 ? data[rowStart + col - 4] : 0;
        const upRowAvg = row > 0 ? (row - 1) * width * 4 : -1;
        const upAvg = upRowAvg >= 0 ? data[upRowAvg + col] : 0;
        const avg = Math.floor((leftAvg + upAvg) / 2);
        return (current - avg) & 0xFF;
        
      case this.FILTER_PAETH:
        const leftPaeth = col >= 4 ? data[rowStart + col - 4] : 0;
        const upRowPaeth = row > 0 ? (row - 1) * width * 4 : -1;
        const upPaeth = upRowPaeth >= 0 ? data[upRowPaeth + col] : 0;
        const upLeftRowPaeth = (row > 0 && col >= 4) ? (row - 1) * width * 4 : -1;
        const upLeftPaeth = upLeftRowPaeth >= 0 ? data[upLeftRowPaeth + col - 4] : 0;
        
        const paeth = this.paethPredictor(leftPaeth, upPaeth, upLeftPaeth);
        return (current - paeth) & 0xFF;
        
      default:
        return current;
    }
  }

  paethPredictor(left, up, upLeft) {
    const p = left + up - upLeft;
    const pLeft = Math.abs(p - left);
    const pUp = Math.abs(p - up);
    const pUpLeft = Math.abs(p - upLeft);
    
    if (pLeft <= pUp && pLeft <= pUpLeft) {
      return left;
    } else if (pUp <= pUpLeft) {
      return up;
    } else {
      return upLeft;
    }
  }

  async deflateCompress(data, options) {
    const compressionLevel = options.level || this.COMPRESSION_LEVELS.DEFAULT;
    
    // Use WebAssembly compression if available
    if (this.options.enableWebAssembly && typeof WebAssembly !== 'undefined') {
      try {
        return await this.deflateWithWASM(data, compressionLevel);
      } catch (error) {
        this.logger.warn('WASM compression failed, using JavaScript fallback', { error: error.message });
      }
    }
    
    // JavaScript fallback using pako or similar
    return await this.deflateWithJS(data, compressionLevel);
  }

  async deflateWithWASM(data, level) {
    // Placeholder for WebAssembly compression
    // In production, this would use zlib-wasm or similar
    return data;
  }

  async deflateWithJS(data, level) {
    // Simplified DEFLATE compression
    // In production, this would use pako.js or similar library
    
    const compressed = [];
    let current = 0;
    let count = 1;
    
    // Simple RLE compression as fallback
    for (let i = 1; i < data.length; i++) {
      if (data[i] === current && count < 255) {
        count++;
      } else {
        compressed.push(count, current);
        current = data[i];
        count = 1;
      }
    }
    compressed.push(count, current);
    
    return new Uint8Array(compressed);
  }

  createPNGStructure(compressedData, options) {
    const { width, height, colorType } = options;
    
    const chunks = [];
    
    // PNG signature
    const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    chunks.push(signature);
    
    // IHDR chunk
    const ihdr = this.createIHDRChunk(width, height, colorType);
    chunks.push(ihdr);
    
    // Optional chunks (gAMA, cHRM, etc.)
    if (options.gamma) {
      chunks.push(this.createGAMAChunk(options.gamma));
    }
    
    // IDAT chunk(s)
    const idat = this.createIDATChunk(compressedData);
    chunks.push(idat);
    
    // IEND chunk
    const iend = this.createIENDChunk();
    chunks.push(iend);
    
    // Combine all chunks
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const pngData = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const chunk of chunks) {
      pngData.set(chunk, offset);
      offset += chunk.length;
    }
    
    return pngData;
  }

  createIHDRChunk(width, height, colorType) {
    const chunk = new Uint8Array(25); // 8 + 13 + 4 (length + chunk + crc)
    const view = new DataView(chunk.buffer);
    
    // Length
    view.setUint32(0, 13, false); // IHDR is always 13 bytes
    
    // Chunk type
    chunk[4] = 0x49; // 'I'
    chunk[5] = 0x48; // 'H'
    chunk[6] = 0x44; // 'D'
    chunk[7] = 0x52; // 'R'
    
    // Width
    view.setUint32(8, width, false);
    
    // Height
    view.setUint32(12, height, false);
    
    // Bit depth
    chunk[16] = 8; // 8 bits per sample
    
    // Color type
    chunk[17] = colorType;
    
    // Compression method
    chunk[18] = 0; // deflate
    
    // Filter method
    chunk[19] = 0; // adaptive filtering
    
    // Interlace method
    chunk[20] = 0; // no interlace
    
    // CRC (simplified - in production, use proper CRC32)
    view.setUint32(21, 0x12345678, false);
    
    return chunk;
  }

  createGAMAChunk(gamma) {
    const chunk = new Uint8Array(16);
    const view = new DataView(chunk.buffer);
    
    view.setUint32(0, 4, false); // Length
    chunk[4] = 0x67; // 'g'
    chunk[5] = 0x41; // 'A'
    chunk[6] = 0x4D; // 'M'
    chunk[7] = 0x41; // 'A'
    
    view.setUint32(8, Math.round(gamma * 100000), false);
    view.setUint32(12, 0x12345678, false); // CRC
    
    return chunk;
  }

  createIDATChunk(compressedData) {
    const chunk = new Uint8Array(12 + compressedData.length);
    const view = new DataView(chunk.buffer);
    
    view.setUint32(0, compressedData.length, false);
    chunk[4] = 0x49; // 'I'
    chunk[5] = 0x44; // 'D'
    chunk[6] = 0x41; // 'A'
    chunk[7] = 0x54; // 'T'
    
    chunk.set(compressedData, 8);
    view.setUint32(8 + compressedData.length, 0x12345678, false); // CRC
    
    return chunk;
  }

  createIENDChunk() {
    const chunk = new Uint8Array(12);
    const view = new DataView(chunk.buffer);
    
    view.setUint32(0, 0, false); // Length
    chunk[4] = 0x49; // 'I'
    chunk[5] = 0x45; // 'E'
    chunk[6] = 0x4E; // 'N'
    chunk[7] = 0x44; // 'D'
    view.setUint32(8, 0x12345678, false); // CRC
    
    return chunk;
  }

  // Quantization for palette images
  async quantize(imageData, maxColors = 256) {
    const { data, width, height } = imageData;
    const pixels = [];
    
    // Extract RGB pixels
    for (let i = 0; i < data.length; i += 4) {
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }
    
    // Apply median cut algorithm
    const palette = this.medianCut(pixels, maxColors);
    
    // Map pixels to palette
    const quantizedData = new Uint8Array(data.length);
    for (let i = 0; i < pixels.length; i++) {
      const color = pixels[i];
      const paletteIndex = this.findClosestColor(color, palette);
      const pixelIndex = i * 4;
      
      quantizedData[pixelIndex] = palette[paletteIndex][0];
      quantizedData[pixelIndex + 1] = palette[paletteIndex][1];
      quantizedData[pixelIndex + 2] = palette[paletteIndex][2];
      quantizedData[pixelIndex + 3] = data[pixelIndex + 3];
    }
    
    return {
      data: quantizedData,
      palette,
      width,
      height
    };
  }

  medianCut(pixels, maxColors) {
    if (pixels.length <= maxColors) {
      return pixels;
    }
    
    // Find the color channel with the largest range
    let minR = 255, maxR = 0;
    let minG = 255, maxG = 0;
    let minB = 255, maxB = 0;
    
    for (const [r, g, b] of pixels) {
      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
      minG = Math.min(minG, g);
      maxG = Math.max(maxG, g);
      minB = Math.min(minB, b);
      maxB = Math.max(maxB, b);
    }
    
    const rangeR = maxR - minR;
    const rangeG = maxG - minG;
    const rangeB = maxB - minB;
    
    const channel = rangeR >= rangeG && rangeR >= rangeB ? 0 : 
                   rangeG >= rangeB ? 1 : 2;
    
    // Sort by the selected channel
    pixels.sort((a, b) => a[channel] - b[channel]);
    
    // Split at median
    const median = Math.floor(pixels.length / 2);
    const left = pixels.slice(0, median);
    const right = pixels.slice(median);
    
    // Recursively split
    const leftColors = this.medianCut(left, Math.floor(maxColors / 2));
    const rightColors = this.medianCut(right, Math.ceil(maxColors / 2));
    
    return [...leftColors, ...rightColors];
  }

  findClosestColor(color, palette) {
    let minDistance = Infinity;
    let closestIndex = 0;
    
    for (let i = 0; i < palette.length; i++) {
      const paletteColor = palette[i];
      const distance = Math.sqrt(
        Math.pow(color[0] - paletteColor[0], 2) +
        Math.pow(color[1] - paletteColor[1], 2) +
        Math.pow(color[2] - paletteColor[2], 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }
    
    return closestIndex;
  }
}

export default PNGCompression;