/**
 * @xbibzlibrary/kompreser - Main Library Class
 * Enterprise-grade image compression and conversion library
 */

import Logger from '../utils/Logger.js';
import { ErrorHandler, ValidationError, FormatError, CompressionError } from './ErrorHandler.js';
import ImageProcessor from './ImageProcessor.js';
import CompressionEngine from './CompressionEngine.js';
import FormatConverter from './FormatConverter.js';
import FileValidator from '../utils/FileValidator.js';
import ImageAnalyzer from '../utils/ImageAnalyzer.js';
import BatchProcessor from '../utils/BatchProcessor.js';
import PerformanceMonitor from '../utils/PerformanceMonitor.js';

class Kompreser {
  constructor(options = {}) {
    this.options = {
      // Compression options
      quality: 0.8,
      format: 'auto',
      progressive: true,
      metadata: 'preserve',
      colorSpace: 'srgb',
      
      // Performance options
      useWorkers: true,
      maxWorkers: navigator?.hardwareConcurrency || 4,
      batchSize: 10,
      memoryLimit: 512 * 1024 * 1024, // 512MB
      
      // Advanced options
      enableAI: false,
      enableWebAssembly: true,
      enableStreaming: true,
      enableCaching: true,
      
      // Logging and debugging
      logLevel: 'INFO',
      enablePerformanceTracking: true,
      enableDetailedLogging: false,
      
      // Error handling
      enableRecovery: true,
      maxRetries: 3,
      retryDelay: 1000,
      
      // Output options
      outputPath: null,
      filenamePattern: '{name}_{width}x{height}_{quality}.{ext}',
      
      // Advanced compression
      compressionLevel: 'balanced', // 'fast', 'balanced', 'maximum'
      enableProgressive: true,
      enableOptimization: true,
      
      // Security
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedFormats: ['jpeg', 'png', 'webp', 'avif', 'svg', 'gif', 'bmp', 'tiff'],
      sanitizeMetadata: false,
      
      ...options
    };

    // Initialize core components
    this.logger = new Logger({
      level: this.options.logLevel,
      enablePerformanceTracking: this.options.enablePerformanceTracking,
      enableDetailedLogging: this.options.enableDetailedLogging
    });

    this.errorHandler = new ErrorHandler({
      logLevel: this.options.logLevel,
      enableRecovery: this.options.enableRecovery,
      maxRetries: this.options.maxRetries,
      retryDelay: this.options.retryDelay,
      enableDetailedLogging: this.options.enableDetailedLogging
    });

    this.validator = new FileValidator(this.options);
    this.analyzer = new ImageAnalyzer(this.options);
    this.processor = new ImageProcessor(this.options, this.logger);
    this.compressionEngine = new CompressionEngine(this.options, this.logger);
    this.formatConverter = new FormatConverter(this.options, this.logger);
    this.batchProcessor = new BatchProcessor(this.options, this.logger);
    this.performanceMonitor = new PerformanceMonitor(this.options, this.logger);

    // Initialize library
    this.initialize();
  }

  async initialize() {
    const timer = this.logger.startTimer('initialization');
    
    try {
      this.logger.info('Initializing Kompreser library', {
        version: '1.0.0',
        options: this.sanitizeOptionsForLogging()
      });

      // Check browser compatibility
      await this.checkCompatibility();
      
      // Initialize workers if enabled
      if (this.options.useWorkers) {
        await this.initializeWorkers();
      }
      
      // Initialize WebAssembly modules if enabled
      if (this.options.enableWebAssembly) {
        await this.initializeWebAssembly();
      }
      
      // Initialize cache if enabled
      if (this.options.enableCaching) {
        await this.initializeCache();
      }
      
      // Start performance monitoring
      if (this.options.enablePerformanceTracking) {
        this.performanceMonitor.start();
      }

      const duration = timer.end();
      this.logger.info('Kompreser initialized successfully', { duration });
      
    } catch (error) {
      await this.errorHandler.handleError(error, { context: 'initialization' });
      throw error;
    }
  }

  async checkCompatibility() {
    const features = {
      canvas: !!window.OffscreenCanvas || !!document.createElement('canvas').getContext,
      webworkers: !!window.Worker,
      wasm: !!window.WebAssembly,
      filereader: !!window.FileReader,
      blob: !!window.Blob,
      url: !!window.URL || !!window.webkitURL,
      requestanimationframe: !!window.requestAnimationFrame
    };

    const unsupported = Object.entries(features)
      .filter(([feature, supported]) => !supported)
      .map(([feature]) => feature);

    if (unsupported.length > 0) {
      this.logger.warn('Some features are not supported in this environment', { unsupported });
      
      if (unsupported.includes('canvas')) {
        throw new ValidationError('Canvas API is required for image processing');
      }
    }

    this.logger.info('Compatibility check completed', { features });
  }

  async initializeWorkers() {
    try {
      // Create worker pool for parallel processing
      this.workerPool = new WorkerPool({
        maxWorkers: this.options.maxWorkers,
        logger: this.logger
      });
      
      await this.workerPool.initialize();
      this.logger.info('Worker pool initialized', { maxWorkers: this.options.maxWorkers });
      
    } catch (error) {
      this.logger.warn('Worker initialization failed, falling back to main thread', { error: error.message });
      this.options.useWorkers = false;
    }
  }

  async initializeWebAssembly() {
    try {
      // Initialize WebAssembly compression modules
      this.wasmModules = new WebAssemblyModules({
        logger: this.logger
      });
      
      await this.wasmModules.initialize();
      this.logger.info('WebAssembly modules initialized');
      
    } catch (error) {
      this.logger.warn('WebAssembly initialization failed, using JavaScript fallback', { error: error.message });
      this.options.enableWebAssembly = false;
    }
  }

  async initializeCache() {
    try {
      // Initialize LRU cache for processed images
      this.cache = new LRUCache({
        maxSize: 100 * 1024 * 1024, // 100MB
        logger: this.logger
      });
      
      this.logger.info('Cache initialized');
      
    } catch (error) {
      this.logger.warn('Cache initialization failed', { error: error.message });
      this.options.enableCaching = false;
    }
  }

  // Main compression method
  async compress(input, options = {}) {
    const timer = this.logger.startTimer('compress');
    
    try {
      const mergedOptions = { ...this.options, ...options };
      
      this.logger.info('Starting compression', {
        inputType: this.getInputType(input),
        options: this.sanitizeOptionsForLogging(mergedOptions)
      });

      // Validate input
      const validation = await this.validator.validateInput(input);
      if (!validation.valid) {
        throw new ValidationError('Invalid input', validation);
      }

      // Process input to get image data
      const imageData = await this.processor.processInput(input, mergedOptions);
      
      // Analyze image for optimal compression
      const analysis = await this.analyzer.analyze(imageData, mergedOptions);
      
      // Determine optimal compression strategy
      const strategy = await this.determineCompressionStrategy(imageData, analysis, mergedOptions);
      
      // Apply compression
      const compressedData = await this.compressionEngine.compress(imageData, {
        ...mergedOptions,
        ...strategy
      });
      
      // Convert to target format if needed
      const finalData = await this.formatConverter.convert(compressedData, mergedOptions);
      
      // Generate output
      const result = await this.generateOutput(finalData, mergedOptions);
      
      const duration = timer.end();
      
      this.logger.info('Compression completed successfully', {
        duration,
        originalSize: imageData.size,
        compressedSize: result.size,
        compressionRatio: Math.round((1 - result.size / imageData.size) * 100),
        format: result.format,
        quality: mergedOptions.quality
      });

      return result;
      
    } catch (error) {
      const result = await this.errorHandler.handleError(error, { 
        context: 'compression',
        compressionEngine: this.compressionEngine,
        cache: this.cache
      });
      
      if (result.recovered) {
        return result.recoveryData;
      }
      
      if (result.shouldRetry) {
        return this.compress(input, options);
      }
      
      throw result.error;
    }
  }

  // Batch compression method
  async compressBatch(inputs, options = {}) {
    const timer = this.logger.startTimer('batch_compress');
    
    try {
      this.logger.info('Starting batch compression', { 
        count: inputs.length,
        options: this.sanitizeOptionsForLogging(options)
      });

      const results = await this.batchProcessor.process(inputs, async (input) => {
        return this.compress(input, options);
      });

      const duration = timer.end();
      
      this.logger.info('Batch compression completed', {
        duration,
        totalProcessed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });

      return results;
      
    } catch (error) {
      await this.errorHandler.handleError(error, { context: 'batch_compression' });
      throw error;
    }
  }

  // Convert format method
  async convert(input, targetFormat, options = {}) {
    return this.compress(input, {
      ...options,
      format: targetFormat,
      quality: 1.0 // Use maximum quality for format conversion
    });
  }

  // Resize method
  async resize(input, dimensions, options = {}) {
    const resizeOptions = {
      ...options,
      width: dimensions.width,
      height: dimensions.height,
      fit: dimensions.fit || 'cover',
      position: dimensions.position || 'center'
    };
    
    return this.compress(input, resizeOptions);
  }

  // Optimize for web method
  async optimizeForWeb(input, options = {}) {
    const webOptions = {
      ...options,
      format: 'webp', // Prefer WebP for web
      quality: 0.85,
      progressive: true,
      metadata: 'none', // Remove metadata for web
      enableOptimization: true
    };
    
    return this.compress(input, webOptions);
  }

  // Progressive JPEG method
  async createProgressive(input, options = {}) {
    const progressiveOptions = {
      ...options,
      format: 'jpeg',
      progressive: true,
      quality: options.quality || 0.9
    };
    
    return this.compress(input, progressiveOptions);
  }

  // Helper methods
  async determineCompressionStrategy(imageData, analysis, options) {
    const strategy = {
      algorithm: 'auto',
      quality: options.quality,
      progressive: options.progressive
    };

    // Determine optimal format
    if (options.format === 'auto') {
      strategy.format = this.selectOptimalFormat(imageData, analysis, options);
    }

    // Adjust quality based on image content
    if (options.compressionLevel === 'maximum') {
      strategy.quality = Math.max(0.6, options.quality - 0.1);
    } else if (options.compressionLevel === 'fast') {
      strategy.quality = Math.min(0.9, options.quality + 0.1);
    }

    // Enable progressive for large images
    if (imageData.width * imageData.height > 1000000) { // >1MP
      strategy.progressive = true;
    }

    return strategy;
  }

  selectOptimalFormat(imageData, analysis, options) {
    // Use WebP for modern browsers if supported
    if (this.isFormatSupported('webp') && analysis.hasTransparency) {
      return 'webp';
    }
    
    // Use AVIF for high-quality compression if supported
    if (this.isFormatSupported('avif') && options.quality > 0.8) {
      return 'avif';
    }
    
    // Use JPEG for photographs
    if (analysis.isPhotograph && !analysis.hasTransparency) {
      return 'jpeg';
    }
    
    // Use PNG for graphics with sharp edges
    if (analysis.isGraphic || analysis.hasSharpEdges) {
      return 'png';
    }
    
    // Default fallback
    return 'jpeg';
  }

  isFormatSupported(format) {
    const canvas = document.createElement('canvas');
    const supportedFormats = {
      'jpeg': () => canvas.toDataURL('image/jpeg').startsWith('data:image/jpeg'),
      'png': () => canvas.toDataURL('image/png').startsWith('data:image/png'),
      'webp': () => canvas.toDataURL('image/webp').startsWith('data:image/webp'),
      'avif': () => {
        try {
          return canvas.toDataURL('image/avif').startsWith('data:image/avif');
        } catch {
          return false;
        }
      }
    };
    
    return supportedFormats[format]?.() || false;
  }

  async generateOutput(processedData, options) {
    const output = {
      data: processedData.data,
      size: processedData.data.byteLength || processedData.data.length,
      format: processedData.format,
      width: processedData.width,
      height: processedData.height,
      quality: options.quality,
      metadata: processedData.metadata || null
    };

    // Generate filename if needed
    if (options.filenamePattern) {
      output.filename = this.generateFilename(processedData, options);
    }

    // Create object URL if in browser
    if (typeof window !== 'undefined' && window.URL) {
      const blob = new Blob([processedData.data], { 
        type: `image/${processedData.format}` 
      });
      output.url = window.URL.createObjectURL(blob);
    }

    return output;
  }

  generateFilename(data, options) {
    const pattern = options.filenamePattern;
    const replacements = {
      '{name}': data.name || 'image',
      '{width}': data.width,
      '{height}': data.height,
      '{quality}': Math.round(options.quality * 100),
      '{ext}': data.format,
      '{timestamp}': Date.now()
    };

    let filename = pattern;
    for (const [placeholder, value] of Object.entries(replacements)) {
      filename = filename.replace(new RegExp(placeholder, 'g'), value);
    }

    return filename;
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
    return 'Unknown';
  }

  sanitizeOptionsForLogging(options = this.options) {
    const sanitized = { ...options };
    // Remove sensitive information
    delete sanitized.outputPath;
    delete sanitized.apiKey;
    return sanitized;
  }

  // Utility methods
  async getSupportedFormats() {
    const formats = ['jpeg', 'png', 'webp', 'avif'];
    const supported = {};
    
    for (const format of formats) {
      supported[format] = this.isFormatSupported(format);
    }
    
    return supported;
  }

  async getPerformanceStats() {
    return {
      logger: this.logger.getPerformanceReport(),
      errorHandler: this.errorHandler.getErrorStats(),
      cache: this.cache?.getStats(),
      workers: this.workerPool?.getStats()
    };
  }

  // Cleanup method
  async destroy() {
    this.logger.info('Destroying Kompreser instance');
    
    if (this.workerPool) {
      await this.workerPool.terminate();
    }
    
    if (this.performanceMonitor) {
      this.performanceMonitor.stop();
    }
    
    if (this.cache) {
      this.cache.clear();
    }
    
    // Revoke object URLs
    if (typeof window !== 'undefined' && window.URL) {
      // Implementation would revoke any created object URLs
    }
    
    this.logger.info('Kompreser instance destroyed');
  }
}

// Export the main class
export default Kompreser;