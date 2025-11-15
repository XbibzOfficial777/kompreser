/**
 * @xbibzlibrary/kompreser - Advanced Logging System
 * Comprehensive logging with multiple levels, formatting, and performance tracking
 */

class Logger {
  constructor(options = {}) {
    this.options = {
      level: 'INFO',
      enableColors: true,
      enableTimestamp: true,
      enablePerformanceTracking: true,
      maxLogSize: 1000,
      enableConsoleOutput: true,
      enableMemoryLogging: false,
      ...options
    };
    
    this.logs = [];
    this.performanceMetrics = new Map();
    this.memoryUsage = [];
    
    if (this.options.enableMemoryLogging) {
      this.startMemoryTracking();
    }
  }

  // Log levels
  static LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    FATAL: 4
  };

  // Color codes for console output
  static COLORS = {
    DEBUG: '\x1b[36m',    // Cyan
    INFO: '\x1b[32m',     // Green
    WARN: '\x1b[33m',     // Yellow
    ERROR: '\x1b[31m',    // Red
    FATAL: '\x1b[35m',    // Magenta
    RESET: '\x1b[0m',     // Reset
    BOLD: '\x1b[1m',      // Bold
    DIM: '\x1b[2m'        // Dim
  };

  debug(message, context = {}) {
    this.log('DEBUG', message, context);
  }

  info(message, context = {}) {
    this.log('INFO', message, context);
  }

  warn(message, context = {}) {
    this.log('WARN', message, context);
  }

  error(message, context = {}) {
    this.log('ERROR', message, context);
  }

  fatal(message, context = {}) {
    this.log('FATAL', message, context);
  }

  log(level, message, context = {}) {
    const logLevel = Logger.LEVELS[level];
    const currentLevel = Logger.LEVELS[this.options.level];
    
    if (logLevel < currentLevel) {
      return;
    }

    const logEntry = this.createLogEntry(level, message, context);
    this.logs.push(logEntry);
    
    // Maintain log size limit
    if (this.logs.length > this.options.maxLogSize) {
      this.logs.shift();
    }

    // Output to console if enabled
    if (this.options.enableConsoleOutput) {
      this.outputToConsole(logEntry);
    }

    // Track performance metrics
    if (this.options.enablePerformanceTracking && context.performance) {
      this.trackPerformance(context.performance);
    }
  }

  createLogEntry(level, message, context) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...context },
      sessionId: this.getSessionId(),
      version: '1.0.0'
    };

    // Add memory usage if tracking is enabled
    if (this.options.enableMemoryLogging) {
      entry.memoryUsage = this.getMemoryUsage();
    }

    // Add performance metrics if available
    if (context.duration) {
      entry.duration = context.duration;
    }

    return entry;
  }

  outputToConsole(entry) {
    const prefix = this.formatLogPrefix(entry);
    const formattedMessage = this.formatLogMessage(entry);
    
    switch (entry.level) {
      case 'DEBUG':
        console.debug(prefix, formattedMessage);
        break;
      case 'INFO':
        console.info(prefix, formattedMessage);
        break;
      case 'WARN':
        console.warn(prefix, formattedMessage);
        break;
      case 'ERROR':
        console.error(prefix, formattedMessage);
        break;
      case 'FATAL':
        console.error(prefix, formattedMessage);
        break;
      default:
        console.log(prefix, formattedMessage);
    }
  }

  formatLogPrefix(entry) {
    let prefix = '';
    
    if (this.options.enableColors) {
      prefix += Logger.COLORS[entry.level];
    }
    
    prefix += '[Kompreser]';
    
    if (this.options.enableTimestamp) {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      prefix += ` ${time}`;
    }
    
    prefix += ` ${entry.level}:`;
    
    if (this.options.enableColors) {
      prefix += Logger.COLORS.RESET;
    }
    
    return prefix;
  }

  formatLogMessage(entry) {
    let message = entry.message;
    
    if (Object.keys(entry.context).length > 0) {
      const contextStr = this.formatContext(entry.context);
      message += ` ${contextStr}`;
    }
    
    if (entry.duration) {
      message += ` [${entry.duration}ms]`;
    }
    
    if (entry.memoryUsage) {
      message += ` [Memory: ${this.formatMemory(entry.memoryUsage)}]`;
    }
    
    return message;
  }

  formatContext(context) {
    const parts = [];
    
    for (const [key, value] of Object.entries(context)) {
      if (key === 'performance' || key === 'duration') continue;
      
      let formattedValue;
      if (typeof value === 'object') {
        formattedValue = JSON.stringify(value);
      } else if (typeof value === 'string') {
        formattedValue = `"${value}"`;
      } else {
        formattedValue = String(value);
      }
      
      parts.push(`${key}=${formattedValue}`);
    }
    
    return parts.length > 0 ? `{${parts.join(', ')}}` : '';
  }

  startTimer(operation) {
    const startTime = performance.now();
    return {
      end: () => {
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        this.trackPerformance({ operation, duration });
        return duration;
      }
    };
  }

  trackPerformance(performance) {
    const { operation, duration } = performance;
    
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        avgDuration: 0
      });
    }
    
    const metrics = this.performanceMetrics.get(operation);
    metrics.count++;
    metrics.totalDuration += duration;
    metrics.minDuration = Math.min(metrics.minDuration, duration);
    metrics.maxDuration = Math.max(metrics.maxDuration, duration);
    metrics.avgDuration = Math.round(metrics.totalDuration / metrics.count);
    
    this.performanceMetrics.set(operation, metrics);
    
    // Log slow operations
    if (duration > 1000) {
      this.warn(`Slow operation detected`, {
        operation,
        duration,
        threshold: 1000
      });
    }
  }

  startMemoryTracking() {
    setInterval(() => {
      if (performance.memory) {
        const memory = {
          timestamp: Date.now(),
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        };
        
        this.memoryUsage.push(memory);
        
        // Keep only last 100 entries
        if (this.memoryUsage.length > 100) {
          this.memoryUsage.shift();
        }
        
        // Alert on high memory usage
        if (memory.used > memory.limit * 0.9) {
          this.error('High memory usage detected', { memory });
        }
      }
    }, 5000);
  }

  getMemoryUsage() {
    if (performance.memory) {
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  formatMemory(memory) {
    const used = Math.round(memory.used / 1024 / 1024);
    const total = Math.round(memory.total / 1024 / 1024);
    return `${used}MB/${total}MB`;
  }

  getSessionId() {
    if (!this.sessionId) {
      this.sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
    }
    return this.sessionId;
  }

  // Group related logs
  group(title) {
    if (this.options.enableConsoleOutput) {
      console.group(`[Kompreser] ${title}`);
    }
    return {
      end: () => {
        if (this.options.enableConsoleOutput) {
          console.groupEnd();
        }
      }
    };
  }

  // Table output for structured data
  table(data, title) {
    if (this.options.enableConsoleOutput) {
      console.log(`[Kompreser] ${title}:`);
      console.table(data);
    }
    
    this.log('INFO', `Table data: ${title}`, { data });
  }

  // Performance report
  getPerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      operations: Object.fromEntries(this.performanceMetrics),
      summary: this.getPerformanceSummary()
    };
    
    if (this.options.enableMemoryLogging) {
      report.memoryUsage = this.memoryUsage;
    }
    
    return report;
  }

  getPerformanceSummary() {
    const operations = Array.from(this.performanceMetrics.values());
    const totalOperations = operations.reduce((sum, op) => sum + op.count, 0);
    const totalDuration = operations.reduce((sum, op) => sum + op.totalDuration, 0);
    
    return {
      totalOperations,
      totalDuration,
      averageDuration: totalOperations > 0 ? Math.round(totalDuration / totalOperations) : 0,
      slowestOperation: this.getSlowestOperation(),
      fastestOperation: this.getFastestOperation()
    };
  }

  getSlowestOperation() {
    let slowest = null;
    let maxDuration = 0;
    
    for (const [operation, metrics] of this.performanceMetrics) {
      if (metrics.maxDuration > maxDuration) {
        maxDuration = metrics.maxDuration;
        slowest = { operation, duration: maxDuration };
      }
    }
    
    return slowest;
  }

  getFastestOperation() {
    let fastest = null;
    let minDuration = Infinity;
    
    for (const [operation, metrics] of this.performanceMetrics) {
      if (metrics.minDuration < minDuration) {
        minDuration = metrics.minDuration;
        fastest = { operation, duration: minDuration };
      }
    }
    
    return fastest;
  }

  // Export logs for debugging
  exportLogs(options = {}) {
    const {
      level = null,
      since = null,
      until = null,
      format = 'json'
    } = options;
    
    let logs = this.logs;
    
    // Filter by level
    if (level) {
      logs = logs.filter(log => Logger.LEVELS[log.level] >= Logger.LEVELS[level]);
    }
    
    // Filter by time range
    if (since) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(since));
    }
    
    if (until) {
      logs = logs.filter(log => new Date(log.timestamp) <= new Date(until));
    }
    
    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    } else if (format === 'csv') {
      return this.exportToCSV(logs);
    }
    
    return logs;
  }

  exportToCSV(logs) {
    const headers = ['timestamp', 'level', 'message', 'context'];
    const rows = logs.map(log => [
      log.timestamp,
      log.level,
      `"${log.message}"`,
      `"${JSON.stringify(log.context)}"`
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  // Clear logs
  clear() {
    this.logs = [];
    this.performanceMetrics.clear();
    this.memoryUsage = [];
  }

  // Set log level
  setLevel(level) {
    this.options.level = level;
    this.info(`Log level changed to ${level}`);
  }
}

export default Logger;