# Kompreser API Documentation

## Table of Contents

- [Core Classes](#core-classes)
  - [Kompreser](#kompreser)
  - [Error Classes](#error-classes)
- [Configuration Options](#configuration-options)
- [Methods](#methods)
  - [compress()](#compress)
  - [compressBatch()](#compressbatch)
  - [convert()](#convert)
  - [resize()](#resize)
  - [optimizeForWeb()](#optimizeforweb)
- [Events and Callbacks](#events-and-callbacks)
- [Utility Classes](#utility-classes)

## Core Classes

### Kompreser

The main class for image compression and processing.

```javascript
import Kompreser from '@xbibzlibrary/kompreser';

const kompreser = new Kompreser(options);
```

#### Constructor Options

```typescript
interface KompreserOptions {
  // Compression settings
  quality?: number;           // 0.0 - 1.0 (default: 0.8)
  format?: 'auto' | 'jpeg' | 'png' | 'webp' | 'avif'; // Output format
  progressive?: boolean;      // Enable progressive encoding
  
  // Performance settings
  useWorkers?: boolean;       // Use Web Workers (default: true)
  maxWorkers?: number;        // Maximum worker threads
  batchSize?: number;         // Batch processing size
  memoryLimit?: number;       // Memory limit in bytes
  
  // Advanced features
  enableAI?: boolean;         // AI-powered optimization
  enableWebAssembly?: boolean; // Use WebAssembly
  enableStreaming?: boolean;  // Streaming compression
  enableCaching?: boolean;    // Enable result caching
  
  // Error handling
  enableRecovery?: boolean;   // Automatic error recovery
  maxRetries?: number;        // Maximum retry attempts
  retryDelay?: number;        // Retry delay in ms
  
  // Security settings
  maxFileSize?: number;       // Maximum file size in bytes
  allowedFormats?: string[];  // Allowed input formats
  sanitizeMetadata?: boolean; // Remove sensitive metadata
  
  // Logging
  logLevel?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  enablePerformanceTracking?: boolean;
  enableDetailedLogging?: boolean;
}
```

### Error Classes

#### KompreserError

Base error class for all Kompreser errors.

```javascript
import { KompreserError } from '@xbibzlibrary/kompreser';

try {
  await kompreser.compress(file);
} catch (error) {
  if (error instanceof KompreserError) {
    console.log('Kompreser error:', error.code, error.message);
    console.log('Error details:', error.details);
    console.log('Severity:', error.severity);
  }
}
```

#### Specific Error Types

- **ValidationError**: Input validation errors
- **FormatError**: Image format-related errors
- **CompressionError**: Compression algorithm errors
- **MemoryError**: Memory-related errors
- **WorkerError**: Web Worker errors
- **TimeoutError**: Operation timeout errors
- **UnsupportedError**: Unsupported feature errors
- **MetadataError**: Metadata processing errors
- **PerformanceError**: Performance-related errors

## Configuration Options

### Compression Settings

```javascript
const kompreser = new Kompreser({
  quality: 0.85,        // High quality
  format: 'webp',       // Force WebP format
  progressive: true,    // Enable progressive JPEG
  
  // Advanced compression
  compressionLevel: 'maximum', // 'fast', 'balanced', 'maximum'
  chromaSubsampling: true,     // Enable chroma subsampling
  optimize: true,              // Enable optimization
  
  // Format-specific settings
  jpeg: {
    optimize: true,
    progressive: true,
    quality: 0.9
  },
  webp: {
    quality: 0.85,
    alphaQuality: 0.9,
    method: 6
  },
  avif: {
    quality: 0.8,
    speed: 6,
    tileRows: 2,
    tileCols: 2
  }
});
```

### Performance Settings

```javascript
const kompreser = new Kompreser({
  // Worker configuration
  useWorkers: true,
  maxWorkers: 8,
  workerTimeout: 30000, // 30 seconds
  
  // Memory management
  memoryLimit: 512 * 1024 * 1024, // 512MB
  enableMemoryPooling: true,
  
  // Batch processing
  batchSize: 10,
  batchTimeout: 60000, // 1 minute
  
  // Caching
  enableCaching: true,
  cacheSize: 100 * 1024 * 1024, // 100MB
  cacheTTL: 3600000 // 1 hour
});
```

## Methods

### compress()

Compress a single image with advanced options.

```javascript
async compress(input, options = {}): Promise<CompressionResult>
```

**Parameters:**
- `input`: File, Blob, data URL, or HTML element
- `options`: Compression options (override constructor options)

**Returns:** `CompressionResult`

```typescript
interface CompressionResult {
  data: Uint8Array | Buffer;
  size: number;
  width: number;
  height: number;
  format: string;
  quality: number;
  url?: string; // Object URL for browser
  filename?: string;
  metadata: {
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    processingTime: number;
    algorithm: string;
    settings: object;
  };
}
```

**Example:**

```javascript
const result = await kompreser.compress(file, {
  quality: 0.9,
  format: 'webp',
  maxWidth: 1920,
  maxHeight: 1080
});

console.log(`Compressed from ${result.metadata.originalSize} to ${result.size} bytes`);
console.log(`Compression ratio: ${Math.round(result.metadata.compressionRatio * 100)}%`);

// Download result
const blob = new Blob([result.data], { type: `image/${result.format}` });
const url = URL.createObjectURL(blob);
```

### compressBatch()

Compress multiple images in parallel.

```javascript
async compressBatch(inputs, options = {}): Promise<BatchCompressionResult[]>
```

**Parameters:**
- `inputs`: Array of input files/blobs
- `options`: Compression options

**Returns:** Array of `BatchCompressionResult`

```typescript
interface BatchCompressionResult {
  success: boolean;
  result?: CompressionResult;
  error?: string;
  inputIndex: number;
  processingTime: number;
}
```

**Example:**

```javascript
const results = await kompreser.compressBatch(files, {
  quality: 0.8,
  format: 'auto'
});

results.forEach((result, index) => {
  if (result.success) {
    console.log(`File ${index}: ${result.result.metadata.compressionRatio}% reduction`);
  } else {
    console.error(`File ${index} failed:`, result.error);
  }
});
```

### convert()

Convert between image formats.

```javascript
async convert(input, targetFormat, options = {}): Promise<CompressionResult>
```

**Parameters:**
- `input`: Input image
- `targetFormat`: Target format ('jpeg', 'png', 'webp', 'avif')
- `options`: Conversion options

**Example:**

```javascript
const webpImage = await kompreser.convert(pngFile, 'webp', {
  quality: 0.9,
  alphaQuality: 0.95
});

const avifImage = await kompreser.convert(jpegFile, 'avif', {
  quality: 0.85,
  speed: 6
});
```

### resize()

Resize images with various fit modes.

```javascript
async resize(input, dimensions, options = {}): Promise<CompressionResult>
```

**Parameters:**
- `input`: Input image
- `dimensions`: Size constraints
- `options`: Resize options

```typescript
interface ResizeOptions {
  width?: number;
  height?: number;
  maxWidth?: number;
  maxHeight?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  background?: string; // For fill mode
  imageSmoothing?: boolean;
  imageSmoothingQuality?: 'low' | 'medium' | 'high';
}
```

**Example:**

```javascript
// Thumbnail generation
const thumbnail = await kompreser.resize(imageFile, {
  width: 300,
  height: 300,
  fit: 'cover',
  position: 'center'
});

// Responsive image
const responsive = await kompreser.resize(imageFile, {
  maxWidth: 1200,
  maxHeight: 800,
  fit: 'inside'
});

// Hero banner
const hero = await kompreser.resize(imageFile, {
  width: 1920,
  height: 1080,
  fit: 'fill',
  background: '#000000'
});
```

### optimizeForWeb()

Optimize images specifically for web delivery.

```javascript
async optimizeForWeb(input, options = {}): Promise<CompressionResult>
```

**Parameters:**
- `input`: Input image
- `options`: Web optimization options

**Example:**

```javascript
const webOptimized = await kompreser.optimizeForWeb(imageFile, {
  targetFormat: 'webp',       // Prefer WebP
  fallbackFormat: 'jpeg',     // JPEG fallback
  maxWidth: 1920,
  responsiveSizes: [480, 768, 1024, 1280, 1920],
  metadata: 'none',           // Strip metadata
  enableLazyLoading: true     // Generate loading placeholder
});
```

## Events and Callbacks

### Progress Events

```javascript
const kompreser = new Kompreser({
  onProgress: (progress) => {
    console.log(`Progress: ${progress.percentage}%`);
    console.log(`Processed: ${progress.processed}/${progress.total} files`);
    console.log(`Current file: ${progress.currentFile}`);
  },
  
  onFileComplete: (result) => {
    console.log(`File completed: ${result.filename}`);
  },
  
  onBatchComplete: (results) => {
    console.log(`Batch completed: ${results.length} files processed`);
  }
});
```

### Error Handling

```javascript
const kompreser = new Kompreser({
  onError: (error, context) => {
    console.error('Compression error:', error.message);
    console.error('Context:', context);
    
    // Handle specific error types
    if (error.code === 'MEMORY_ERROR') {
      // Try with lower quality
      return { retry: true, options: { quality: 0.6 } };
    }
    
    if (error.code === 'FORMAT_ERROR') {
      // Try conversion to supported format
      return { retry: true, options: { format: 'png' } };
    }
  }
});
```

## Utility Classes

### Logger

Advanced logging with performance tracking.

```javascript
import { Logger } from '@xbibzlibrary/kompreser';

const logger = new Logger({
  level: 'INFO',
  enablePerformanceTracking: true
});

// Basic logging
logger.info('Compression started');
logger.warn('Low memory detected');
logger.error('Compression failed', { error: 'timeout' });

// Performance tracking
const timer = logger.startTimer('compression');
await kompreser.compress(file);
timer.end(); // Logs duration automatically

// Export logs
const logs = logger.exportLogs({ level: 'WARN' });
console.log(logs);
```

### ErrorHandler

Comprehensive error handling and recovery.

```javascript
import { ErrorHandler, ValidationError } from '@xbibzlibrary/kompreser';

const errorHandler = new ErrorHandler({
  enableRecovery: true,
  maxRetries: 3
});

// Handle errors with automatic recovery
try {
  await kompreser.compress(largeFile);
} catch (error) {
  const result = await errorHandler.handleError(error, {
    context: 'compression',
    compressionEngine: kompreser.compressionEngine
  });
  
  if (result.recovered) {
    console.log('Recovered using strategy:', result.recovery.strategy);
  } else if (result.shouldRetry) {
    console.log('Retrying attempt:', result.attempt);
  }
}
```

## Performance Monitoring

```javascript
// Get performance statistics
const stats = await kompreser.getPerformanceStats();

console.log('Performance Report:');
console.log('- Total operations:', stats.logger.operations.totalOperations);
console.log('- Average duration:', stats.logger.operations.avgDuration);
console.log('- Memory usage:', stats.logger.memoryUsage);
console.log('- Cache hit rate:', stats.cache?.hitRate || 0);

// Export detailed performance data
const performanceData = kompreser.logger.getPerformanceReport();
console.log(JSON.stringify(performanceData, null, 2));
```

## Advanced Examples

### Custom Compression Pipeline

```javascript
class CustomCompressor extends Kompreser {
  async compress(input, options = {}) {
    // Pre-processing
    const preprocessed = await this.preprocess(input);
    
    // Custom analysis
    const analysis = await this.analyzeContent(preprocessed);
    
    // Dynamic quality adjustment
    const quality = this.calculateOptimalQuality(analysis);
    
    // Compression with custom settings
    const result = await super.compress(preprocessed, {
      ...options,
      quality,
      customAlgorithm: 'advanced'
    });
    
    // Post-processing
    return this.postprocess(result);
  }
}
```

### Batch Processing with Progress

```javascript
async function processImageGallery(files) {
  const kompreser = new Kompreser({
    onProgress: (progress) => {
      updateProgressBar(progress.percentage);
      updateStatus(`Processing ${progress.currentFile}...`);
    }
  });
  
  // Process in batches
  const batchSize = 5;
  const results = [];
  
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchResults = await kompreser.compressBatch(batch, {
      quality: 0.85,
      format: 'webp'
    });
    
    results.push(...batchResults);
    
    // Update UI
    updateGalleryPreview(results);
  }
  
  return results;
}
```

### Real-time Image Optimization

```javascript
class RealtimeOptimizer {
  constructor() {
    this.kompreser = new Kompreser({
      useWorkers: true,
      maxWorkers: 4,
      enableCaching: true
    });
    
    this.optimizationQueue = [];
    this.isProcessing = false;
  }
  
  async optimizeImage(file, targetSize) {
    // Add to queue
    this.optimizationQueue.push({ file, targetSize });
    
    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }
    
    // Return promise that resolves when optimization is complete
    return new Promise((resolve) => {
      this.onOptimizationComplete = resolve;
    });
  }
  
  async processQueue() {
    this.isProcessing = true;
    
    while (this.optimizationQueue.length > 0) {
      const { file, targetSize } = this.optimizationQueue.shift();
      
      // Binary search for optimal quality
      let minQuality = 0.1;
      let maxQuality = 1.0;
      let bestResult = null;
      
      for (let i = 0; i < 5; i++) {
        const quality = (minQuality + maxQuality) / 2;
        
        const result = await this.kompreser.compress(file, { quality });
        
        if (result.size <= targetSize) {
          bestResult = result;
          minQuality = quality; // Try higher quality
        } else {
          maxQuality = quality; // Try lower quality
        }
      }
      
      // Notify completion
      if (this.onOptimizationComplete) {
        this.onOptimizationComplete(bestResult);
      }
    }
    
    this.isProcessing = false;
  }
}
```

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import Kompreser, { 
  KompreserOptions, 
  CompressionResult, 
  BatchCompressionResult 
} from '@xbibzlibrary/kompreser';

const options: KompreserOptions = {
  quality: 0.85,
  format: 'webp',
  progressive: true,
  useWorkers: true
};

const kompreser: Kompreser = new Kompreser(options);

async function compressImage(file: File): Promise<CompressionResult> {
  return kompreser.compress(file, {
    quality: 0.9,
    maxWidth: 1920,
    maxHeight: 1080
  });
}
```