/**
 * @xbibzlibrary/kompreser - Main Entry Point
 * Export all library components and utilities
 */

// Core library
import Kompreser from './core/Kompreser.js';

// Error handling
import { 
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
} from './core/ErrorHandler.js';

// Utilities
import Logger from './utils/Logger.js';

// Re-export everything for different module systems
export {
  // Main class
  Kompreser,
  
  // Error classes
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
  ErrorHandler,
  
  // Utilities
  Logger
};

// Default export for convenience
export default Kompreser;

// Browser global export
if (typeof window !== 'undefined') {
  window.Kompreser = Kompreser;
  window.KompreserErrors = {
    KompreserError,
    ValidationError,
    FormatError,
    CompressionError,
    MemoryError,
    WorkerError,
    TimeoutError,
    UnsupportedError,
    MetadataError,
    PerformanceError
  };
  window.KompreserUtils = { Logger };
}