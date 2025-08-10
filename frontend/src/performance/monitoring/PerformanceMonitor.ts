// =============================================================================
// PERFORMANCE MONITOR CLASS
// =============================================================================
// Main class for performance monitoring with RAF-based sampling and web worker integration

import { toast } from 'react-hot-toast';

export interface PerformanceMetric {
  type: 'updateLatency' | 'memoryUsage' | 'framePerformance' | 'connectionHealth';
  value: number | string;
  component?: string;
  timestamp: number;
}

export interface PerformanceStats {
  timestamp: number;
  updateLatency: {
    avg: number;
    max: number;
    min: number;
    count: number;
  };
  memoryUsage: {
    current: number;
    growth: number;
    peak: number;
    trend: number;
  };
  framePerformance: {
    fps: number;
    drops: number;
    smoothness: number;
    target: number;
  };
  connectionHealth: {
    uptime: number;
    failures: number;
    stability: number;
    total: number;
  };
  alerts: Array<{
    type: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    threshold: number;
    actual: number;
  }>;
}

export interface AlertThresholds {
  updateLatency?: number;
  memoryGrowth?: number;
  frameDrops?: number;
  connectionFailures?: number;
}

class PerformanceMonitor {
  private worker: Worker | null = null;
  private isRunning = false;
  private rafId: number | null = null;
  private lastFrameTime = 0;
  private frameCount = 0;
  private metricsBuffer: PerformanceMetric[] = [];
  
  // Performance tracking
  private memoryBaseline = 0;
  private updateStartTimes = new Map<string, number>();
  
  // Callbacks
  private onStatsUpdate: ((stats: PerformanceStats) => void) | null = null;
  private onAlert: ((alert: PerformanceStats['alerts'][0]) => void) | null = null;
  
  // Configuration
  private samplingInterval = 16; // ~60fps
  private aggregationInterval = 1000; // 1 second
  private bufferFlushThreshold = 50;

  constructor() {
    this.initializeWorker();
    this.initializeMemoryBaseline();
  }

  private async initializeWorker() {
    try {
      this.worker = new Worker('/workers/performanceWorker.js');
      
      this.worker.onmessage = (event) => {
        const { type, data } = event.data;
        this.handleWorkerMessage(type, data);
      };

      this.worker.onerror = (error) => {
        console.error('Performance worker error:', error);
        toast.error('Performance monitoring worker failed');
      };

    } catch (error) {
      console.error('Failed to initialize performance worker:', error);
      toast.error('Performance monitoring unavailable');
    }
  }

  private handleWorkerMessage(type: string, data: any) {
    switch (type) {
      case 'ready':
        console.log('Performance worker ready');
        break;
        
      case 'stats':
        if (this.onStatsUpdate) {
          this.onStatsUpdate(data as PerformanceStats);
        }
        
        // Handle alerts
        if (data.alerts && data.alerts.length > 0) {
          data.alerts.forEach((alert: PerformanceStats['alerts'][0]) => {
            this.handleAlert(alert);
          });
        }
        break;
        
      case 'error':
        console.error('Worker error:', data);
        break;
        
      default:
        console.warn('Unknown worker message type:', type);
    }
  }

  private handleAlert(alert: PerformanceStats['alerts'][0]) {
    // Notify callback if set
    if (this.onAlert) {
      this.onAlert(alert);
    }

    // Show toast notification based on severity
    const message = alert.message;
    switch (alert.severity) {
      case 'critical':
        toast.error(message, { duration: 8000, icon: '🚨' });
        break;
      case 'error':
        toast.error(message, { duration: 6000, icon: '❌' });
        break;
      case 'warning':
        toast(message, { duration: 4000, icon: '⚠️' });
        break;
      case 'info':
        toast(message, { duration: 3000, icon: 'ℹ️' });
        break;
    }
  }

  private initializeMemoryBaseline() {
    if ('memory' in performance) {
      this.memoryBaseline = (performance as any).memory.usedJSHeapSize;
    }
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.scheduleFrame();
    
    // Start periodic aggregation
    setInterval(() => {
      this.flushMetricsBuffer();
    }, this.aggregationInterval);
  }

  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    // Flush remaining metrics
    this.flushMetricsBuffer();
  }

  private scheduleFrame() {
    if (!this.isRunning) return;
    
    this.rafId = requestAnimationFrame((timestamp) => {
      this.collectFrameMetrics(timestamp);
      this.scheduleFrame();
    });
  }

  private collectFrameMetrics(timestamp: number) {
    // Calculate frame rate
    const deltaTime = timestamp - this.lastFrameTime;
    const fps = deltaTime > 0 ? 1000 / deltaTime : 60;
    
    this.addMetric({
      type: 'framePerformance',
      value: fps,
      timestamp
    });
    
    // Collect memory metrics periodically
    if (this.frameCount % 60 === 0) { // Every ~1 second at 60fps
      this.collectMemoryMetrics(timestamp);
    }
    
    this.lastFrameTime = timestamp;
    this.frameCount++;
    
    // Flush buffer if it gets too large
    if (this.metricsBuffer.length >= this.bufferFlushThreshold) {
      this.flushMetricsBuffer();
    }
  }

  private collectMemoryMetrics(timestamp: number) {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.addMetric({
        type: 'memoryUsage',
        value: memory.usedJSHeapSize,
        timestamp
      });
    }
  }

  // Public methods for external metric collection
  trackUpdateStart(componentId: string) {
    const startTime = performance.now();
    this.updateStartTimes.set(componentId, startTime);
  }

  trackUpdateEnd(componentId: string) {
    const startTime = this.updateStartTimes.get(componentId);
    if (!startTime) return;
    
    const endTime = performance.now();
    const latency = endTime - startTime;
    
    this.addMetric({
      type: 'updateLatency',
      value: latency,
      component: componentId,
      timestamp: endTime
    });
    
    this.updateStartTimes.delete(componentId);
  }

  trackConnectionEvent(status: 'connected' | 'connecting' | 'disconnected' | 'failed') {
    this.addMetric({
      type: 'connectionHealth',
      value: status,
      timestamp: performance.now()
    });
  }

  private addMetric(metric: PerformanceMetric) {
    this.metricsBuffer.push(metric);
  }

  private flushMetricsBuffer() {
    if (this.metricsBuffer.length === 0 || !this.worker) return;
    
    const metrics = [...this.metricsBuffer];
    this.metricsBuffer.length = 0;
    
    this.worker.postMessage({
      type: 'aggregate',
      data: { metrics }
    });
  }

  // Configuration methods
  updateThresholds(thresholds: AlertThresholds) {
    if (!this.worker) return;
    
    this.worker.postMessage({
      type: 'updateThresholds',
      data: { thresholds }
    });
  }

  onStats(callback: (stats: PerformanceStats) => void) {
    this.onStatsUpdate = callback;
  }

  onAlerts(callback: (alert: PerformanceStats['alerts'][0]) => void) {
    this.onAlert = callback;
  }

  // Utility methods
  getStatus() {
    return {
      isRunning: this.isRunning,
      bufferSize: this.metricsBuffer.length,
      frameCount: this.frameCount
    };
  }

  reset() {
    this.metricsBuffer.length = 0;
    this.frameCount = 0;
    this.updateStartTimes.clear();
    this.initializeMemoryBaseline();
    
    if (this.worker) {
      this.worker.postMessage({ type: 'reset', data: {} });
    }
  }

  destroy() {
    this.stop();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}

// Singleton instance for global performance monitoring
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  return {
    trackUpdateStart: (componentId: string) => performanceMonitor.trackUpdateStart(componentId),
    trackUpdateEnd: (componentId: string) => performanceMonitor.trackUpdateEnd(componentId),
    trackConnection: (status: 'connected' | 'connecting' | 'disconnected' | 'failed') => 
      performanceMonitor.trackConnectionEvent(status)
  };
};
