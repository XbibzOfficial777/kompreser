/**
 * @xbibzlibrary/kompreser - AVIF Compression Algorithm
 * Advanced AVIF compression with AV1 encoding
 */

import Logger from '../utils/Logger.js';
import { CompressionError, UnsupportedError } from '../core/ErrorHandler.js';

class AVIFCompression {
  constructor(options, logger) {
    this.options = options;
    this.logger = logger || new Logger();
    
    // AVIF encoding parameters
    this.DEFAULT_PARAMS = {
      quality: 0.8,
      speed: 6,
      threads: 0,
      tileRows: 0,
      tileCols: 0,
      enableSharpYUV: false,
      cpuUsed: 4,
      noiseSensitivity: 0,
      sharpness: 0,
      tune: 'psnr'
    };
  }

  async compress(imageData, options = {}) {
    const timer = this.logger.startTimer('avif_compression');
    
    try {
      // Check AVIF support
      if (!this.isAVIFSupported()) {
        throw new UnsupportedError('AVIF format is not supported in this environment');
      }

      this.logger.debug('Starting AVIF compression', { 
        quality: options.quality,
        speed: options.speed,
        dimensions: `${imageData.width}x${imageData.height}`
      });

      // Analyze image for optimal settings
      const analysis = await this.analyzeImage(imageData);
      
      // Determine AV1 encoding parameters
      const encodingParams = this.determineEncodingParams(imageData, analysis, options);
      
      // Encode using AV1
      const avifData = await this.encodeAV1(imageData, encodingParams);
      
      // Create AVIF container
      const containerData = await this.createAVIFContainer(avifData, encodingParams);
      
      const duration = timer.end();
      
      this.logger.debug('AVIF compression completed', {
        duration,
        originalSize: imageData.data.length,
        compressedSize: containerData.length,
        compressionRatio: Math.round((1 - containerData.length / imageData.data.length) * 100),
        quality: encodingParams.quality,
        speed: encodingParams.speed
      });

      return {
        data: containerData,
        size: containerData.length,
        width: imageData.width,
        height: imageData.height,
        format: 'avif',
        quality: encodingParams.quality
      };
      
    } catch (error) {
      this.logger.error('AVIF compression failed', { error: error.message });
      throw new CompressionError(`AVIF compression failed: ${error.message}`, 'avif');
    }
  }

  isAVIFSupported() {
    try {
      if (typeof document === 'undefined') {
        return false;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      
      const dataURL = canvas.toDataURL('image/avif');
      return dataURL.startsWith('data:image/avif');
    } catch (error) {
      return false;
    }
  }

  async analyzeImage(imageData) {
    const analysis = {
      hasAlpha: false,
      isHDR: false,
      complexity: 0,
      motionLevel: 0,
      grainLevel: 0
    };
    
    const { data, width, height } = imageData;
    
    // Check for alpha channel
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        analysis.hasAlpha = true;
        break;
      }
    }
    
    // Check for HDR content (simplified)
    let maxLuminance = 0;
    for (let i = 0; i < data.length; i += 4) {
      const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      maxLuminance = Math.max(maxLuminance, luminance);
    }
    
    if (maxLuminance > 200) {
      analysis.isHDR = true;
    }
    
    // Calculate complexity
    analysis.complexity = this.calculateComplexity(imageData);
    
    // Detect grain (simplified)
    analysis.grainLevel = this.detectGrain(imageData);
    
    this.logger.debug('AVIF image analysis', analysis);
    
    return analysis;
  }

  calculateComplexity(imageData) {
    const { data, width, height } = imageData;
    let complexity = 0;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const center = (y * width + x) * 4;
        
        // Calculate local variance
        const neighbors = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const neighbor = ((y + dy) * width + (x + dx)) * 4;
            const luminance = 0.299 * data[neighbor] + 0.587 * data[neighbor + 1] + 0.114 * data[neighbor + 2];
            neighbors.push(luminance);
          }
        }
        
        const centerLuminance = 0.299 * data[center] + 0.587 * data[center + 1] + 0.114 * data[center + 2];
        const variance = neighbors.reduce((sum, val) => sum + Math.abs(val - centerLuminance), 0) / neighbors.length;
        complexity += variance;
      }
    }
    
    return complexity / (width * height);
  }

  detectGrain(imageData) {
    const { data, width, height } = imageData;
    let grainScore = 0;
    
    // Simple grain detection based on high-frequency content
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        const center = (y * width + x) * 4;
        const luminance = 0.299 * data[center] + 0.587 * data[center + 1] + 0.114 * data[center + 2];
        
        // Check high-frequency patterns
        let highFreq = 0;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            if (dx === 0 && dy === 0) continue;
            const neighbor = ((y + dy) * width + (x + dx)) * 4;
            const neighborLuminance = 0.299 * data[neighbor] + 0.587 * data[neighbor + 1] + 0.114 * data[neighbor + 2];
            if (Math.abs(luminance - neighborLuminance) > 10) {
              highFreq++;
            }
          }
        }
        
        if (highFreq > 10) {
          grainScore++;
        }
      }
    }
    
    return grainScore / (width * height);
  }

  determineEncodingParams(imageData, analysis, options) {
    const params = {
      ...this.DEFAULT_PARAMS,
      ...options
    };
    
    // Adjust quality based on complexity
    if (analysis.complexity > 1000) {
      params.quality = Math.max(0.5, params.quality - 0.1);
    }
    
    // Adjust speed based on quality target
    if (params.quality > 0.9) {
      params.speed = Math.max(1, params.speed - 2);
    } else if (params.quality < 0.6) {
      params.speed = Math.min(9, params.speed + 2);
    }
    
    // Enable grain synthesis for high-grain content
    if (analysis.grainLevel > 0.1) {
      params.snsStrength = Math.min(100, params.snsStrength + 20);
    }
    
    // Adjust tile configuration for large images
    if (imageData.width > 2048 || imageData.height > 2048) {
      params.tileCols = Math.min(3, Math.floor(Math.log2(imageData.width / 512)));
      params.tileRows = Math.min(3, Math.floor(Math.log2(imageData.height / 512)));
    }
    
    // Enable sharp YUV for high-quality encoding
    if (params.quality > 0.85) {
      params.enableSharpYUV = true;
    }
    
    return params;
  }

  async encodeAV1(imageData, params) {
    // AV1 encoding implementation
    // This would use a WebAssembly implementation of AV1 in production
    
    const { data, width, height } = imageData;
    
    // Create AV1 bitstream
    const av1Data = [];
    
    // Sequence header
    av1Data.push(...this.createSequenceHeader(width, height, params));
    
    // Frame header
    av1Data.push(...this.createFrameHeader(width, height, params));
    
    // Tile data
    const tiles = this.createTiles(imageData, params);
    for (const tile of tiles) {
      av1Data.push(...tile);
    }
    
    return new Uint8Array(av1Data);
  }

  createSequenceHeader(width, height, params) {
    const header = [];
    
    // Profile (0 = main, 1 = high, 2 = professional)
    header.push(0x00);
    
    // Level
    header.push(0x08); // Level 4.0 for 1080p
    
    // Tier
    header.push(0x00); // Main tier
    
    // Bit depth
    header.push(0x08); // 8-bit
    
    // Color primaries
    header.push(0x01); // BT.709
    
    // Transfer characteristics
    header.push(0x01); // BT.709
    
    // Matrix coefficients
    header.push(0x01); // BT.709
    
    // Frame width and height
    header.push((width >> 8) & 0xFF, width & 0xFF);
    header.push((height >> 8) & 0xFF, height & 0xFF);
    
    // Frame rate
    header.push(0x00, 0x00, 0x00, 0x00); // Variable frame rate
    
    return header;
  }

  createFrameHeader(width, height, params) {
    const header = [];
    
    // Frame type (0 = key frame)
    header.push(0x00);
    
    // Show frame
    header.push(0x01);
    
    // Error resilient mode
    header.push(0x00);
    
    // Frame width and height (can differ from sequence)
    header.push((width >> 8) & 0xFF, width & 0xFF);
    header.push((height >> 8) & 0xFF, height & 0xFF);
    
    // Render width and height
    header.push((width >> 8) & 0xFF, width & 0xFF);
    header.push((height >> 8) & 0xFF, height & 0xFF);
    
    // Quantization parameters
    const qIndex = Math.round((1 - params.quality) * 255);
    header.push(qIndex);
    
    // Loop filter parameters
    header.push(params.filterLevel || 0);
    header.push(params.filterSharpness || 0);
    
    return header;
  }

  createTiles(imageData, params) {
    const { data, width, height } = imageData;
    const tiles = [];
    
    const tileWidth = Math.min(512, width);
    const tileHeight = Math.min(512, height);
    
    const tilesX = Math.ceil(width / tileWidth);
    const tilesY = Math.ceil(height / tileHeight);
    
    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const tile = this.createTile(imageData, tx, ty, tileWidth, tileHeight, params);
        tiles.push(tile);
      }
    }
    
    return tiles;
  }

  createTile(imageData, tileX, tileY, tileWidth, tileHeight, params) {
    const { data, width, height } = imageData;
    const tile = [];
    
    // Tile header
    tile.push(0x00); // Tile start
    
    // Extract tile data
    const startX = tileX * tileWidth;
    const startY = tileY * tileHeight;
    
    for (let y = 0; y < tileHeight && startY + y < height; y++) {
      for (let x = 0; x < tileWidth && startX + x < width; x++) {
        const srcIndex = ((startY + y) * width + (startX + x)) * 4;
        
        // Convert to YCbCr
        const r = data[srcIndex];
        const g = data[srcIndex + 1];
        const b = data[srcIndex + 2];
        
        const yVal = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        const cb = Math.round(128 - 0.168736 * r - 0.331264 * g + 0.5 * b);
        const cr = Math.round(128 + 0.5 * r - 0.418688 * g - 0.081312 * b);
        
        tile.push(yVal, cb, cr);
        
        // Alpha if present
        if (params.alpha) {
          tile.push(data[srcIndex + 3]);
        }
      }
    }
    
    return tile;
  }

  async createAVIFContainer(av1Data, params) {
    const container = [];
    
    // File Type Box (ftyp)
    container.push(...this.createFTYPBox());
    
    // Meta Box (meta)
    container.push(...this.createMetaBox(params));
    
    // Media Data Box (mdat)
    container.push(...this.createMDATBox(av1Data));
    
    return new Uint8Array(container);
  }

  createFTYPBox() {
    const box = [];
    
    // Box size
    box.push(0x00, 0x00, 0x00, 0x18);
    
    // Box type
    box.push(0x66, 0x74, 0x79, 0x70); // "ftyp"
    
    // Major brand
    box.push(0x61, 0x76, 0x69, 0x66); // "avif"
    
    // Minor version
    box.push(0x00, 0x00, 0x00, 0x00);
    
    // Compatible brands
    box.push(0x61, 0x76, 0x69, 0x66); // "avif"
    box.push(0x6D, 0x69, 0x66, 0x31); // "mif1"
    box.push(0x6D, 0x69, 0x61, 0x66); // "miaf"
    
    return box;
  }

  createMetaBox(params) {
    const box = [];
    
    // Box size (placeholder)
    box.push(0x00, 0x00, 0x00, 0x00);
    
    // Box type
    box.push(0x6D, 0x65, 0x74, 0x61); // "meta"
    
    // Handler Box
    box.push(...this.createHandlerBox());
    
    // Primary Item Box
    box.push(...this.createPITMBox());
    
    // Item Info Box
    box.push(...this.createIINFBox(params));
    
    // Item Location Box
    box.push(...this.createILOCBox());
    
    // Item Properties Box
    box.push(...this.createIPRPBox(params));
    
    // Update box size
    const size = box.length;
    box[0] = (size >> 24) & 0xFF;
    box[1] = (size >> 16) & 0xFF;
    box[2] = (size >> 8) & 0xFF;
    box[3] = size & 0xFF;
    
    return box;
  }

  createHandlerBox() {
    const box = [];
    
    // Box size
    box.push(0x00, 0x00, 0x00, 0x21);
    
    // Box type
    box.push(0x68, 0x64, 0x6C, 0x72); // "hdlr"
    
    // Version and flags
    box.push(0x00, 0x00, 0x00, 0x00);
    
    // Pre-defined
    box.push(0x00, 0x00, 0x00, 0x00);
    
    // Handler type
    box.push(0x70, 0x69, 0x63, 0x74); // "pict"
    
    // Reserved
    box.push(0x00, 0x00, 0x00, 0x00);
    box.push(0x00, 0x00, 0x00, 0x00);
    box.push(0x00, 0x00, 0x00, 0x00);
    
    // Name
    box.push(0x00);
    
    return box;
  }

  createPITMBox() {
    const box = [];
    
    // Box size
    box.push(0x00, 0x00, 0x00, 0x14);
    
    // Box type
    box.push(0x70, 0x69, 0x74, 0x6D); // "pitm"
    
    // Version and flags
    box.push(0x00, 0x00, 0x00, 0x00);
    
    // Item ID
    box.push(0x00, 0x01);
    
    return box;
  }

  createIINFBox(params) {
    const box = [];
    
    // Box size (placeholder)
    box.push(0x00, 0x00, 0x00, 0x00);
    
    // Box type
    box.push(0x69, 0x69, 0x6E, 0x66); // "iinf"
    
    // Version and flags
    box.push(0x00, 0x00, 0x00, 0x00);
    
    // Entry count
    box.push(0x00, 0x01);
    
    // Item info entry
    box.push(...this.createItemInfoEntry(params));
    
    // Update box size
    const size = box.length;
    box[0] = (size >> 24) & 0xFF;
    box[1] = (size >> 16) & 0xFF;
    box[2] = (size >> 8) & 0xFF;
    box[3] = size & 0xFF;
    
    return box;
  }

  createItemInfoEntry(params) {
    const entry = [];
    
    // Size (placeholder)
    entry.push(0x00, 0x00, 0x00, 0x00);
    
    // Type
    entry.push(0x69, 0x6E, 0x66, 0x65); // "infe"
    
    // Version and flags
    entry.push(0x00, 0x00, 0x00, 0x00);
    
    // Item ID
    entry.push(0x00, 0x01);
    
    // Item protection index
    entry.push(0x00, 0x00);
    
    // Item type
    entry.push(0x61, 0x76, 0x30, 0x31); // "av01"
    
    // Item name
    entry.push(0x00);
    
    // Update size
    const size = entry.length + 4;
    entry[0] = (size >> 24) & 0xFF;
    entry[1] = (size >> 16) & 0xFF;
    entry[2] = (size >> 8) & 0xFF;
    entry[3] = size & 0xFF;
    
    return entry;
  }

  createILOCBox() {
    const box = [];
    
    // Box size
    box.push(0x00, 0x00, 0x00, 0x14);
    
    // Box type
    box.push(0x69, 0x6C, 0x6F, 0x63); // "iloc"
    
    // Version and flags
    box.push(0x00, 0x00, 0x00, 0x00);
    
    // Offset size and length size
    box.push(0x00, 0x00);
    
    // Base offset size and reserved
    box.push(0x00, 0x00);
    
    // Item count
    box.push(0x00, 0x01);
    
    // Item ID
    box.push(0x00, 0x01);
    
    // Construction method
    box.push(0x00, 0x00);
    
    // Data reference index
    box.push(0x00, 0x00);
    
    // Base offset
    box.push(0x00, 0x00, 0x00, 0x00);
    
    // Extent count
    box.push(0x00, 0x01);
    
    // Extent offset and length (will be updated)
    box.push(0x00, 0x00, 0x00, 0x00);
    box.push(0x00, 0x00, 0x00, 0x00);
    
    return box;
  }

  createIPRPBox(params) {
    const box = [];
    
    // Box size (placeholder)
    box.push(0x00, 0x00, 0x00, 0x00);
    
    // Box type
    box.push(0x69, 0x70, 0x72, 0x70); // "iprp"
    
    // Item Property Container Box
    box.push(...this.createIPCOBox(params));
    
    // Item Property Association Box
    box.push(...this.createIPMABox());
    
    // Update box size
    const size = box.length;
    box[0] = (size >> 24) & 0xFF;
    box[1] = (size >> 16) & 0xFF;
    box[2] = (size >> 8) & 0xFF;
    box[3] = size & 0xFF;
    
    return box;
  }

  createIPCOBox(params) {
    const box = [];
    
    // Box size (placeholder)
    box.push(0x00, 0x00, 0x00, 0x00);
    
    // Box type
    box.push(0x69, 0x70, 0x63, 0x6F); // "ipco"
    
    // Image spatial extents property
    box.push(...this.createISPEProperty(params));
    
    // Pixel information property
    box.push(...this.createPIXProperty(params));
    
    // Update box size
    const size = box.length;
    box[0] = (size >> 24) & 0xFF;
    box[1] = (size >> 16) & 0xFF;
    box[2] = (size >> 8) & 0xFF;
    box[3] = size & 0xFF;
    
    return box;
  }

  createISPEProperty(params) {
    const property = [];
    
    // Size
    property.push(0x00, 0x00, 0x00, 0x18);
    
    // Type
    property.push(0x69, 0x73, 0x70, 0x65); // "ispe"
    
    // Version and flags
    property.push(0x00, 0x00, 0x00, 0x00);
    
    // Image width and height
    property.push((params.width >> 24) & 0xFF, (params.width >> 16) & 0xFF,
                  (params.width >> 8) & 0xFF, params.width & 0xFF);
    property.push((params.height >> 24) & 0xFF, (params.height >> 16) & 0xFF,
                  (params.height >> 8) & 0xFF, params.height & 0xFF);
    
    return property;
  }

  createPIXProperty(params) {
    const property = [];
    
    // Size
    property.push(0x00, 0x00, 0x00, 0x14);
    
    // Type
    property.push(0x70, 0x69, 0x78, 0x69); // "pixi"
    
    // Version and flags
    property.push(0x00, 0x00, 0x00, 0x00);
    
    // Plane count
    property.push(params.alpha ? 0x04 : 0x03);
    
    // Bit depth per channel
    property.push(0x08, 0x08, 0x08);
    if (params.alpha) {
      property.push(0x08);
    }
    
    return property;
  }

  createIPMABox() {
    const box = [];
    
    // Size
    box.push(0x00, 0x00, 0x00, 0x17);
    
    // Type
    box.push(0x69, 0x70, 0x6D, 0x61); // "ipma"
    
    // Version and flags
    box.push(0x00, 0x00, 0x00, 0x00);
    
    // Entry count
    box.push(0x00, 0x01);
    
    // Item ID
    box.push(0x00, 0x01);
    
    // Property count
    box.push(0x02);
    
    // Property associations
    box.push(0x01, 0x01); // Property 1, essential
    box.push(0x02, 0x01); // Property 2, essential
    
    return box;
  }

  createMDATBox(av1Data) {
    const box = [];
    
    // Box size
    const size = 8 + av1Data.length;
    box.push((size >> 24) & 0xFF, (size >> 16) & 0xFF,
             (size >> 8) & 0xFF, size & 0xFF);
    
    // Box type
    box.push(0x6D, 0x64, 0x61, 0x74); // "mdat"
    
    // AV1 data
    box.push(...av1Data);
    
    return box;
  }
}

export default AVIFCompression;