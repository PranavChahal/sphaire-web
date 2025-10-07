// Performance monitoring and FPS tracking utilities
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  searchLatency: number;
  renderTime: number;
  memoryUsage: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    searchLatency: 0,
    renderTime: 0,
    memoryUsage: 0
  };

  private frameCount = 0;
  private lastFrameTime = 0;
  private fpsUpdateInterval = 1000; // Update FPS every second
  private lastFpsUpdate = 0;

  // Track frame rate
  trackFrame(currentTime: number = performance.now()): void {
    if (!IS_DEVELOPMENT) return;

    this.frameCount++;
    const deltaTime = currentTime - this.lastFrameTime;
    this.metrics.frameTime = deltaTime;
    this.lastFrameTime = currentTime;

    // Update FPS calculation
    if (currentTime - this.lastFpsUpdate >= this.fpsUpdateInterval) {
      this.metrics.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;
    }
  }

  // Track search performance
  async trackSearch<T>(searchFn: () => Promise<T>): Promise<T> {
    if (!IS_DEVELOPMENT) return await searchFn();

    const start = performance.now();
    try {
      const result = await searchFn();
      this.metrics.searchLatency = performance.now() - start;
      return result;
    } catch (error) {
      this.metrics.searchLatency = performance.now() - start;
      throw error;
    }
  }

  // Track render performance
  trackRender<T>(renderFn: () => T): T {
    if (!IS_DEVELOPMENT) return renderFn();

    const start = performance.now();
    try {
      const result = renderFn();
      this.metrics.renderTime = performance.now() - start;
      return result;
    } catch (error) {
      this.metrics.renderTime = performance.now() - start;
      throw error;
    }
  }

  // Get memory usage (if available)
  updateMemoryUsage(): void {
    if (!IS_DEVELOPMENT) return;

    if ((performance as any).memory) {
      this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    this.updateMemoryUsage();
    return { ...this.metrics };
  }

  // Log performance summary
  logSummary(): void {
    if (!IS_DEVELOPMENT) return;

    const metrics = this.getMetrics();
    console.group('Performance Metrics');
    console.log(`FPS: ${metrics.fps}`);
    console.log(`Frame Time: ${metrics.frameTime.toFixed(2)}ms`);
    console.log(`Search Latency: ${metrics.searchLatency.toFixed(2)}ms`);
    console.log(`Render Time: ${metrics.renderTime.toFixed(2)}ms`);
    console.log(`Memory Usage: ${metrics.memoryUsage.toFixed(2)}MB`);
    console.groupEnd();
  }

  // Check if performance is good
  isPerformanceGood(): boolean {
    const metrics = this.getMetrics();
    return (
      metrics.fps >= 45 && // Minimum acceptable FPS
      metrics.frameTime < 20 && // Max frame time for 50fps
      metrics.searchLatency < 500 && // Max search latency
      metrics.renderTime < 16 // Max render time for 60fps
    );
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Performance decorator for functions
export function withPerformanceTracking<T extends (...args: any[]) => any>(
  fn: T,
  label: string
): T {
  if (!IS_DEVELOPMENT) return fn;

  return ((...args: any[]) => {
    const start = performance.now();
    try {
      const result = fn(...args);
      const duration = performance.now() - start;
      if (duration > 10) { // Only log slow operations
        console.log(`${label}: ${duration.toFixed(2)}ms`);
      }
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.warn(`${label} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }) as T;
}

// React hook for performance monitoring
export function usePerformanceMonitor() {
  if (!IS_DEVELOPMENT) {
    return {
      trackFrame: () => {},
      trackSearch: async <T>(fn: () => Promise<T>) => await fn(),
      trackRender: <T>(fn: () => T) => fn(),
      getMetrics: () => ({} as PerformanceMetrics),
      logSummary: () => {},
      isPerformanceGood: () => true
    };
  }

  return {
    trackFrame: performanceMonitor.trackFrame.bind(performanceMonitor),
    trackSearch: performanceMonitor.trackSearch.bind(performanceMonitor),
    trackRender: performanceMonitor.trackRender.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    logSummary: performanceMonitor.logSummary.bind(performanceMonitor),
    isPerformanceGood: performanceMonitor.isPerformanceGood.bind(performanceMonitor)
  };
}

export default performanceMonitor;
