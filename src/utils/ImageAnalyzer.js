/**
 * @xbibzlibrary/kompreser - Image Analysis Utilities
 * Advanced image content analysis for optimal compression
 */

import Logger from './Logger.js';

class ImageAnalyzer {
  constructor(options, logger) {
    this.options = options;
    this.logger = logger || new Logger();
  }

  async analyze(imageData, options = {}) {
    const timer = this.logger.startTimer('image_analysis');
    
    try {
      const analysis = {
        // Basic properties
        width: imageData.width,
        height: imageData.height,
        pixelCount: imageData.width * imageData.height,
        
        // Color analysis
        hasAlpha: false,
        isGrayscale: true,
        hasColor: false,
        uniqueColors: new Set(),
        colorVariance: 0,
        entropy: 0,
        
        // Content analysis
        isPhotograph: false,
        isGraphic: false,
        hasSharpEdges: false,
        edgeDensity: 0,
        complexity: 0,
        
        // Quality metrics
        blurScore: 0,
        noiseLevel: 0,
        compressionPotential: 0,
        
        // Metadata
        transparencyRatio: 0,
        colorDistribution: {},
        histogram: {},
        
        // Recommendations
        recommendedFormat: 'auto',
        recommendedQuality: 0.8,
        recommendedSettings: {}
      };

      // Analyze pixel data
      const pixelAnalysis = await this.analyzePixels(imageData);
      Object.assign(analysis, pixelAnalysis);

      // Analyze content characteristics
      const contentAnalysis = await this.analyzeContent(imageData);
      Object.assign(analysis, contentAnalysis);

      // Calculate quality metrics
      const qualityAnalysis = await this.analyzeQuality(imageData);
      Object.assign(analysis, qualityAnalysis);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(analysis);
      Object.assign(analysis, recommendations);

      const duration = timer.end();
      this.logger.debug('Image analysis completed', {
        duration,
        width: imageData.width,
        height: imageData.height,
        hasAlpha: analysis.hasAlpha,
        isPhotograph: analysis.isPhotograph,
        recommendedFormat: analysis.recommendedFormat,
        recommendedQuality: analysis.recommendedQuality
      });

      return analysis;
      
    } catch (error) {
      this.logger.error('Image analysis failed', { error: error.message });
      throw new Error(`Image analysis failed: ${error.message}`);
    }
  }

  async analyzePixels(imageData) {
    const { data, width, height } = imageData;
    const analysis = {
      hasAlpha: false,
      isGrayscale: true,
      hasColor: false,
      uniqueColors: new Set(),
      colorVariance: 0,
      entropy: 0,
      transparencyRatio: 0,
      colorDistribution: {},
      histogram: { r: {}, g: {}, b: {}, a: {} }
    };

    let alphaPixels = 0;
    let totalLuminance = 0;
    let luminanceValues = [];

    // Initialize histograms
    for (let i = 0; i < 256; i++) {
      analysis.histogram.r[i] = 0;
      analysis.histogram.g[i] = 0;
      analysis.histogram.b[i] = 0;
      analysis.histogram.a[i] = 0;
    }

    // Analyze each pixel
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Check for alpha
      if (a < 255) {
        analysis.hasAlpha = true;
        alphaPixels++;
      }

      // Check if grayscale
      if (r !== g || g !== b) {
        analysis.isGrayscale = false;
        analysis.hasColor = true;
      }

      // Count unique colors (simplified)
      const colorKey = `${Math.round(r / 8)},${Math.round(g / 8)},${Math.round(b / 8)}`;
      analysis.uniqueColors.add(colorKey);

      // Update histograms
      analysis.histogram.r[r]++;
      analysis.histogram.g[g]++;
      analysis.histogram.b[b]++;
      analysis.histogram.a[a]++;

      // Calculate luminance
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLuminance += luminance;
      luminanceValues.push(luminance);
    }

    // Calculate statistics
    analysis.transparencyRatio = alphaPixels / (width * height);
    analysis.uniqueColorCount = analysis.uniqueColors.size;
    analysis.colorRatio = analysis.uniqueColorCount / (width * height);

    // Calculate color variance
    const meanLuminance = totalLuminance / (width * height);
    let varianceSum = 0;
    for (const lum of luminanceValues) {
      varianceSum += Math.pow(lum - meanLuminance, 2);
    }
    analysis.colorVariance = varianceSum / (width * height);

    // Calculate entropy
    analysis.entropy = this.calculateEntropy(luminanceValues);

    // Calculate color distribution
    analysis.colorDistribution = this.calculateColorDistribution(data);

    return analysis;
  }

  async analyzeContent(imageData) {
    const { data, width, height } = imageData;
    const analysis = {
      isPhotograph: false,
      isGraphic: false,
      hasSharpEdges: false,
      edgeDensity: 0,
      complexity: 0,
      blurScore: 0,
      noiseLevel: 0
    };

    let edgePixels = 0;
    let totalEdges = 0;
    let totalVariance = 0;
    let noiseSum = 0;

    // Analyze image in blocks for performance
    const blockSize = 8;
    
    for (let y = 1; y < height - 1; y += blockSize) {
      for (let x = 1; x < width - 1; x += blockSize) {
        const blockAnalysis = this.analyzeBlock(data, width, height, x, y, blockSize);
        
        edgePixels += blockAnalysis.edgePixels;
        totalVariance += blockAnalysis.variance;
        noiseSum += blockAnalysis.noise;
        totalEdges += blockAnalysis.edgeCount;
      }
    }

    // Calculate metrics
    analysis.edgeDensity = edgePixels / (width * height);
    analysis.complexity = totalVariance / (width * height);
    analysis.noiseLevel = noiseSum / (width * height);

    // Classify content type
    if (analysis.complexity > 1000) {
      analysis.isPhotograph = true;
    } else {
      analysis.isGraphic = true;
    }

    if (analysis.edgeDensity > 0.1) {
      analysis.hasSharpEdges = true;
    }

    // Calculate blur score using Laplacian variance
    analysis.blurScore = this.calculateBlurScore(imageData);

    return analysis;
  }

  analyzeBlock(data, width, height, startX, startY, blockSize) {
    let edgePixels = 0;
    let totalVariance = 0;
    let noiseSum = 0;
    let edgeCount = 0;

    for (let dy = 0; dy < blockSize && startY + dy < height - 1; dy++) {
      for (let dx = 0; dx < blockSize && startX + dx < width - 1; dx++) {
        const x = startX + dx;
        const y = startY + dy;
        
        const center = (y * width + x) * 4;
        const centerLum = 0.299 * data[center] + 0.587 * data[center + 1] + 0.114 * data[center + 2];

        // Edge detection using Sobel operator
        const edges = this.detectEdges(data, width, height, x, y);
        
        if (edges.magnitude > 50) {
          edgePixels++;
          edgeCount++;
        }

        // Calculate local variance
        const localVariance = this.calculateLocalVariance(data, width, height, x, y);
        totalVariance += localVariance;

        // Noise detection
        const noise = this.detectNoise(data, width, height, x, y);
        noiseSum += noise;
      }
    }

    return {
      edgePixels,
      totalVariance,
      noiseSum,
      edgeCount
    };
  }

  detectEdges(data, width, height, x, y) {
    // Sobel operator
    const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    let sumX = 0, sumY = 0;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const pixelX = Math.max(0, Math.min(width - 1, x + dx));
        const pixelY = Math.max(0, Math.min(height - 1, y + dy));
        const index = (pixelY * width + pixelX) * 4;
        
        const luminance = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
        const kernelIndex = (dy + 1) * 3 + (dx + 1);
        
        sumX += luminance * gx[kernelIndex];
        sumY += luminance * gy[kernelIndex];
      }
    }

    const magnitude = Math.sqrt(sumX * sumX + sumY * sumY);
    const direction = Math.atan2(sumY, sumX);

    return { magnitude, direction };
  }

  calculateLocalVariance(data, width, height, x, y) {
    const values = [];
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const pixelX = Math.max(0, Math.min(width - 1, x + dx));
        const pixelY = Math.max(0, Math.min(height - 1, y + dy));
        const index = (pixelY * width + pixelX) * 4;
        
        const luminance = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
        values.push(luminance);
      }
    }

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return variance;
  }

  detectNoise(data, width, height, x, y) {
    // Simple noise detection based on high-frequency components
    const center = (y * width + x) * 4;
    const centerLum = 0.299 * data[center] + 0.587 * data[center + 1] + 0.114 * data[center + 2];

    let differences = [];
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        
        const pixelX = Math.max(0, Math.min(width - 1, x + dx));
        const pixelY = Math.max(0, Math.min(height - 1, y + dy));
        const index = (pixelY * width + pixelX) * 4;
        
        const luminance = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
        differences.push(Math.abs(luminance - centerLum));
      }
    }

    return differences.reduce((sum, diff) => sum + diff, 0) / differences.length;
  }

  calculateBlurScore(imageData) {
    // Calculate Laplacian variance as blur score
    const { data, width, height } = imageData;
    let laplacianSum = 0;
    let laplacianSumSquared = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const center = (y * width + x) * 4;
        
        // Simple Laplacian kernel
        const laplacian = 
          -1 * this.getLuminance(data, width, height, x - 1, y) +
          -1 * this.getLuminance(data, width, height, x, y - 1) +
           4 * this.getLuminance(data, width, height, x, y) +
          -1 * this.getLuminance(data, width, height, x, y + 1) +
          -1 * this.getLuminance(data, width, height, x + 1, y);

        laplacianSum += laplacian;
        laplacianSumSquared += laplacian * laplacian;
        count++;
      }
    }

    const mean = laplacianSum / count;
    const variance = (laplacianSumSquared / count) - (mean * mean);
    
    // Normalize blur score (higher variance = sharper image)
    return Math.min(100, Math.max(0, variance / 1000));
  }

  getLuminance(data, width, height, x, y) {
    const index = (y * width + x) * 4;
    return 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
  }

  calculateEntropy(values) {
    // Calculate Shannon entropy
    const histogram = {};
    
    for (const value of values) {
      const bin = Math.round(value);
      histogram[bin] = (histogram[bin] || 0) + 1;
    }

    let entropy = 0;
    const total = values.length;
    
    for (const count of Object.values(histogram)) {
      const probability = count / total;
      if (probability > 0) {
        entropy -= probability * Math.log2(probability);
      }
    }

    return entropy;
  }

  calculateColorDistribution(data) {
    const distribution = {
      red: 0,
      green: 0,
      blue: 0,
      yellow: 0,
      cyan: 0,
      magenta: 0,
      neutral: 0
    };

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Determine dominant color
      if (r > g && r > b && r > 128) {
        distribution.red++;
      } else if (g > r && g > b && g > 128) {
        distribution.green++;
      } else if (b > r && b > g && b > 128) {
        distribution.blue++;
      } else if (r > 128 && g > 128 && b < 128) {
        distribution.yellow++;
      } else if (g > 128 && b > 128 && r < 128) {
        distribution.cyan++;
      } else if (r > 128 && b > 128 && g < 128) {
        distribution.magenta++;
      } else {
        distribution.neutral++;
      }
    }

    // Normalize to percentages
    const total = data.length / 4;
    for (const key in distribution) {
      distribution[key] = (distribution[key] / total) * 100;
    }

    return distribution;
  }

  async analyzeQuality(imageData) {
    const analysis = {
      blurScore: 0,
      noiseLevel: 0,
      compressionPotential: 0,
      qualityScore: 0
    };

    // Calculate overall quality score (0-100)
    const sharpness = Math.max(0, 100 - this.calculateBlurScore(imageData));
    const cleanliness = Math.max(0, 100 - this.detectOverallNoise(imageData));
    
    analysis.qualityScore = (sharpness + cleanliness) / 2;
    analysis.compressionPotential = this.calculateCompressionPotential(imageData, analysis.qualityScore);

    return analysis;
  }

  detectOverallNoise(imageData) {
    const { data, width, height } = imageData;
    let totalNoise = 0;
    let sampleCount = 0;

    // Sample every 10th pixel for performance
    for (let y = 1; y < height - 1; y += 10) {
      for (let x = 1; x < width - 1; x += 10) {
        const noise = this.detectNoise(data, width, height, x, y);
        totalNoise += noise;
        sampleCount++;
      }
    }

    return totalNoise / sampleCount;
  }

  calculateCompressionPotential(imageData, qualityScore) {
    const { width, height } = imageData;
    
    // Base potential on image characteristics
    let potential = 70; // Base 70% compression potential
    
    // Adjust based on quality score
    if (qualityScore > 80) {
      potential -= 10; // High quality images compress less
    } else if (qualityScore < 30) {
      potential += 15; // Low quality images can be compressed more
    }

    // Adjust based on resolution
    const megaPixels = (width * height) / 1000000;
    if (megaPixels > 10) {
      potential += 5; // Large images have more compression potential
    }

    // Adjust based on content type
    const analysis = this.analyzeContent(imageData);
    if (analysis.isGraphic) {
      potential += 10; // Graphics often compress better
    }

    return Math.min(95, Math.max(40, potential));
  }

  async generateRecommendations(analysis) {
    const recommendations = {
      recommendedFormat: 'auto',
      recommendedQuality: 0.8,
      recommendedSettings: {}
    };

    // Format recommendation
    if (analysis.hasAlpha) {
      recommendations.recommendedFormat = 'webp'; // WebP supports alpha well
    } else if (analysis.isPhotograph && analysis.qualityScore > 70) {
      recommendations.recommendedFormat = 'avif'; // AVIF for high-quality photos
    } else if (analysis.isGraphic) {
      recommendations.recommendedFormat = 'png'; // PNG for graphics
    } else {
      recommendations.recommendedFormat = 'jpeg'; // JPEG as fallback
    }

    // Quality recommendation
    if (analysis.qualityScore > 80) {
      recommendations.recommendedQuality = 0.9;
    } else if (analysis.qualityScore > 60) {
      recommendations.recommendedQuality = 0.8;
    } else if (analysis.qualityScore > 40) {
      recommendations.recommendedQuality = 0.7;
    } else {
      recommendations.recommendedQuality = 0.6;
    }

    // Additional settings
    recommendations.recommendedSettings = {
      progressive: analysis.isPhotograph && analysis.width > 1000,
      optimize: analysis.compressionPotential > 70,
      chromaSubsampling: analysis.isPhotograph,
      filterStrength: analysis.hasSharpEdges ? 60 : 40
    };

    return recommendations;
  }
}

export default ImageAnalyzer;