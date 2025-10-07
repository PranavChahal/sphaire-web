// Performance-optimized logger that can be disabled in production
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
const ENABLE_VERBOSE_LOGGING = false; // Set to false for maximum performance

export const logger = {
  // Critical errors only - always show
  error: (...args: any[]) => {
    console.error(...args);
  },

  // Warnings - only in development
  warn: (...args: any[]) => {
    if (IS_DEVELOPMENT) {
      console.warn(...args);
    }
  },

  // Info logs - only when verbose logging enabled
  info: (...args: any[]) => {
    if (IS_DEVELOPMENT && ENABLE_VERBOSE_LOGGING) {
      console.log(...args);
    }
  },

  // Debug logs - only when verbose logging enabled
  debug: (...args: any[]) => {
    if (IS_DEVELOPMENT && ENABLE_VERBOSE_LOGGING) {
      console.log(...args);
    }
  },

  // Performance-critical: no-op in production
  perf: (...args: any[]) => {
    if (IS_DEVELOPMENT && ENABLE_VERBOSE_LOGGING) {
      console.log('', ...args);
    }
  }
};

export default logger;
