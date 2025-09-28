// =============================================================================
// ADAPTIVE THROTTLER CLASS
// =============================================================================
// Intelligent throttling based on user attention, performance feedback, and component priority

import { attentionTracker, AttentionState } from './AttentionTracker';
import { performanceMonitor } from '../monitoring/PerformanceMonitor';

export interface ThrottleConfig {
  id: string;
  component: string;
  baseInterval: number; // Base throttling interval in ms
  priority: 'critical' | 'high' | 'medium' | 'low';
  burstsAllowed?: number; // Number of unthrottled updates allowed in burst
  maxInterval?: number; // Maximum throttling interval
  adaptToPerformance?: boolean; // Adapt based on performance metrics
}

export interface ThrottleContext {
  id: string;
  lastExecution: number;
  executionCount: number;
  currentInterval: number;
  burstRemaining: number;
  performanceFactor: number;
  attentionFactor: number;
  isThrottled: boolean;
  queuedCallback: (() => void) | null;
  timeoutId: number | null;
}

class AdaptiveThrottler {
  private contexts = new Map<string, ThrottleContext>();
  private globalPerformanceFactor = 1.0;
  private attentionState: AttentionState;
  
  // Configuration
  private performanceUpdateInterval = 5000; // Update performance factor every 5s
  private burstWindow = 10000; // 10 second burst window
  private minInterval = 16; // Minimum 16ms (60fps)
  private maxGlobalInterval = 30000; // Maximum 30 seconds
  
  // Priority multipliers
  private priorityMultipliers = {
    critical: 0.5,  // Critical updates get preferential treatment
    high: 0.8,      // High priority updates
    medium: 1.0,    // Normal throttling
    low: 2.0        // Low priority gets more throttling
  };

  constructor() {
    this.attentionState = attentionTracker.getState();
    this.initializeAttentionTracking();
    this.initializePerformanceTracking();
  }

  /**
   * Initialize attention state tracking
   */
  private initializeAttentionTracking() {
    attentionTracker.onStateChange((state: AttentionState) => {
      this.attentionState = state;
      this.updateAllThrottleFactors();
    });
  }

  /**
   * Initialize performance tracking
   */
  private initializePerformanceTracking() {
    performanceMonitor.onStats((stats) => {
      this.updatePerformanceFactor(stats);
    });

    // Update performance factor periodically
    setInterval(() => {
      this.updateGlobalPerformanceFactor();
    }, this.performanceUpdateInterval);
  }

  /**
   * Create a throttled function
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    config: ThrottleConfig
  ): T {
    // Initialize context for this throttle instance
    this.initializeContext(config);

    return ((...args: any[]) => {
      const context = this.contexts.get(config.id)!;
      const now = Date.now();
      
      // Calculate current throttling interval
      const currentInterval = this.calculateCurrentInterval(config, context);
      context.currentInterval = currentInterval;

      // Check if we can execute immediately
      if (this.canExecuteImmediately(context, now, config)) {
        this.executeFunction(func, args, context, config);
        return;
      }

      // Queue the function if throttled
      this.queueFunction(func, args, context, config, currentInterval);
    }) as T;
  }

  /**
   * Initialize throttling context
   */
  private initializeContext(config: ThrottleConfig) {
    if (!this.contexts.has(config.id)) {
      const context: ThrottleContext = {
        id: config.id,
        lastExecution: 0,
        executionCount: 0,
        currentInterval: config.baseInterval,
        burstRemaining: config.burstsAllowed || 0,
        performanceFactor: 1.0,
        attentionFactor: 1.0,
        isThrottled: false,
        queuedCallback: null,
        timeoutId: null
      };

      this.contexts.set(config.id, context);
    }
  }

  /**
   * Calculate current throttling interval based on all factors
   */
  private calculateCurrentInterval(config: ThrottleConfig, context: ThrottleContext): number {
    const baseInterval = config.baseInterval;
    
    // Apply attention-based multiplier
    const attentionMultiplier = attentionTracker.getThrottlingMultiplier();
    
    // Apply performance-based multiplier
    const performanceMultiplier = config.adaptToPerformance ? 
      this.globalPerformanceFactor : 1.0;
    
    // Apply priority multiplier
    const priorityMultiplier = this.priorityMultipliers[config.priority];
    
    // Calculate final interval
    let interval = baseInterval * 
      attentionMultiplier * 
      performanceMultiplier * 
      priorityMultiplier;

    // Apply bounds
    interval = Math.max(this.minInterval, interval);
    interval = Math.min(config.maxInterval || this.maxGlobalInterval, interval);

    // Update context factors for debugging
    context.attentionFactor = attentionMultiplier;
    context.performanceFactor = performanceMultiplier;

    return Math.round(interval);
  }

  /**
   * Check if function can execute immediately
   */
  private canExecuteImmediately(
    context: ThrottleContext, 
    now: number, 
    config: ThrottleConfig
  ): boolean {
    // If never executed, allow immediately
    if (context.lastExecution === 0) {
      return true;
    }

    // Check if enough time has passed
    const timeSinceLastExecution = now - context.lastExecution;
    if (timeSinceLastExecution >= context.currentInterval) {
      return true;
    }

    // Check if we have burst capacity
    if (context.burstRemaining > 0) {
      // Reset burst if outside burst window
      if (timeSinceLastExecution > this.burstWindow) {
        context.burstRemaining = config.burstsAllowed || 0;
      }
      
      return context.burstRemaining > 0;
    }

    // Critical priority can sometimes bypass throttling
    if (config.priority === 'critical' && this.attentionState.attentionLevel === 'high') {
      return timeSinceLastExecution >= this.minInterval;
    }

    return false;
  }

  /**
   * Execute function immediately
   */
  private executeFunction<T extends (...args: any[]) => any>(
    func: T,
    args: any[],
    context: ThrottleContext,
    config: ThrottleConfig
  ) {
    const now = Date.now();

    // Cancel any queued execution
    if (context.timeoutId) {
      clearTimeout(context.timeoutId);
      context.timeoutId = null;
    }

    // Update context
    context.lastExecution = now;
    context.executionCount++;
    context.isThrottled = false;
    context.queuedCallback = null;

    // Use burst if available
    if (context.burstRemaining > 0) {
      context.burstRemaining--;
    }

    // Track performance
    performanceMonitor.trackUpdateStart(config.component);
    
    try {
      // Execute function
      const result = func(...args);
      
      // Track completion
      performanceMonitor.trackUpdateEnd(config.component);
      
      return result;
    } catch (error) {
      performanceMonitor.trackUpdateEnd(config.component);
      throw error;
    }
  }

  /**
   * Queue function for delayed execution
   */
  private queueFunction<T extends (...args: any[]) => any>(
    func: T,
    args: any[],
    context: ThrottleContext,
    config: ThrottleConfig,
    interval: number
  ) {
    const now = Date.now();
    const delay = Math.max(0, interval - (now - context.lastExecution));

    context.isThrottled = true;
    context.queuedCallback = () => func(...args);

    // Cancel previous timeout if exists
    if (context.timeoutId) {
      clearTimeout(context.timeoutId);
    }

    // Schedule execution
    context.timeoutId = window.setTimeout(() => {
      if (context.queuedCallback) {
        this.executeFunction(context.queuedCallback, [], context, config);
      }
    }, delay);
  }

  /**
   * Update performance factor based on performance stats
   */
  private updatePerformanceFactor(stats: any) {
    let factor = 1.0;

    // Adjust based on frame performance
    if (stats.framePerformance?.fps < 30) {
      factor *= 2.0; // Heavy throttling for poor performance
    } else if (stats.framePerformance?.fps < 45) {
      factor *= 1.5; // Moderate throttling
    }

    // Adjust based on update latency
    if (stats.updateLatency?.avg > 100) {
      factor *= 1.8; // Throttle more for high latency
    } else if (stats.updateLatency?.avg > 50) {
      factor *= 1.3;
    }

    // Adjust based on memory growth
    if (stats.memoryUsage?.growth > 10 * 1024 * 1024) { // 10MB
      factor *= 1.6; // Throttle for high memory usage
    }

    this.globalPerformanceFactor = Math.min(10.0, factor);
  }

  /**
   * Update global performance factor
   */
  private updateGlobalPerformanceFactor() {
    // Gradually return to normal if no recent performance data
    this.globalPerformanceFactor = Math.max(1.0, this.globalPerformanceFactor * 0.95);
  }

  /**
   * Update throttle factors for all active contexts
   */
  private updateAllThrottleFactors() {
    this.contexts.forEach(context => {
      // Recalculate intervals based on new attention state
      // This will take effect on the next execution
      const config = this.getConfigForContext(context.id);
      if (config) {
        context.currentInterval = this.calculateCurrentInterval(config, context);
      }
    });
  }

  /**
   * Get config for context (helper method - in real implementation, 
   * configs would be stored with contexts)
   */
  private getConfigForContext(contextId: string): ThrottleConfig | null {
    // In a real implementation, you'd store configs with contexts
    // For now, return a default config
    return {
      id: contextId,
      component: contextId,
      baseInterval: 1000,
      priority: 'medium'
    };
  }

  /**
   * Get throttling status for a specific function
   */
  getStatus(id: string) {
    const context = this.contexts.get(id);
    if (!context) return null;

    return {
      id: context.id,
      isThrottled: context.isThrottled,
      currentInterval: context.currentInterval,
      lastExecution: context.lastExecution,
      executionCount: context.executionCount,
      burstRemaining: context.burstRemaining,
      attentionLevel: this.attentionState.attentionLevel,
      performanceFactor: context.performanceFactor,
      attentionFactor: context.attentionFactor
    };
  }

  /**
   * Get status for all throttled functions
   */
  getAllStatus() {
    const statuses = new Map();
    this.contexts.forEach((context, id) => {
      statuses.set(id, this.getStatus(id));
    });
    return statuses;
  }

  /**
   * Cancel throttled execution
   */
  cancel(id: string) {
    const context = this.contexts.get(id);
    if (context && context.timeoutId) {
      clearTimeout(context.timeoutId);
      context.timeoutId = null;
      context.queuedCallback = null;
      context.isThrottled = false;
    }
  }

  /**
   * Clear all throttling contexts
   */
  clear() {
    this.contexts.forEach((context) => {
      if (context.timeoutId) {
        clearTimeout(context.timeoutId);
      }
    });
    this.contexts.clear();
  }

  /**
   * Flush all queued executions immediately
   */
  flush() {
    this.contexts.forEach((context) => {
      if (context.queuedCallback) {
        // Cancel timeout and execute immediately
        if (context.timeoutId) {
          clearTimeout(context.timeoutId);
          context.timeoutId = null;
        }
        
        const callback = context.queuedCallback;
        context.queuedCallback = null;
        context.isThrottled = false;
        context.lastExecution = Date.now();
        
        callback();
      }
    });
  }

  /**
   * Get global performance metrics
   */
  getGlobalMetrics() {
    return {
      globalPerformanceFactor: this.globalPerformanceFactor,
      attentionState: this.attentionState,
      activeContexts: this.contexts.size,
      throttledContexts: Array.from(this.contexts.values())
        .filter(c => c.isThrottled).length
    };
  }
}

// Singleton instance
export const adaptiveThrottler = new AdaptiveThrottler();

// Convenience function for creating throttled functions
export const createThrottledFunction = <T extends (...args: any[]) => any>(
  func: T,
  config: ThrottleConfig
): T => {
  return adaptiveThrottler.throttle(func, config);
};

// React hook for adaptive throttling
export const useAdaptiveThrottle = <T extends (...args: any[]) => any>(
  func: T,
  config: ThrottleConfig
): T => {
  return adaptiveThrottler.throttle(func, config);
};
