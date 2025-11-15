# Kompreser Examples

## Quick Start Examples

### Basic Image Compression

```javascript
import Kompreser from '@xbibzlibrary/kompreser';

// Initialize with default settings
const kompreser = new Kompreser();

// Compress a single image
const result = await kompreser.compress(fileInput.files[0]);

console.log(`Original size: ${result.metadata.originalSize} bytes`);
console.log(`Compressed size: ${result.size} bytes`);
console.log(`Compression ratio: ${Math.round(result.metadata.compressionRatio * 100)}%`);

// Create download link
const blob = new Blob([result.data], { type: `image/${result.format}` });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = `compressed.${result.format}`;
link.click();
```

### Batch Processing

```javascript
// Compress multiple images
const files = Array.from(fileInput.files);
const results = await kompreser.compressBatch(files, {
  quality: 0.8,
  format: 'webp'
});

// Process results
results.forEach((result, index) => {
  if (result.success) {
    console.log(`Image ${index + 1}: ✅ ${result.result.metadata.compressionRatio}% reduction`);
  } else {
    console.log(`Image ${index + 1}: ❌ ${result.error}`);
  }
});

// Calculate overall statistics
const successful = results.filter(r => r.success);
const totalOriginal = successful.reduce((sum, r) => sum + r.result.metadata.originalSize, 0);
const totalCompressed = successful.reduce((sum, r) => sum + r.result.size, 0);
const overallReduction = Math.round((1 - totalCompressed / totalOriginal) * 100);

console.log(`Overall reduction: ${overallReduction}%`);
```

## Web Application Examples

### Image Upload with Preview

```html
<!DOCTYPE html>
<html>
<head>
    <title>Image Upload with Compression</title>
    <style>
        .upload-area {
            border: 2px dashed #ccc;
            border-radius: 8px;
            padding: 40px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .upload-area:hover {
            border-color: #667eea;
            background-color: #f8f9ff;
        }
        .upload-area.dragover {
            border-color: #764ba2;
            background-color: #f0f2ff;
        }
        .preview-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .preview-item {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            background: white;
        }
        .preview-item img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            border-radius: 4px;
        }
        .stats {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            font-size: 14px;
        }
        .progress-bar {
            width: 100%;
            height: 6px;
            background: #e9ecef;
            border-radius: 3px;
            overflow: hidden;
            margin-top: 10px;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #8BC34A);
            transition: width 0.3s ease;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🖼️ Image Upload with Compression</h1>
        
        <div id="uploadArea" class="upload-area">
            <i class="fas fa-cloud-upload-alt" style="font-size: 48px; color: #667eea; margin-bottom: 20px;"></i>
            <h3>Drop images here or click to select</h3>
            <p>Supports JPEG, PNG, WebP, AVIF, GIF, BMP, TIFF</p>
            <input type="file" id="fileInput" multiple accept="image/*" style="display: none;">
            <button onclick="document.getElementById('fileInput').click()" style="margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">
                Choose Files
            </button>
        </div>
        
        <div id="progressContainer" style="display: none; margin: 20px 0;">
            <div class="progress-bar">
                <div id="progressFill" class="progress-fill" style="width: 0%;"></div>
            </div>
            <p id="progressText" style="text-align: center; margin-top: 10px;">Processing...</p>
        </div>
        
        <div id="previewContainer" class="preview-container"></div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/js/all.min.js"></script>
    <script src="../dist/kompreser.umd.js"></script>
    <script>
        class ImageUploader {
            constructor() {
                this.kompreser = new Kompreser({
                    quality: 0.85,
                    format: 'auto',
                    progressive: true,
                    useWorkers: true,
                    maxWorkers: 4,
                    enablePerformanceTracking: true
                });
                
                this.setupEventListeners();
            }
            
            setupEventListeners() {
                const uploadArea = document.getElementById('uploadArea');
                const fileInput = document.getElementById('fileInput');
                
                // Drag and drop
                uploadArea.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    uploadArea.classList.add('dragover');
                });
                
                uploadArea.addEventListener('dragleave', () => {
                    uploadArea.classList.remove('dragover');
                });
                
                uploadArea.addEventListener('drop', (e) => {
                    e.preventDefault();
                    uploadArea.classList.remove('dragover');
                    const files = Array.from(e.dataTransfer.files);
                    this.processFiles(files);
                });
                
                // File input
                fileInput.addEventListener('change', (e) => {
                    const files = Array.from(e.target.files);
                    this.processFiles(files);
                });
            }
            
            async processFiles(files) {
                const imageFiles = files.filter(file => file.type.startsWith('image/'));
                
                if (imageFiles.length === 0) {
                    alert('Please select image files only.');
                    return;
                }
                
                this.showProgress();
                
                try {
                    const results = await this.kompreser.compressBatch(imageFiles, {
                        quality: 0.85,
                        maxWidth: 1920,
                        maxHeight: 1080,
                        progressive: true
                    });
                    
                    this.displayResults(results, imageFiles);
                    this.updateOverallStats(results);
                    
                } catch (error) {
                    console.error('Compression failed:', error);
                    alert('Failed to compress images: ' + error.message);
                } finally {
                    this.hideProgress();
                }
            }
            
            showProgress() {
                document.getElementById('progressContainer').style.display = 'block';
                document.getElementById('progressFill').style.width = '0%';
                document.getElementById('progressText').textContent = 'Processing...';
            }
            
            hideProgress() {
                document.getElementById('progressContainer').style.display = 'none';
            }
            
            updateProgress(percentage, text) {
                document.getElementById('progressFill').style.width = percentage + '%';
                document.getElementById('progressText').textContent = text;
            }
            
            displayResults(results, originalFiles) {
                const container = document.getElementById('previewContainer');
                container.innerHTML = '';
                
                results.forEach((result, index) => {
                    const originalFile = originalFiles[index];
                    const previewItem = this.createPreviewItem(result, originalFile);
                    container.appendChild(previewItem);
                });
            }
            
            createPreviewItem(result, originalFile) {
                const item = document.createElement('div');
                item.className = 'preview-item';
                
                if (result.success) {
                    const blob = new Blob([result.result.data], { 
                        type: `image/${result.result.format}` 
                    });
                    const url = URL.createObjectURL(blob);
                    
                    const compressionRatio = Math.round(result.result.metadata.compressionRatio * 100);
                    const sizeReduction = result.result.metadata.originalSize - result.result.size;
                    
                    item.innerHTML = `
                        <img src="${url}" alt="Compressed image">
                        <h4>${originalFile.name}</h4>
                        <div class="stats">
                            <div><strong>Format:</strong> ${result.result.format.toUpperCase()}</div>
                            <div><strong>Original:</strong> ${this.formatBytes(result.result.metadata.originalSize)}</div>
                            <div><strong>Compressed:</strong> ${this.formatBytes(result.result.size)}</div>
                            <div><strong>Reduction:</strong> ${compressionRatio}% (${this.formatBytes(sizeReduction)} saved)</div>
                            <div><strong>Processing:</strong> ${result.result.metadata.processingTime.toFixed(2)}ms</div>
                        </div>
                        <button onclick="this.downloadImage('${url}', '${originalFile.name}', '${result.result.format}')" 
                                style="margin-top: 10px; padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            <i class="fas fa-download"></i> Download
                        </button>
                    `;
                    
                    // Store URL for cleanup
                    item.dataset.url = url;
                    
                } else {
                    item.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: #dc3545;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px;"></i>
                            <h4>Failed: ${originalFile.name}</h4>
                            <p>${result.error}</p>
                        </div>
                    `;
                }
                
                return item;
            }
            
            downloadImage(url, originalName, format) {
                const a = document.createElement('a');
                a.href = url;
                a.download = originalName.replace(/\.[^/.]+$/, '') + `_compressed.${format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
            
            updateOverallStats(results) {
                const successful = results.filter(r => r.success);
                
                if (successful.length > 0) {
                    const totalOriginal = successful.reduce((sum, r) => sum + r.result.metadata.originalSize, 0);
                    const totalCompressed = successful.reduce((sum, r) => sum + r.result.size, 0);
                    const totalReduction = Math.round((1 - totalCompressed / totalOriginal) * 100);
                    const avgProcessing = successful.reduce((sum, r) => sum + r.result.metadata.processingTime, 0) / successful.length;
                    
                    // Create summary
                    const summary = document.createElement('div');
                    summary.className = 'preview-item';
                    summary.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
                    summary.style.color = 'white';
                    summary.innerHTML = `
                        <h3 style="text-align: center; margin-bottom: 20px;">
                            <i class="fas fa-chart-bar"></i> Processing Summary
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                            <div style="text-align: center;">
                                <div style="font-size: 2rem; font-weight: bold;">${results.length}</div>
                                <div style="opacity: 0.8;">Files Processed</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 2rem; font-weight: bold;">${successful.length}</div>
                                <div style="opacity: 0.8;">Successful</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 2rem; font-weight: bold;">${totalReduction}%</div>
                                <div style="opacity: 0.8;">Size Reduction</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 2rem; font-weight: bold;">${avgProcessing.toFixed(1)}ms</div>
                                <div style="opacity: 0.8;">Avg Processing</div>
                            </div>
                        </div>
                    `;
                    
                    document.getElementById('previewContainer').appendChild(summary);
                }
            }
            
            formatBytes(bytes) {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            }
        }
        
        // Initialize the uploader
        const uploader = new ImageUploader();
        
        // Add download method to global scope
        window.downloadImage = function(url, originalName, format) {
            const a = document.createElement('a');
            a.href = url;
            a.download = originalName.replace(/\.[^/.]+$/, '') + `_compressed.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };
        
        // Cleanup object URLs on page unload
        window.addEventListener('beforeunload', () => {
            const previewItems = document.querySelectorAll('.preview-item[data-url]');
            previewItems.forEach(item => {
                if (item.dataset.url) {
                    URL.revokeObjectURL(item.dataset.url);
                }
            });
        });
    </script>
</body>
</html>
```

### React Component

```jsx
import React, { useState, useCallback } from 'react';
import Kompreser from '@xbibzlibrary/kompreser';

const ImageCompressor = ({ onImagesCompressed, maxSize = 5 * 1024 * 1024 }) => {
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  
  const kompreser = new Kompreser({
    quality: 0.85,
    format: 'auto',
    maxFileSize: maxSize,
    useWorkers: true
  });
  
  const handleFileDrop = useCallback(async (files) => {
    const imageFiles = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (imageFiles.length === 0) {
      alert('Please select image files only.');
      return;
    }
    
    setIsCompressing(true);
    setProgress(0);
    
    try {
      const compressionResults = await kompreser.compressBatch(imageFiles, {
        onProgress: (progressData) => {
          setProgress((progressData.processed / progressData.total) * 100);
        }
      });
      
      setResults(compressionResults);
      
      // Call parent callback with successful results
      if (onImagesCompressed) {
        const successfulResults = compressionResults
          .filter(result => result.success)
          .map(result => ({
            originalFile: result.input,
            compressedData: result.result.data,
            format: result.result.format,
            compressionRatio: result.result.metadata.compressionRatio
          }));
        
        onImagesCompressed(successfulResults);
      }
      
    } catch (error) {
      console.error('Compression failed:', error);
      alert('Failed to compress images: ' + error.message);
    } finally {
      setIsCompressing(false);
      setProgress(0);
    }
  }, [onImagesCompressed, maxSize]);
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileDrop(e.dataTransfer.files);
  };
  
  const handleFileInput = (e) => {
    handleFileDrop(e.target.files);
  };
  
  const downloadImage = (result, index) => {
    if (!result.success) return;
    
    const blob = new Blob([result.result.data], { 
      type: `image/${result.result.format}` 
    });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `compressed_${index + 1}.${result.result.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="image-compressor">
      <div 
        className={`drop-zone ${isCompressing ? 'compressing' : ''}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isCompressing ? (
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <p>Compressing images... {Math.round(progress)}%</p>
          </div>
        ) : (
          <>
            <i className="fas fa-cloud-upload-alt"></i>
            <h3>Drop images here or click to select</h3>
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              onChange={handleFileInput}
              style={{ display: 'none' }}
              id="file-input"
            />
            <button onClick={() => document.getElementById('file-input').click()}>
              Choose Files
            </button>
          </>
        )}
      </div>
      
      {results.length > 0 && (
        <div className="results-grid">
          {results.map((result, index) => (
            <div key={index} className={`result-item ${result.success ? 'success' : 'error'}`}>
              {result.success ? (
                <>
                  <img 
                    src={URL.createObjectURL(new Blob([result.result.data]))} 
                    alt={`Compressed ${index + 1}`}
                  />
                  <div className="result-info">
                    <h4>Image {index + 1}</h4>
                    <p>Format: {result.result.format.toUpperCase()}</p>
                    <p>Size: {this.formatBytes(result.result.size)}</p>
                    <p>Reduction: {Math.round(result.result.metadata.compressionRatio * 100)}%</p>
                    <button onClick={() => downloadImage(result, index)}>
                      Download
                    </button>
                  </div>
                </>
              ) : (
                <div className="error-info">
                  <i className="fas fa-exclamation-triangle"></i>
                  <h4>Failed to compress</h4>
                  <p>{result.error}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageCompressor;
```

### Vue Component

```vue
<template>
  <div class="image-compressor">
    <div 
      class="upload-area"
      :class="{ 'dragover': isDragOver, 'compressing': isCompressing }"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="openFileDialog"
    >
      <div v-if="isCompressing" class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
        <p>Compressing... {{ Math.round(progress) }}%</p>
      </div>
      
      <div v-else class="upload-section">
        <i class="fas fa-cloud-upload-alt"></i>
        <h3>Drop images here or click to select</h3>
        <p>Supports all major image formats</p>
        <input 
          ref="fileInput" 
          type="file" 
          multiple 
          accept="image/*" 
          @change="handleFileSelect" 
          style="display: none;"
        />
      </div>
    </div>
    
    <div v-if="results.length > 0" class="results-section">
      <h3>Compression Results</h3>
      <div class="results-grid">
        <div 
          v-for="(result, index) in results" 
          :key="index"
          :class="['result-card', result.success ? 'success' : 'error']"
        >
          <div v-if="result.success" class="success-content">
            <img :src="createObjectURL(result.result.data, result.result.format)" alt="Compressed image">
            <div class="result-info">
              <h4>{{ files[index]?.name || `Image ${index + 1}` }}</h4>
              <div class="stats">
                <span class="format">{{ result.result.format.toUpperCase() }}</span>
                <span class="size">{{ formatBytes(result.result.size) }}</span>
                <span class="reduction">-{{ Math.round(result.result.metadata.compressionRatio * 100) }}%</span>
              </div>
              <button @click="downloadImage(result, index)" class="download-btn">
                <i class="fas fa-download"></i> Download
              </button>
            </div>
          </div>
          
          <div v-else class="error-content">
            <i class="fas fa-exclamation-triangle"></i>
            <h4>Compression Failed</h4>
            <p>{{ result.error }}</p>
          </div>
        </div>
      </div>
      
      <div class="summary-stats">
        <h4>Summary</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">{{ results.length }}</span>
            <span class="stat-label">Files Processed</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ successfulResults.length }}</span>
            <span class="stat-label">Successful</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ overallReduction }}%</span>
            <span class="stat-label">Size Reduction</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ avgProcessingTime.toFixed(1) }}ms</span>
            <span class="stat-label">Avg Processing</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Kompreser from '@xbibzlibrary/kompreser';

export default {
  name: 'ImageCompressor',
  
  data() {
    return {
      kompreser: null,
      isDragOver: false,
      isCompressing: false,
      progress: 0,
      results: [],
      files: []
    };
  },
  
  computed: {
    successfulResults() {
      return this.results.filter(r => r.success);
    },
    
    overallReduction() {
      const successful = this.successfulResults;
      if (successful.length === 0) return 0;
      
      const totalOriginal = successful.reduce((sum, r) => sum + r.result.metadata.originalSize, 0);
      const totalCompressed = successful.reduce((sum, r) => sum + r.result.size, 0);
      
      return Math.round((1 - totalCompressed / totalOriginal) * 100);
    },
    
    avgProcessingTime() {
      const successful = this.successfulResults;
      if (successful.length === 0) return 0;
      
      const totalTime = successful.reduce((sum, r) => sum + r.result.metadata.processingTime, 0);
      return totalTime / successful.length;
    }
  },
  
  mounted() {
    this.kompreser = new Kompreser({
      quality: 0.85,
      format: 'auto',
      progressive: true,
      useWorkers: true,
      maxWorkers: 4
    });
  },
  
  methods: {
    handleDragOver(e) {
      e.preventDefault();
      this.isDragOver = true;
    },
    
    handleDragLeave(e) {
      e.preventDefault();
      this.isDragOver = false;
    },
    
    handleDrop(e) {
      e.preventDefault();
      this.isDragOver = false;
      const files = Array.from(e.dataTransfer.files);
      this.processFiles(files);
    },
    
    handleFileSelect(e) {
      const files = Array.from(e.target.files);
      this.processFiles(files);
    },
    
    openFileDialog() {
      if (!this.isCompressing) {
        this.$refs.fileInput.click();
      }
    },
    
    async processFiles(files) {
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      
      if (imageFiles.length === 0) {
        this.$emit('error', 'Please select image files only.');
        return;
      }
      
      this.isCompressing = true;
      this.progress = 0;
      this.files = imageFiles;
      
      try {
        const results = await this.kompreser.compressBatch(imageFiles, {
          onProgress: (progressData) => {
            this.progress = (progressData.processed / progressData.total) * 100;
          }
        });
        
        this.results = results;
        this.$emit('complete', results);
        
      } catch (error) {
        this.$emit('error', error.message);
      } finally {
        this.isCompressing = false;
        this.progress = 0;
      }
    },
    
    createObjectURL(data, format) {
      const blob = new Blob([data], { type: `image/${format}` });
      return URL.createObjectURL(blob);
    },
    
    downloadImage(result, index) {
      if (!result.success) return;
      
      const blob = new Blob([result.result.data], { 
        type: `image/${result.result.format}` 
      });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = (this.files[index]?.name || `image_${index + 1}`).replace(/\.[^/.]+$/, '') + 
                   `_compressed.${result.result.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
    },
    
    formatBytes(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
  }
};
</script>

<style scoped>
.image-compressor {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 12px;
  padding: 60px 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #f8f9fa;
}

.upload-area:hover {
  border-color: #667eea;
  background: #f8f9ff;
}

.upload-area.dragover {
  border-color: #764ba2;
  background: #f0f2ff;
  transform: scale(1.02);
}

.upload-area.compressing {
  cursor: not-allowed;
  opacity: 0.7;
}

.upload-section i {
  font-size: 64px;
  color: #667eea;
  margin-bottom: 20px;
}

.upload-section h3 {
  margin-bottom: 10px;
  color: #333;
}

.upload-section p {
  color: #666;
  margin-bottom: 20px;
}

.progress-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.progress-bar {
  width: 100%;
  max-width: 400px;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 15px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  transition: width 0.3s ease;
}

.results-section {
  margin-top: 40px;
}

.results-section h3 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.result-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.2s ease;
}

.result-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.result-card.success {
  border-left: 4px solid #28a745;
}

.result-card.error {
  border-left: 4px solid #dc3545;
}

.success-content img {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.result-info {
  padding: 15px;
}

.result-info h4 {
  margin-bottom: 10px;
  color: #333;
  word-break: break-all;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.stats span {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.format {
  background: #667eea;
  color: white;
}

.size {
  background: #28a745;
  color: white;
}

.reduction {
  background: #17a2b8;
  color: white;
}

.download-btn {
  width: 100%;
  padding: 8px 16px;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
}

.download-btn:hover {
  background: #218838;
}

.error-content {
  padding: 40px 20px;
  text-align: center;
  color: #dc3545;
}

.error-content i {
  font-size: 48px;
  margin-bottom: 20px;
}

.error-content h4 {
  margin-bottom: 10px;
}

.summary-stats {
  margin-top: 40px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.summary-stats h4 {
  text-align: center;
  margin-bottom: 20px;
  color: #333;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
}

.stat-item {
  text-align: center;
  padding: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-value {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 5px;
}

.stat-label {
  color: #666;
  font-size: 14px;
}
</style>
```

## Performance Optimization Examples

### Memory-Efficient Batch Processing

```javascript
class MemoryEfficientProcessor {
  constructor() {
    this.kompreser = new Kompreser({
      memoryLimit: 256 * 1024 * 1024, // 256MB
      batchSize: 5,
      enableMemoryPooling: true
    });
  }
  
  async processLargeBatch(files) {
    const results = [];
    
    // Process in small batches to avoid memory issues
    for (let i = 0; i < files.length; i += 10) {
      const batch = files.slice(i, i + 10);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const batchResults = await this.kompreser.compressBatch(batch, {
        quality: 0.7, // Lower quality for memory efficiency
        maxWidth: 1200,
        maxHeight: 800
      });
      
      results.push(...batchResults);
      
      // Clear processed files from memory
      batch.forEach(file => {
        if (file instanceof Blob) {
          URL.revokeObjectURL(file);
        }
      });
    }
    
    return results;
  }
}
```

### Progressive Loading with Intersection Observer

```javascript
class ProgressiveImageLoader {
  constructor() {
    this.kompreser = new Kompreser({
      enableProgressive: true,
      progressiveScans: 3
    });
    
    this.observer = new IntersectionObserver(this.handleIntersection.bind(this), {
      rootMargin: '50px'
    });
  }
  
  async loadImage(element, originalSrc) {
    // Create progressive versions
    const progressiveVersions = await this.createProgressiveVersions(originalSrc);
    
    // Start with low quality
    element.src = progressiveVersions.low;
    
    // Observe for viewport entry
    this.observer.observe(element);
    
    // Store versions for later use
    element.dataset.versions = JSON.stringify(progressiveVersions);
  }
  
  async createProgressiveVersions(src) {
    const img = await this.loadImage(src);
    
    const versions = {
      low: await this.kompreser.compress(img, { quality: 0.3, maxWidth: 200 }),
      medium: await this.kompreser.compress(img, { quality: 0.6, maxWidth: 600 }),
      high: await this.kompreser.compress(img, { quality: 0.9, maxWidth: 1200 })
    };
    
    return versions;
  }
  
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        const versions = JSON.parse(element.dataset.versions);
        
        // Load higher quality versions progressively
        setTimeout(() => {
          element.src = versions.medium;
        }, 100);
        
        setTimeout(() => {
          element.src = versions.high;
        }, 300);
        
        // Stop observing
        this.observer.unobserve(element);
      }
    });
  }
}
```

## Enterprise Integration Examples

### CDN Integration

```javascript
class CDNImageOptimizer {
  constructor(cdnConfig) {
    this.kompreser = new Kompreser({
      enableWebAssembly: true,
      useWorkers: navigator.hardwareConcurrency || 4
    });
    
    this.cdnConfig = cdnConfig;
  }
  
  async optimizeForCDN(imageFile, options = {}) {
    // Create multiple optimized versions
    const versions = await this.createOptimizedVersions(imageFile);
    
    // Upload to CDN
    const cdnUrls = await this.uploadToCDN(versions);
    
    // Generate responsive image markup
    return this.generateResponsiveMarkup(cdnUrls, options);
  }
  
  async createOptimizedVersions(file) {
    const versions = {};
    
    // Create WebP version
    versions.webp = await this.kompreser.compress(file, {
      quality: 0.85,
      format: 'webp'
    });
    
    // Create AVIF version
    try {
      versions.avif = await this.kompreser.compress(file, {
        quality: 0.8,
        format: 'avif'
      });
    } catch (error) {
      console.warn('AVIF not supported, using WebP only');
    }
    
    // Create JPEG fallback
    versions.jpeg = await this.kompreser.compress(file, {
      quality: 0.9,
      format: 'jpeg',
      progressive: true
    });
    
    // Create multiple sizes
    const sizes = [320, 480, 768, 1024, 1280, 1920];
    
    for (const size of sizes) {
      versions[`${size}w`] = {
        webp: await this.kompreser.resize(file, { maxWidth: size, format: 'webp' }),
        jpeg: await this.kompreser.resize(file, { maxWidth: size, format: 'jpeg' })
      };
    }
    
    return versions;
  }
  
  generateResponsiveMarkup(urls, options) {
    const { alt = '', className = '', loading = 'lazy' } = options;
    
    return `
      <picture>
        ${urls.avif ? `<source srcset="${urls.avif}" type="image/avif">` : ''}
        <source srcset="${urls.webp}" type="image/webp">
        <img 
          src="${urls.jpeg}" 
          alt="${alt}"
          class="${className}"
          loading="${loading}"
          ${this.generateSrcset(urls)}
        >
      </picture>
    `;
  }
  
  generateSrcset(urls) {
    const sizes = Object.keys(urls).filter(key => key.endsWith('w'));
    
    const srcset = sizes.map(size => {
      const width = size.replace('w', '');
      return `${urls[size].webp} ${width}w`;
    }).join(', ');
    
    return `srcset="${srcset}"`;
  }
}
```

### Analytics Integration

```javascript
class AnalyticsImageTracker {
  constructor(analytics, kompreser) {
    this.analytics = analytics;
    this.kompreser = kompreser;
    
    // Track compression metrics
    this.metrics = {
      totalImages: 0,
      totalSizeBefore: 0,
      totalSizeAfter: 0,
      compressionEvents: []
    };
  }
  
  async compressWithTracking(input, options = {}) {
    const startTime = performance.now();
    const trackingId = this.generateTrackingId();
    
    try {
      const result = await this.kompreser.compress(input, options);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;
      
      // Track successful compression
      this.trackCompression({
        trackingId,
        success: true,
        originalSize: result.metadata.originalSize,
        compressedSize: result.size,
        compressionRatio: result.metadata.compressionRatio,
        format: result.format,
        quality: result.quality,
        processingTime,
        options
      });
      
      return result;
      
    } catch (error) {
      // Track failed compression
      this.trackCompression({
        trackingId,
        success: false,
        error: error.message,
        errorCode: error.code,
        processingTime: performance.now() - startTime
      });
      
      throw error;
    }
  }
  
  trackCompression(data) {
    this.metrics.totalImages++;
    
    if (data.success) {
      this.metrics.totalSizeBefore += data.originalSize;
      this.metrics.totalSizeAfter += data.compressedSize;
    }
    
    this.metrics.compressionEvents.push({
      timestamp: new Date().toISOString(),
      ...data
    });
    
    // Send to analytics
    this.analytics.track('image_compression', {
      success: data.success,
      compression_ratio: data.compressionRatio,
      format: data.format,
      processing_time: data.processingTime,
      size_before: data.originalSize,
      size_after: data.compressedSize
    });
  }
  
  getMetrics() {
    const overallRatio = this.metrics.totalSizeBefore > 0 
      ? (1 - this.metrics.totalSizeAfter / this.metrics.totalSizeBefore)
      : 0;
    
    return {
      ...this.metrics,
      overallCompressionRatio: overallRatio,
      averageProcessingTime: this.metrics.compressionEvents.length > 0
        ? this.metrics.compressionEvents.reduce((sum, event) => sum + event.processingTime, 0) / this.metrics.compressionEvents.length
        : 0,
      successRate: this.metrics.compressionEvents.filter(e => e.success).length / this.metrics.totalImages
    };
  }
  
  generateTrackingId() {
    return 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}
```

## Testing Examples

### Unit Tests

```javascript
import { Kompreser, ValidationError } from '@xbibzlibrary/kompreser';

describe('Kompreser', () => {
  let kompreser;
  
  beforeEach(() => {
    kompreser = new Kompreser({
      quality: 0.8,
      format: 'auto'
    });
  });
  
  test('compresses JPEG image', async () => {
    const jpegFile = createMockFile('test.jpg', 'image/jpeg', 1024 * 1024);
    
    const result = await kompreser.compress(jpegFile);
    
    expect(result.success).toBe(true);
    expect(result.format).toBe('jpeg');
    expect(result.size).toBeLessThan(result.metadata.originalSize);
    expect(result.metadata.compressionRatio).toBeGreaterThan(0);
  });
  
  test('handles invalid input', async () => {
    await expect(kompreser.compress(null)).rejects.toThrow(ValidationError);
    await expect(kompreser.compress('invalid')).rejects.toThrow(ValidationError);
  });
  
  test('respects quality setting', async () => {
    const file = createMockFile('test.png', 'image/png', 500 * 1024);
    
    const lowQuality = await kompreser.compress(file, { quality: 0.3 });
    const highQuality = await kompreser.compress(file, { quality: 0.9 });
    
    expect(lowQuality.size).toBeLessThan(highQuality.size);
  });
  
  test('batch processing', async () => {
    const files = [
      createMockFile('test1.jpg', 'image/jpeg', 1024 * 1024),
      createMockFile('test2.png', 'image/png', 800 * 1024),
      createMockFile('test3.webp', 'image/webp', 600 * 1024)
    ];
    
    const results = await kompreser.compressBatch(files);
    
    expect(results).toHaveLength(3);
    expect(results.filter(r => r.success)).toHaveLength(3);
  });
});
```

### Performance Tests

```javascript
describe('Kompreser Performance', () => {
  const kompreser = new Kompreser({
    enablePerformanceTracking: true
  });
  
  test('large image processing', async () => {
    const largeImage = createLargeMockImage(4000, 3000);
    
    const startTime = performance.now();
    const result = await kompreser.compress(largeImage);
    const endTime = performance.now();
    
    expect(result.metadata.processingTime).toBeLessThan(5000); // 5 seconds
    expect(endTime - startTime).toBeLessThan(6000);
  });
  
  test('memory usage stays within limits', async () => {
    const initialMemory = performance.memory?.usedJSHeapSize;
    
    const results = await kompreser.compressBatch(largeFiles, {
      memoryLimit: 100 * 1024 * 1024 // 100MB
    });
    
    const finalMemory = performance.memory?.usedJSHeapSize;
    
    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(150 * 1024 * 1024); // 150MB
    }
  });
  
  test('worker performance', async () => {
    const kompreserWithWorkers = new Kompreser({ useWorkers: true });
    const kompreserWithoutWorkers = new Kompreser({ useWorkers: false });
    
    const files = generateTestFiles(10);
    
    const startWithWorkers = performance.now();
    await kompreserWithWorkers.compressBatch(files);
    const timeWithWorkers = performance.now() - startWithWorkers;
    
    const startWithoutWorkers = performance.now();
    await kompreserWithoutWorkers.compressBatch(files);
    const timeWithoutWorkers = performance.now() - startWithoutWorkers;
    
    // Workers should provide performance improvement
    expect(timeWithWorkers).toBeLessThan(timeWithoutWorkers * 0.8);
  });
});
```

These examples demonstrate the comprehensive capabilities of Kompreser and provide practical implementation patterns for various use cases, from simple image compression to complex enterprise integrations.