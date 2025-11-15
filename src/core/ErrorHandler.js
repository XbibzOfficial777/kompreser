/**
 * @xbibzlibrary/kompreser - Advanced Error Handling System
 * Comprehensive error management with detailed logging and recovery mechanisms
 */

class KompreserError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'KompreserError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.severity = this.getSeverity(code);
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, KompreserError);
    }
  }

  getSeverity(code) {
    const severityMap = {
      'VALIDATION_ERROR': 'HIGH',
      'FORMAT_ERROR': 'HIGH',
      'COMPRESSION_ERROR': 'MEDIUM',
      'MEMORY_ERROR': 'HIGH',
      'WORKER_ERROR': 'MEDIUM',
      'TIMEOUT_ERROR': 'MEDIUM',
      'UNSUPPORTED_ERROR': 'HIGH',
      'METADATA_ERROR': 'LOW',
      'PERFORMANCE_ERROR': 'LOW'
    };
    return severityMap[code] || 'MEDIUM';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      timestamp: this.timestamp,
      details: this.details,
      stack: this.stack
    };
  }
}

class ValidationError extends KompreserError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

class FormatError extends KompreserError {
  constructor(message, format, details = {}) {
    super(`Format error: ${message}`, 'FORMAT_ERROR', { format, ...details });
    this.name = 'FormatError';
    this.format = format;
  }
}

class CompressionError extends KompreserError {
  constructor(message, algorithm, details = {}) {
    super(`Compression failed: ${message}`, 'COMPRESSION_ERROR', { algorithm, ...details });
    this.name = 'CompressionError';
    this.algorithm = algorithm;
  }
}

class MemoryError extends KompreserError {
  constructor(message, details = {}) {
    super(`Memory error: ${message}`, 'MEMORY_ERROR', details);
    this.name = 'MemoryError';
  }
}

class WorkerError extends KompreserError {
  constructor(message, workerId, details = {}) {
    super(`Worker error: ${message}`, 'WORKER_ERROR', { workerId, ...details });
    this.name = 'WorkerError';
    this.workerId = workerId;
  }
}

class TimeoutError extends KompreserError {
  constructor(operation, timeout, details = {}) {
    super(`Operation '${operation}' timed out after ${timeout}ms`, 'TIMEOUT_ERROR', { operation, timeout, ...details });
    this.name = 'TimeoutError';
    this.operation = operation;
    this.timeout = timeout;
  }
}

class UnsupportedError extends KompreserError {
  constructor(feature, details = {}) {
    super(`Unsupported feature: ${feature}`, 'UNSUPPORTED_ERROR', { feature, ...details });
    this.name = 'UnsupportedError';
    this.feature = feature;
  }
}

class MetadataError extends KompreserError {
  constructor(message, metadataType, details = {}) {
    super(`Metadata error: ${message}`, 'METADATA_ERROR', { metadataType, ...details });
    this.name = 'MetadataError';
    this.metadataType = metadataType;
  }
}

class PerformanceError extends KompreserError {
  constructor(message, metric, details = {}) {
    super(`Performance issue: ${message}`, 'PERFORMANCE_ERROR', { metric, ...details });
    this.name = 'PerformanceError';
    this.metric = metric;
  }
}

class ErrorHandler {
  constructor(options = {}) {
    this.options = {
      logLevel: 'INFO',
      enableRecovery: true,
      maxRetries: 3,
      retryDelay: 1000,
      enableDetailedLogging: true,
      ...options
    };
    
    this.errorCounts = new Map();
    this.recoveryStrategies = new Map();
    this.setupRecoveryStrategies();
  }

  setupRecoveryStrategies() {
    // Memory recovery strategy
    this.recoveryStrategies.set('MEMORY_ERROR', async (error, context) => {
      if (this.options.enableRecovery) {
        console.warn('[Kompreser] Attempting memory recovery...');
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        // Clear caches
        if (context.cache) {
          context.cache.clear();
        }
        
        // Reduce processing batch size
        if (context.batchProcessor) {
          context.batchProcessor.reduceBatchSize();
        }
        
        return { recovered: true, strategy: 'memory_cleanup' };
      }
      return { recovered: false };
    });

    // Worker recovery strategy
    this.recoveryStrategies.set('WORKER_ERROR', async (error, context) => {
      if (this.options.enableRecovery && context.workerPool) {
        console.warn('[Kompreser] Attempting worker recovery...');
        
        try {
          await context.workerPool.restartWorker(error.workerId);
          return { recovered: true, strategy: 'worker_restart' };
        } catch (restartError) {
          console.error('[Kompreser] Worker recovery failed:', restartError);
        }
      }
      return { recovered: false };
    });

    // Compression recovery strategy
    this.recoveryStrategies.set('COMPRESSION_ERROR', async (error, context) => {
      if (this.options.enableRecovery) {
        console.warn('[Kompreser] Attempting compression recovery...');
        
        // Try fallback compression algorithm
        const fallbackAlgorithms = {
          'webp': 'jpeg',
          'avif': 'webp',
          'jpeg': 'png',
          'png': 'jpeg'
        };
        
        const fallbackAlgorithm = fallbackAlgorithms[error.algorithm];
        if (fallbackAlgorithm && context.compressionEngine) {
          try {
            const result = await context.compressionEngine.compressWithAlgorithm(
              context.imageData, 
              fallbackAlgorithm, 
              context.options
            );
            return { 
              recovered: true, 
              strategy: 'fallback_algorithm',
              fallbackAlgorithm 
            };
          } catch (fallbackError) {
            console.error('[Kompreser] Fallback compression failed:', fallbackError);
          }
        }
      }
      return { recovered: false };
    });
  }

  async handleError(error, context = {}) {
    // Log error based on severity and log level
    this.logError(error);
    
    // Track error frequency
    this.trackError(error);
    
    // Attempt recovery if enabled
    if (this.options.enableRecovery) {
      const recovery = await this.attemptRecovery(error, context);
      if (recovery.recovered) {
        console.log(`[Kompreser] Recovered from ${error.code} using ${recovery.strategy}`);
        return { error, recovered: true, recovery };
      }
    }
    
    // Check if we should retry the operation
    const shouldRetry = await this.shouldRetry(error);
    if (shouldRetry.shouldRetry) {
      console.log(`[Kompreser] Retrying operation (attempt ${shouldRetry.attempt})`);
      return { error, shouldRetry: true, attempt: shouldRetry.attempt };
    }
    
    // Error could not be recovered or retried
    return { error, recovered: false, shouldRetry: false };
  }

  logError(error) {
    const logLevel = this.getLogLevel(error.severity);
    const currentLogLevel = this.getLogLevel(this.options.logLevel);
    
    if (logLevel >= currentLogLevel) {
      const logMessage = this.formatErrorMessage(error);
      
      switch (error.severity) {
        case 'HIGH':
          console.error(logMessage);
          break;
        case 'MEDIUM':
          console.warn(logMessage);
          break;
        case 'LOW':
          console.info(logMessage);
          break;
        default:
          console.log(logMessage);
      }
      
      if (this.options.enableDetailedLogging && error.stack) {
        console.debug('[Kompreser] Stack trace:', error.stack);
      }
    }
  }

  formatErrorMessage(error) {
    const baseMessage = `[Kompreser] ${error.name}: ${error.message}`;
    
    if (this.options.enableDetailedLogging) {
      const details = Object.entries(error.details)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
      
      return details ? `${baseMessage} [${details}]` : baseMessage;
    }
    
    return baseMessage;
  }

  getLogLevel(severity) {
    const levels = { 'DEBUG': 0, 'INFO': 1, 'WARN': 2, 'ERROR': 3, 'FATAL': 4 };
    return levels[severity] || 1;
  }

  trackError(error) {
    const key = error.code;
    const count = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, count + 1);
    
    // Log warning if error frequency is high
    if (count > 10) {
      console.warn(`[Kompreser] High frequency of ${error.code} errors detected (${count} occurrences)`);
    }
  }

  async attemptRecovery(error, context) {
    const recoveryStrategy = this.recoveryStrategies.get(error.code);
    if (recoveryStrategy) {
      try {
        return await recoveryStrategy(error, context);
      } catch (recoveryError) {
        console.error('[Kompreser] Recovery strategy failed:', recoveryError);
      }
    }
    return { recovered: false };
  }

  async shouldRetry(error) {
    const errorCount = this.errorCounts.get(error.code) || 0;
    const maxRetries = this.options.maxRetries;
    
    if (errorCount <= maxRetries && this.isRetryableError(error)) {
      // Exponential backoff
      const delay = this.options.retryDelay * Math.pow(2, errorCount - 1);
      await this.sleep(delay);
      
      return { shouldRetry: true, attempt: errorCount };
    }
    
    return { shouldRetry: false };
  }

  isRetryableError(error) {
    const retryableErrors = ['WORKER_ERROR', 'TIMEOUT_ERROR', 'COMPRESSION_ERROR'];
    return retryableErrors.includes(error.code);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getErrorStats() {
    return {
      totalErrors: Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0),
      errorBreakdown: Object.fromEntries(this.errorCounts),
      timestamp: new Date().toISOString()
    };
  }

  clearErrorStats() {
    this.errorCounts.clear();
  }
}

// Export error classes and handler
export {
  KompreserError,
  ValidationError,
  FormatError,
  CompressionError,
  MemoryError,
  WorkerError,
  TimeoutError,
  UnsupportedError,
  MetadataError,
  PerformanceError,
  ErrorHandler
};