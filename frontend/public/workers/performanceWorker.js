// =============================================================================
// PERFORMANCE MONITORING WEB WORKER
// =============================================================================
// Handles performance metric aggregation and analysis in background thread
// to prevent UI blocking during intensive performance calculations

class PerformanceWorker {
  constructor() {
    this.metrics = new Map();
    this.aggregationWindow = 5000; // 5 second window
    this.alertThresholds = {
      updateLatency: 50, // ms
      memoryGrowth: 5 * 1024 * 1024, // 5MB
      frameDrops: 5, // consecutive frames
      connectionFailures: 3
    };
    
    this.isRunning = false;
    this.startTime = performance.now();
  }

  // Aggregate performance metrics
  aggregateMetrics(rawMetrics) {
    const timestamp = performance.now();
    const windowStart = timestamp - this.aggregationWindow;
    
    // Store raw metrics with timestamp
    rawMetrics.forEach(metric => {
      if (!this.metrics.has(metric.type)) {
        this.metrics.set(metric.type, []);
      }
      
      const typeMetrics = this.metrics.get(metric.type);
      typeMetrics.push({ ...metric, timestamp });
      
      // Remove old metrics outside window
      const filtered = typeMetrics.filter(m => m.timestamp >= windowStart);
      this.metrics.set(metric.type, filtered);
    });

    return this.calculateAggregatedStats(timestamp);
  }

  calculateAggregatedStats(timestamp) {
    const stats = {
      timestamp,
      updateLatency: this.calculateLatencyStats(),
      memoryUsage: this.calculateMemoryStats(),
      framePerformance: this.calculateFrameStats(),
      connectionHealth: this.calculateConnectionStats(),
      alerts: []
    };

    // Check for alert conditions
    stats.alerts = this.checkAlertConditions(stats);
    
    return stats;
  }

  calculateLatencyStats() {
    const latencyMetrics = this.metrics.get('updateLatency') || [];
    if (latencyMetrics.length === 0) return { avg: 0, max: 0, min: 0 };

    const latencies = latencyMetrics.map(m => m.value);
    return {
      avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      max: Math.max(...latencies),
      min: Math.min(...latencies),
      count: latencies.length
    };
  }

  calculateMemoryStats() {
    const memoryMetrics = this.metrics.get('memoryUsage') || [];
    if (memoryMetrics.length === 0) return { current: 0, growth: 0, peak: 0 };

    const memories = memoryMetrics.map(m => m.value);
    const current = memories[memories.length - 1] || 0;
    const initial = memories[0] || 0;
    
    return {
      current,
      growth: current - initial,
      peak: Math.max(...memories),
      trend: memories.length > 1 ? (current - memories[memories.length - 2]) : 0
    };
  }

  calculateFrameStats() {
    const frameMetrics = this.metrics.get('framePerformance') || [];
    if (frameMetrics.length === 0) return { fps: 60, drops: 0, smoothness: 1 };

    const frames = frameMetrics.map(m => m.value);
    const avgFps = frames.reduce((a, b) => a + b, 0) / frames.length;
    const drops = frames.filter(fps => fps < 50).length;
    
    return {
      fps: avgFps,
      drops,
      smoothness: Math.max(0, (60 - drops) / 60),
      target: 60
    };
  }

  calculateConnectionStats() {
    const connectionMetrics = this.metrics.get('connectionHealth') || [];
    if (connectionMetrics.length === 0) return { uptime: 1, failures: 0, stability: 1 };

    const connections = connectionMetrics.map(m => m.value);
    const failures = connections.filter(status => status === 'failed').length;
    const uptime = (connections.length - failures) / connections.length;
    
    return {
      uptime,
      failures,
      stability: Math.max(0, 1 - (failures / connections.length)),
      total: connections.length
    };
  }

  checkAlertConditions(stats) {
    const alerts = [];

    if (stats.updateLatency.avg > this.alertThresholds.updateLatency) {
      alerts.push({
        type: 'performance',
        severity: 'warning',
        message: `High update latency: ${stats.updateLatency.avg.toFixed(1)}ms`,
        threshold: this.alertThresholds.updateLatency,
        actual: stats.updateLatency.avg
      });
    }

    if (stats.memoryUsage.growth > this.alertThresholds.memoryGrowth) {
      alerts.push({
        type: 'memory',
        severity: 'critical',
        message: `Memory growth detected: ${(stats.memoryUsage.growth / 1024 / 1024).toFixed(1)}MB`,
        threshold: this.alertThresholds.memoryGrowth,
        actual: stats.memoryUsage.growth
      });
    }

    if (stats.framePerformance.drops >= this.alertThresholds.frameDrops) {
      alerts.push({
        type: 'animation',
        severity: 'warning',
        message: `Frame drops detected: ${stats.framePerformance.drops} drops`,
        threshold: this.alertThresholds.frameDrops,
        actual: stats.framePerformance.drops
      });
    }

    if (stats.connectionHealth.failures >= this.alertThresholds.connectionFailures) {
      alerts.push({
        type: 'connection',
        severity: 'error',
        message: `Connection instability: ${stats.connectionHealth.failures} failures`,
        threshold: this.alertThresholds.connectionFailures,
        actual: stats.connectionHealth.failures
      });
    }

    return alerts;
  }

  updateThresholds(newThresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
  }

  reset() {
    this.metrics.clear();
    this.startTime = performance.now();
  }
}

// Initialize worker instance
const performanceWorker = new PerformanceWorker();

// Handle messages from main thread
self.onmessage = function(event) {
  const { type, data } = event.data;

  switch (type) {
    case 'aggregate':
      const stats = performanceWorker.aggregateMetrics(data.metrics);
      self.postMessage({ type: 'stats', data: stats });
      break;

    case 'updateThresholds':
      performanceWorker.updateThresholds(data.thresholds);
      self.postMessage({ type: 'thresholdsUpdated', data: { success: true } });
      break;

    case 'reset':
      performanceWorker.reset();
      self.postMessage({ type: 'reset', data: { success: true } });
      break;

    case 'getStatus':
      self.postMessage({ 
        type: 'status', 
        data: { 
          isRunning: performanceWorker.isRunning,
          metricsCount: Array.from(performanceWorker.metrics.values())
            .reduce((total, arr) => total + arr.length, 0),
          uptime: performance.now() - performanceWorker.startTime
        }
      });
      break;

    default:
      console.warn('Unknown message type:', type);
  }
};

// Handle worker errors
self.onerror = function(error) {
  self.postMessage({ 
    type: 'error', 
    data: { 
      message: error.message,
      filename: error.filename,
      lineno: error.lineno 
    }
  });
};

// Notify main thread that worker is ready
self.postMessage({ type: 'ready', data: { success: true } });
