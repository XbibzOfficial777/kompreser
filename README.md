<div align="center">
  <img src="https://files.catbox.moe/bhv8u6.png" alt="Kompreser Logo" width="200" height="200">
  
  <h1>@xbibzlibrary/kompreser</h1>
  
  <p><strong>The most advanced JavaScript image compression and conversion library</strong></p>
  
  <div style="display: flex; justify-content: center; gap: 10px; margin: 20px 0;">
    <a href="https://www.npmjs.com/package/@xbibzlibrary/kompreser">
      <img src="https://img.shields.io/npm/v/@xbibzlibrary/kompreser.svg" alt="npm version">
    </a>
    <a href="https://www.npmjs.com/package/@xbibzlibrary/kompreser">
      <img src="https://img.shields.io/npm/dm/@xbibzlibrary/kompreser.svg" alt="npm downloads">
    </a>
    <a href="https://bundlephobia.com/package/@xbibzlibrary/kompreser">
      <img src="https://img.shields.io/bundlephobia/minzip/@xbibzlibrary/kompreser" alt="bundle size">
    </a>
    <a href="https://github.com/Habibzz01/kompreser/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license">
    </a>
  </div>

  <p style="font-size: 18px; color: #666;">
    🚀 Enterprise-grade performance • 🎨 All formats supported • 🔧 Zero dependencies • 🛡️ Production ready
  </p>
</div>

---

<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 15px; margin: 30px 0; color: white;">
  <h2 style="color: white; margin-top: 0;">✨ Why Kompreser?</h2>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 20px;">
    <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
      <h3 style="color: white; margin-top: 0;">🎯 Maximum Compression</h3>
      <p>Advanced algorithms that achieve 70-95% size reduction while maintaining visual quality</p>
    </div>
    <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
      <h3 style="color: white; margin-top: 0;">⚡ Lightning Fast</h3>
      <p>Web Workers, WebAssembly, and parallel processing for enterprise performance</p>
    </div>
    <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
      <h3 style="color: white; margin-top: 0;">🛡️ Production Ready</h3>
      <p>Comprehensive error handling, memory management, and enterprise-grade reliability</p>
    </div>
    <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
      <h3 style="color: white; margin-top: 0;">🔧 Universal Support</h3>
      <p>All image formats, browsers, and environments - works everywhere JavaScript runs</p>
    </div>
  </div>
</div>

## 🚀 Quick Start

### Installation

```bash
# npm
npm install @xbibzlibrary/kompreser

# yarn
yarn add @xbibzlibrary/kompreser

# pnpm
pnpm add @xbibzlibrary/kompreser
```

### Basic Usage

```javascript
import Kompreser from '@xbibzlibrary/kompreser';

// Initialize the compressor
const kompreser = new Kompreser({
  quality: 0.8,
  format: 'auto',
  progressive: true
});

// Compress an image
const compressed = await kompreser.compress(fileInput.files[0]);
console.log(`Compressed from ${compressed.metadata.originalSize} to ${compressed.size} bytes`);
console.log(`Compression ratio: ${Math.round(compressed.metadata.compressionRatio * 100)}%`);
```

## 📖 Comprehensive Documentation

### Supported Formats

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0;">
  <div style="border: 2px solid #4CAF50; padding: 15px; border-radius: 8px; background: #f8fff8;">
    <h4 style="color: #4CAF50; margin-top: 0;">📝 Input Formats</h4>
    <ul style="margin: 0; padding-left: 20px;">
      <li>JPEG/JPG</li>
      <li>PNG</li>
      <li>WebP</li>
      <li>AVIF</li>
      <li>SVG</li>
      <li>GIF</li>
      <li>BMP</li>
      <li>TIFF</li>
    </ul>
  </div>
  <div style="border: 2px solid #2196F3; padding: 15px; border-radius: 8px; background: #f8f9ff;">
    <h4 style="color: #2196F3; margin-top: 0;">🎯 Output Formats</h4>
    <ul style="margin: 0; padding-left: 20px;">
      <li>JPEG (Progressive)</li>
      <li>PNG (Optimized)</li>
      <li>WebP (Lossy/Lossless)</li>
      <li>AVIF (Modern)</li>
      <li>Progressive JPEG</li>
    </ul>
  </div>
</div>

### Advanced Configuration

```javascript
const kompreser = new Kompreser({
  // Compression settings
  quality: 0.85,                    // 0.0 - 1.0
  format: 'auto',                   // auto, jpeg, png, webp, avif
  progressive: true,                // Enable progressive encoding
  
  // Performance settings
  useWorkers: true,                 // Use Web Workers
  maxWorkers: 8,                    // Maximum worker threads
  batchSize: 10,                    // Batch processing size
  memoryLimit: 512 * 1024 * 1024,   // 512MB memory limit
  
  // Advanced features
  enableAI: false,                  // AI-powered optimization
  enableWebAssembly: true,          // Use WASM for performance
  enableStreaming: true,            // Streaming compression
  enableCaching: true,              // Enable result caching
  
  // Error handling
  enableRecovery: true,             // Automatic error recovery
  maxRetries: 3,                    // Maximum retry attempts
  
  // Security settings
  maxFileSize: 50 * 1024 * 1024,    // 50MB file size limit
  sanitizeMetadata: false,          // Remove sensitive metadata
  
  // Logging
  logLevel: 'INFO',                 // DEBUG, INFO, WARN, ERROR
  enablePerformanceTracking: true    // Performance monitoring
});
```

## 🎯 Advanced Features

### 1. Batch Processing

```javascript
// Compress multiple images at once
const results = await kompreser.compressBatch(files, {
  quality: 0.8,
  format: 'webp'
});

results.forEach((result, index) => {
  if (result.success) {
    console.log(`Image ${index}: ${result.compressionRatio}% reduction`);
  } else {
    console.error(`Image ${index} failed:`, result.error);
  }
});
```

### 2. Format Conversion

```javascript
// Convert between formats
const webpImage = await kompreser.convert(pngFile, 'webp', {
  quality: 0.9
});

const avifImage = await kompreser.convert(jpegFile, 'avif', {
  quality: 0.85
});
```

### 3. Progressive JPEG

```javascript
// Create progressive JPEG for better web performance
const progressiveJPEG = await kompreser.createProgressive(imageFile, {
  quality: 0.9,
  scans: 3 // Number of progressive scans
});
```

### 4. Web Optimization

```javascript
// Optimize specifically for web delivery
const webOptimized = await kompreser.optimizeForWeb(imageFile, {
  targetFormat: 'webp',  // Use WebP with fallbacks
  maxWidth: 1920,        // Responsive sizing
  maxHeight: 1080,
  metadata: 'none'       // Strip metadata for smaller size
});
```

### 5. Custom Compression Strategies

```javascript
// Define custom compression strategies
const strategies = {
  thumbnail: {
    quality: 0.7,
    format: 'webp',
    maxWidth: 300,
    maxHeight: 300
  },
  hero: {
    quality: 0.95,
    format: 'avif',
    progressive: true
  },
  gallery: {
    quality: 0.85,
    format: 'auto',
    enableWebAssembly: true
  }
};

const thumbnail = await kompreser.compress(imageFile, strategies.thumbnail);
```

## 🛠️ Error Handling & Recovery

```javascript
try {
  const result = await kompreser.compress(largeImageFile);
  console.log('Compression successful:', result);
} catch (error) {
  if (error.code === 'MEMORY_ERROR') {
    console.warn('Not enough memory, trying with lower quality...');
    const fallback = await kompreser.compress(largeImageFile, {
      quality: 0.6,
      batchSize: 5
    });
  } else if (error.code === 'FORMAT_ERROR') {
    console.error('Unsupported format:', error.format);
  } else {
    console.error('Compression failed:', error.message);
  }
}
```

## 📊 Performance Monitoring

```javascript
// Get performance statistics
const stats = await kompreser.getPerformanceStats();
console.log('Performance Report:', {
  totalProcessed: stats.logger.operations.totalOperations,
  averageTime: stats.logger.operations.avgDuration,
  memoryUsage: stats.logger.memoryUsage,
  cacheHitRate: stats.cache?.hitRate || 0
});

// Export detailed logs
const logs = kompreser.logger.exportLogs({
  level: 'WARN',
  since: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
});
```

## 🔧 Module System Support

### ES Modules
```javascript
import Kompreser from '@xbibzlibrary/kompreser';
const kompreser = new Kompreser();
```

### CommonJS
```javascript
const Kompreser = require('@xbibzlibrary/kompreser');
const kompreser = new Kompreser();
```

### UMD (Browser)
```html
<script src="https://unpkg.com/@xbibzlibrary/kompreser/dist/kompreser.umd.js"></script>
<script>
  const kompreser = new Kompreser();
</script>
```

### TypeScript
```typescript
import Kompreser, { KompreserOptions, CompressionResult } from '@xbibzlibrary/kompreser';

const options: KompreserOptions = {
  quality: 0.8,
  format: 'webp'
};

const kompreser = new Kompreser(options);
```

## 🧪 Advanced Examples

### Real-time Image Processing

```javascript
class ImageProcessor {
  constructor() {
    this.kompreser = new Kompreser({
      useWorkers: true,
      maxWorkers: 4
    });
  }

  async processUserUpload(file) {
    // Validate file
    const validation = await this.kompreser.validator.validateInput(file);
    if (!validation.valid) {
      throw new Error(`Invalid file: ${validation.errors.join(', ')}`);
    }

    // Create multiple variants
    const variants = await Promise.all([
      // Thumbnail
      this.kompreser.compress(file, {
        maxWidth: 300,
        maxHeight: 300,
        quality: 0.7,
        format: 'webp'
      }),
      
      // Medium size
      this.kompreser.compress(file, {
        maxWidth: 1200,
        maxHeight: 800,
        quality: 0.85,
        format: 'webp'
      }),
      
      // Original quality
      this.kompreser.compress(file, {
        quality: 0.95,
        format: 'avif'
      })
    ]);

    return {
      thumbnail: variants[0],
      medium: variants[1],
      original: variants[2]
    };
  }
}
```

### Progressive Web App Integration

```javascript
// Service Worker for offline image processing
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', async event => {
  if (event.data.type === 'COMPRESS_IMAGE') {
    try {
      const kompreser = new Kompreser();
      const result = await kompreser.compress(event.data.file);
      
      event.ports[0].postMessage({
        type: 'COMPRESSION_COMPLETE',
        result
      });
    } catch (error) {
      event.ports[0].postMessage({
        type: 'COMPRESSION_ERROR',
        error: error.message
      });
    }
  }
});
```

## 🎨 Browser Compatibility

<div style="overflow-x: auto;">
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <thead>
      <tr style="background: #f5f5f5;">
        <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Feature</th>
        <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Chrome</th>
        <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Firefox</th>
        <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Safari</th>
        <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Edge</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding: 12px; border: 1px solid #ddd;">Basic Compression</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background: #d4edda;">✅ 60+</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background: #d4edda;">✅ 60+</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background: #d4edda;">✅ 12+</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background: #d4edda;">✅ 79+</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #ddd;">Web Workers</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background: #d4edda;">✅ 60+</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background: #d4edda;">✅ 60+</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background: #d4edda;">✅ 12+</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background: #d4edda;">✅ 79+</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #ddd;">WebAssembly</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background: #d4edda;">✅ 57+</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background: #d4edda;">✅ 52+</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background: #d4edda;">✅ 11+</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background: #d4edda;">✅ 16+</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #ddd;">WebP Output</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background: #d4edda;">✅ 23+</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background: #d4edda;">✅ 65+</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background: #fff3cd;">⚠️ 16+</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background: #d4edda;">✅ 18+</td>
      </tr>
      <tr>
        <td style="padding: 12px; border: 1px solid #ddd;">AVIF Output</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background: #d4edda;">✅ 85+</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background: #fff3cd;">⚠️ 93+</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background: #d4edda;">✅ 16+</td>
        <td style="padding: 12px; border: 1px solid #ddd; text-align: center; background: #d4edda;">✅ 85+</td>
      </tr>
    </tbody>
  </table>
</div>

## 🏗️ Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/XbibzOfficial777/kompreser.git
cd kompreser

# Install dependencies
npm install

# Build all versions
npm run build

# Run tests
npm test

# Run performance benchmarks
npm run test:performance

# Start development server
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run performance benchmarks
npm run test:performance
```

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 🙏 Acknowledgments

- **Author**: [Xbibz Official](https://github.com/Habibzz01)
- **Special Thanks**: All contributors and the open-source community
- **Inspiration**: Modern web performance optimization techniques

---

<div align="center">
  <p style="font-size: 16px; color: #666;">
    Made with ❤️ by <a href="https://github.com/Habibzz01" style="color: #667eea;">Xbibz Official</a>
  </p>
  <p style="font-size: 14px; color: #999;">
    <a href="https://t.me/XbibzOfficial" style="color: #667eea;">Telegram</a> • 
    <a href="https://tiktok.com/@xbibzofficiall" style="color: #667eea;">TikTok</a> • 
    <a href="https://ko-fi.com/XbibzOfficial" style="color: #667eea;">Support</a>
  </p>
</div>