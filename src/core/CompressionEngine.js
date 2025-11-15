/**
 * @xbibzlibrary/kompreser - Advanced Compression Engine
 * Enterprise-grade compression algorithms with multiple strategies
 */

import Logger from '../utils/Logger.js';
import { CompressionError, MemoryError } from './ErrorHandler.js';
import JPEGCompression from '../algorithms/JPEGCompression.js';
import PNGCompression from '../algorithms/PNGCompression.js';
import WebPCompression from '../algorithms/WebPCompression.js';
import AVIFCompression from '../algorithms/AVIFCompression.js';
import SVGCompression from '../algorithms/SVGCompression.js';
import ProgressiveCompression from '../algorithms/ProgressiveCompression.js';

class CompressionEngine {
  constructor(options, logger) {
    this.options = options;
    this.logger = logger || new Logger();
    
    // Initialize compression algorithms
    this.algorithms = {
      jpeg: new JPEGCompression(options, logger),
      png: new PNGCompression(options, logger),
      webp: new WebPCompression(options, logger),
      avif: new AVIFCompression(options, logger),
      svg: new SVGCompression(options, logger),
      progressive: new ProgressiveCompression(options, logger)
    };
    
    // Compression strategies
    this.strategies = {
      'fast': { quality: 0.7, effort: 1, progressive: false },
      'balanced': { quality: 0.8, effort: 4, progressive: true },
      'maximum': { quality: 0.9, effort: 9, progressive: true },
      'custom': options.compressionStrategy || {}
    };
    
    this.compressionStats = {
      totalProcessed: 0,
      totalBytesBefore: 0,
      totalBytesAfter: 0,
      averageCompressionRatio: 0,
      processingTimes: []
    };
  }

  async compress(imageData, options = {}) {
    const timer = this.logger.startTimer('compression_engine');
    
    try {
      this.validateInput(imageData);
      
      const format = options.format || this.detectFormat(imageData);
      const strategy = this.selectStrategy(options);
      
      this.logger.info('Starting compression', {
        format,
        strategy: strategy.name,
        inputSize: imageData.data?.length || imageData.size,
        dimensions: `${imageData.width}x${imageData.height}`
      });

      // Check memory requirements
      await this.checkMemoryRequirements(imageData);
      
      // Apply pre-processing optimizations
      const optimizedData = await this.preProcess(imageData, format, strategy);
      
      // Select and apply compression algorithm
      const algorithm = this.selectAlgorithm(format, strategy);
      const compressedData = await algorithm.compress(optimizedData, strategy);
      
      // Apply post-processing optimizations
      const finalData = await this.postProcess(compressedData, format, strategy);
      
      // Update statistics
      this.updateCompressionStats(imageData, finalData, timer.end());
      
      this.logger.info('Compression completed', {
        format,
        originalSize: imageData.data?.length || imageData.size,
        compressedSize: finalData.size,
        compressionRatio: Math.round((1 - finalData.size / (imageData.data?.length || imageData.size)) * 100),
        duration: timer.end()
      });

      return {
        ...finalData,
        format,
        strategy: strategy.name,
        metadata: {
          originalSize: imageData.data?.length || imageData.size,
          compressedSize: finalData.size,
          compressionRatio: 1 - finalData.size / (imageData.data?.length || imageData.size),
          processingTime: timer.end()
        }
      };
      
    } catch (error) {
      this.logger.error('Compression failed', { error: error.message });
      throw new CompressionError(error.message, 'auto', { imageData, options });
    }
  }

  async compressWithAlgorithm(imageData, algorithmName, options = {}) {
    const algorithm = this.algorithms[algorithmName.toLowerCase()];
    if (!algorithm) {
      throw new CompressionError(`Algorithm ${algorithmName} not found`, algorithmName);
    }
    
    return algorithm.compress(imageData, options);
  }

  validateInput(imageData) {
    if (!imageData) {
      throw new ValidationError('Image data is required');
    }
    
    if (!imageData.data && !imageData.size) {
      throw new ValidationError('Image data must have data or size property');
    }
    
    if (!imageData.width || !imageData.height) {
      throw new ValidationError('Image dimensions are required');
    }
    
    // Check maximum dimensions
    const maxDimension = 32767; // Maximum for most formats
    if (imageData.width > maxDimension || imageData.height > maxDimension) {
      throw new ValidationError(`Image dimensions exceed maximum allowed (${maxDimension}x${maxDimension})`);
    }
    
    // Check minimum dimensions
    if (imageData.width < 1 || imageData.height < 1) {
      throw new ValidationError('Image dimensions must be at least 1x1 pixels');
    }
  }

  detectFormat(imageData) {
    // Check data URL format
    if (typeof imageData.data === 'string' && imageData.data.startsWith('data:')) {
      const match = imageData.data.match(/^data:image\/([a-zA-Z+]+);base64,/);
      if (match) {
        return match[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
      }
    }
    
    // Check blob type
    if (imageData.type) {
      const match = imageData.type.match(/^image\/([a-zA-Z+]+)$/);
      if (match) {
        return match[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
      }
    }
    
    // Check file extension
    if (imageData.name) {
      const ext = imageData.name.split('.').pop().toLowerCase();
      if (['jpg', 'jpeg', 'png', 'webp', 'avif', 'svg', 'gif', 'bmp', 'tiff'].includes(ext)) {
        return ext;
      }
    }
    
    // Default fallback
    return 'png';
  }

  selectStrategy(options) {
    const level = options.compressionLevel || this.options.compressionLevel;
    
    if (this.strategies[level]) {
      return {
        name: level,
        ...this.strategies[level],
        ...options
      };
    }
    
    // Custom strategy
    return {
      name: 'custom',
      ...this.strategies.custom,
      ...options
    };
  }

  selectAlgorithm(format, strategy) {
    const formatMap = {
      'jpg': 'jpeg',
      'jpeg': 'jpeg',
      'png': 'png',
      'webp': 'webp',
      'avif': 'avif',
      'svg': 'svg',
      'gif': 'png', // Convert GIF to PNG
      'bmp': 'png', // Convert BMP to PNG
      'tiff': 'png' // Convert TIFF to PNG
    };
    
    const algorithmName = formatMap[format.toLowerCase()] || 'png';
    const algorithm = this.algorithms[algorithmName];
    
    if (!algorithm) {
      throw new CompressionError(`No algorithm available for format: ${format}`, algorithmName);
    }
    
    return algorithm;
  }

  async checkMemoryRequirements(imageData) {
    const pixelCount = imageData.width * imageData.height;
    const bytesPerPixel = 4; // RGBA
    const estimatedMemory = pixelCount * bytesPerPixel * 3; // Original + Working + Output
    
    if (estimatedMemory > this.options.memoryLimit) {
      throw new MemoryError(`Image requires ${Math.round(estimatedMemory / 1024 / 1024)}MB, exceeds limit of ${Math.round(this.options.memoryLimit / 1024 / 1024)}MB`);
    }
    
    // Check actual available memory
    if (performance.memory) {
      const availableMemory = performance.memory.jsHeapSizeLimit - performance.memory.usedJSHeapSize;
      if (estimatedMemory > availableMemory * 0.8) {
        this.logger.warn('Low memory detected, using conservative compression', {
          required: estimatedMemory,
          available: availableMemory
        });
      }
    }
  }

  async preProcess(imageData, format, strategy) {
    const optimizations = [];
    
    // Color space optimization
    if (strategy.colorSpace && strategy.colorSpace !== 'auto') {
      optimizations.push('color_space_conversion');
    }
    
    // Chroma subsampling for JPEG
    if (format === 'jpeg' && strategy.chromaSubsampling !== false) {
      optimizations.push('chroma_subsampling');
    }
    
    // Quantization for PNG
    if (format === 'png' && strategy.quantization) {
      optimizations.push('quantization');
    }
    
    // Dithering
    if (strategy.dithering) {
      optimizations.push('dithering');
    }
    
    this.logger.debug('Pre-processing optimizations', { optimizations });
    
    return {
      ...imageData,
      optimizations,
      preprocessed: true
    };
  }

  async postProcess(compressedData, format, strategy) {
    const optimizations = [];
    
    // Progressive encoding
    if (strategy.progressive && this.supportsProgressive(format)) {
      optimizations.push('progressive');
      compressedData = await this.algorithms.progressive.encode(compressedData);
    }
    
    // Optimize compression
    if (strategy.optimize) {
      optimizations.push('compression_optimization');
      compressedData = await this.optimizeCompression(compressedData, format);
    }
    
    // Add metadata
    if (strategy.metadata && strategy.metadata !== 'none') {
      optimizations.push('metadata_preservation');
    }
    
    this.logger.debug('Post-processing optimizations', { optimizations });
    
    return {
      ...compressedData,
      optimizations: [...(compressedData.optimizations || []), ...optimizations]
    };
  }

  supportsProgressive(format) {
    return ['jpeg', 'png', 'webp'].includes(format.toLowerCase());
  }

  async optimizeCompression(data, format) {
    // Use WebAssembly optimization if available
    if (this.options.enableWebAssembly && this.wasmModules) {
      try {
        return await this.wasmModules.optimize(data, format);
      } catch (error) {
        this.logger.warn('WebAssembly optimization failed, using JavaScript fallback', { error: error.message });
      }
    }
    
    // JavaScript fallback optimization
    return this.optimizeWithJavaScript(data, format);
  }

  async optimizeWithJavaScript(data, format) {
    // Basic optimization based on format
    switch (format.toLowerCase()) {
      case 'png':
        return this.optimizePNG(data);
      case 'jpeg':
        return this.optimizeJPEG(data);
      case 'webp':
        return this.optimizeWebP(data);
      default:
        return data;
    }
  }

  async optimizePNG(data) {
    // Remove unnecessary chunks
    // Implement basic PNG optimization
    return data;
  }

  async optimizeJPEG(data) {
    // Optimize Huffman tables
    // Implement basic JPEG optimization
    return data;
  }

  async optimizeWebP(data) {
    // Optimize WebP compression
    // Implement basic WebP optimization
    return data;
  }

  updateCompressionStats(original, compressed, duration) {
    this.compressionStats.totalProcessed++;
    this.compressionStats.totalBytesBefore += original.data?.length || original.size;
    this.compressionStats.totalBytesAfter += compressed.size;
    this.compressionStats.processingTimes.push(duration);
    
    // Update average compression ratio
    this.compressionStats.averageCompressionRatio = 
      1 - (this.compressionStats.totalBytesAfter / this.compressionStats.totalBytesBefore);
    
    // Keep only last 100 processing times
    if (this.compressionStats.processingTimes.length > 100) {
      this.compressionStats.processingTimes.shift();
    }
  }

  getCompressionStats() {
    const stats = { ...this.compressionStats };
    
    // Calculate additional statistics
    if (stats.processingTimes.length > 0) {
      stats.averageProcessingTime = Math.round(
        stats.processingTimes.reduce((sum, time) => sum + time, 0) / stats.processingTimes.length
      );
      stats.minProcessingTime = Math.min(...stats.processingTimes);
      stats.maxProcessingTime = Math.max(...stats.processingTimes);
    }
    
    return stats;
  }

  resetStats() {
    this.compressionStats = {
      totalProcessed: 0,
      totalBytesBefore: 0,
      totalBytesAfter: 0,
      averageCompressionRatio: 0,
      processingTimes: []
    };
  }
}

// Worker Pool for parallel compression
class WorkerPool {
  constructor(options) {
    this.maxWorkers = options.maxWorkers || 4;
    this.logger = options.logger;
    this.workers = [];
    this.taskQueue = [];
    this.activeTasks = new Map();
    this.workerId = 0;
  }

  async initialize() {
    if (typeof Worker === 'undefined') {
      throw new Error('Web Workers not supported');
    }

    for (let i = 0; i < this.maxWorkers; i++) {
      await this.createWorker();
    }
  }

  async createWorker() {
    try {
      const worker = new Worker(URL.createObjectURL(new Blob([
        `
        self.onmessage = function(e) {
          const { id, task, data } = e.data;
          try {
            // Compression worker logic would go here
            const result = { success: true, data: data };
            self.postMessage({ id, result });
          } catch (error) {
            self.postMessage({ id, error: error.message });
          }
        };
        `
      ])));

      const workerInfo = {
        id: ++this.workerId,
        worker,
        busy: false,
        tasksCompleted: 0
      };

      worker.onmessage = (e) => {
        this.handleWorkerMessage(workerInfo, e.data);
      };

      worker.onerror = (error) => {
        this.logger.error('Worker error', { workerId: workerInfo.id, error: error.message });
        this.restartWorker(workerInfo.id);
      };

      this.workers.push(workerInfo);
      
    } catch (error) {
      this.logger.error('Failed to create worker', { error: error.message });
    }
  }

  handleWorkerMessage(workerInfo, data) {
    const { id, result, error } = data;
    const task = this.activeTasks.get(id);
    
    if (task) {
      this.activeTasks.delete(id);
      workerInfo.busy = false;
      workerInfo.tasksCompleted++;
      
      if (error) {
        task.reject(new Error(error));
      } else {
        task.resolve(result);
      }
      
      this.processQueue();
    }
  }

  async process(data) {
    return new Promise((resolve, reject) => {
      const taskId = Date.now() + Math.random();
      const task = { id: taskId, data, resolve, reject };
      
      this.taskQueue.push(task);
      this.processQueue();
    });
  }

  processQueue() {
    if (this.taskQueue.length === 0) return;
    
    const availableWorker = this.workers.find(w => !w.busy);
    if (!availableWorker) return;
    
    const task = this.taskQueue.shift();
    availableWorker.busy = true;
    this.activeTasks.set(task.id, task);
    
    availableWorker.worker.postMessage({
      id: task.id,
      task: 'compress',
      data: task.data
    });
  }

  async restartWorker(workerId) {
    const workerIndex = this.workers.findIndex(w => w.id === workerId);
    if (workerIndex !== -1) {
      const oldWorker = this.workers[workerIndex];
      oldWorker.worker.terminate();
      
      await this.createWorker();
      this.workers.splice(workerIndex, 1);
    }
  }

  getStats() {
    return {
      totalWorkers: this.workers.length,
      busyWorkers: this.workers.filter(w => w.busy).length,
      queuedTasks: this.taskQueue.length,
      activeTasks: this.activeTasks.size,
      workers: this.workers.map(w => ({
        id: w.id,
        busy: w.busy,
        tasksCompleted: w.tasksCompleted
      }))
    };
  }

  async terminate() {
    this.workers.forEach(workerInfo => {
      workerInfo.worker.terminate();
    });
    this.workers = [];
    this.taskQueue = [];
    this.activeTasks.clear();
  }
}

// WebAssembly modules wrapper
class WebAssemblyModules {
  constructor(options) {
    this.logger = options.logger;
    this.modules = new Map();
  }

  async initialize() {
    // Initialize WebAssembly compression modules
    // This would load actual WASM files in production
    this.logger.info('WebAssembly modules initialized');
  }

  async optimize(data, format) {
    const module = this.modules.get(format);
    if (module) {
      return module.optimize(data);
    }
    return data;
  }
}

// LRU Cache implementation
class LRUCache {
  constructor(options) {
    this.maxSize = options.maxSize || 50 * 1024 * 1024; // 50MB default
    this.logger = options.logger;
    this.cache = new Map();
    this.totalSize = 0;
    this.accessCount = 0;
    this.hitCount = 0;
  }

  get(key) {
    this.accessCount++;
    
    if (this.cache.has(key)) {
      this.hitCount++;
      const value = this.cache.get(key);
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    
    return null;
  }

  set(key, value) {
    const size = value.data?.length || value.size || 0;
    
    // Remove if already exists
    if (this.cache.has(key)) {
      const oldValue = this.cache.get(key);
      this.totalSize -= oldValue.data?.length || oldValue.size || 0;
      this.cache.delete(key);
    }
    
    // Remove old entries if needed
    while (this.totalSize + size > this.maxSize && this.cache.size > 0) {
      const firstKey = this.cache.keys().next().value;
      const firstValue = this.cache.get(firstKey);
      this.totalSize -= firstValue.data?.length || firstValue.size || 0;
      this.cache.delete(firstKey);
    }
    
    // Add new entry
    if (size <= this.maxSize) {
      this.cache.set(key, value);
      this.totalSize += size;
    }
  }

  clear() {
    this.cache.clear();
    this.totalSize = 0;
  }

  getStats() {
    return {
      size: this.cache.size,
      totalSize: this.totalSize,
      maxSize: this.maxSize,
      accessCount: this.accessCount,
      hitCount: this.hitCount,
      hitRate: this.accessCount > 0 ? (this.hitCount / this.accessCount) : 0
    };
  }
}

export default CompressionEngine;