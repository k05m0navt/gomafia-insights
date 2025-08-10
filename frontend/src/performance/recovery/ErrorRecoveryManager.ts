// =============================================================================
// ERROR RECOVERY MANAGER CLASS
// =============================================================================
// Adaptive error recovery with failure classification and smart retry strategies

import { toast } from 'react-hot-toast';

export interface ErrorContext {
  errorId: string;
  error: Error;
  component: string;
  operation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'data' | 'auth' | 'quota' | 'system' | 'unknown';
  timestamp: number;
  userAgent: string;
  url: string;
  metadata?: Record<string, any>;
}

export interface RecoveryStrategy {
  id: string;
  name: string;
  category: ErrorContext['category'][];
  severity: ErrorContext['severity'][];
  execute: (context: ErrorContext) => Promise<boolean>;
  cost: number; // Computational cost (1-10)
  successRate: number; // Historical success rate (0-1)
  retryable: boolean;
}

export interface RecoveryAttempt {
  id: string;
  errorId: string;
  strategy: RecoveryStrategy;
  startTime: number;
  endTime?: number;
  success: boolean;
  cost: number;
  message?: string;
}

export interface ErrorPattern {
  signature: string;
  count: number;
  lastSeen: number;
  recoverySuccess: number;
  totalAttempts: number;
  bestStrategy?: string;
}

class ErrorRecoveryManager {
  private strategies = new Map<string, RecoveryStrategy>();
  private errorHistory = new Map<string, ErrorContext[]>();
  private errorPatterns = new Map<string, ErrorPattern>();
  private activeRecoveries = new Map<string, RecoveryAttempt>();
  private circuitBreakers = new Map<string, { isOpen: boolean; lastFailure: number; failureCount: number }>();
  
  // Configuration
  private maxRetryAttempts = 3;
  private retryDelayBase = 1000; // 1 second
  private maxRetryDelay = 30000; // 30 seconds
  private circuitBreakerThreshold = 5; // Failures before opening circuit
  private circuitBreakerTimeout = 60000; // 1 minute
  private patternAnalysisWindow = 300000; // 5 minutes
  
  // Metrics
  private metrics = {
    totalErrors: 0,
    recoveredErrors: 0,
    failedRecoveries: 0,
    averageRecoveryTime: 0,
    strategySuccessRates: new Map<string, number>()
  };

  constructor() {
    this.initializeDefaultStrategies();
    this.startPeriodicCleanup();
  }

  /**
   * Initialize default recovery strategies
   */
  private initializeDefaultStrategies() {
    // Network error strategies
    this.registerStrategy({
      id: 'exponential_backoff_retry',
      name: 'Exponential Backoff Retry',
      category: ['network'],
      severity: ['low', 'medium'],
      cost: 3,
      successRate: 0.8,
      retryable: true,
      execute: async (context) => {
        const attempt = this.getRetryAttempt(context.errorId);
        const delay = Math.min(
          this.retryDelayBase * Math.pow(2, attempt),
          this.maxRetryDelay
        );
        
        await this.sleep(delay);
        return this.retryOriginalOperation(context);
      }
    });

    this.registerStrategy({
      id: 'connection_pool_fallback',
      name: 'Connection Pool Fallback',
      category: ['network'],
      severity: ['medium', 'high'],
      cost: 5,
      successRate: 0.7,
      retryable: true,
      execute: async (context) => {
        // Switch to backup connection or create new one
        if (context.metadata?.connectionPool) {
          return context.metadata.connectionPool.createFallbackConnection();
        }
        return false;
      }
    });

    // Authentication strategies
    this.registerStrategy({
      id: 'token_refresh',
      name: 'Token Refresh',
      category: ['auth'],
      severity: ['medium', 'high'],
      cost: 4,
      successRate: 0.9,
      retryable: true,
      execute: async (context) => {
        try {
          // Refresh authentication token
          const newToken = await this.refreshAuthToken();
          if (newToken) {
            // Update token in context and retry
            context.metadata = { ...context.metadata, authToken: newToken };
            return this.retryOriginalOperation(context);
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
        }
        return false;
      }
    });

    // Data error strategies
    this.registerStrategy({
      id: 'data_sanitization',
      name: 'Data Sanitization',
      category: ['data'],
      severity: ['low', 'medium'],
      cost: 2,
      successRate: 0.6,
      retryable: true,
      execute: async (context) => {
        if (context.metadata?.data) {
          const sanitizedData = this.sanitizeData(context.metadata.data);
          context.metadata.data = sanitizedData;
          return this.retryOriginalOperation(context);
        }
        return false;
      }
    });

    this.registerStrategy({
      id: 'fallback_cache',
      name: 'Fallback to Cache',
      category: ['network', 'data'],
      severity: ['low', 'medium', 'high'],
      cost: 1,
      successRate: 0.5,
      retryable: false,
      execute: async (context) => {
        // Try to get data from cache
        const cachedData = await this.getCachedData(context.operation);
        if (cachedData) {
          context.metadata = { ...context.metadata, fallbackData: cachedData };
          return true;
        }
        return false;
      }
    });

    // System error strategies
    this.registerStrategy({
      id: 'graceful_degradation',
      name: 'Graceful Degradation',
      category: ['system', 'quota'],
      severity: ['high', 'critical'],
      cost: 1,
      successRate: 0.9,
      retryable: false,
      execute: async (context) => {
        // Enable reduced functionality mode
        this.enableDegradedMode(context.component);
        toast('System running in reduced functionality mode', { 
          icon: '⚠️',
          duration: 5000 
        });
        return true;
      }
    });

    // Last resort strategy
    this.registerStrategy({
      id: 'user_notification',
      name: 'User Notification',
      category: ['network', 'data', 'auth', 'quota', 'system', 'unknown'],
      severity: ['critical'],
      cost: 1,
      successRate: 1.0,
      retryable: false,
      execute: async (context) => {
        this.notifyUser(context);
        return true; // Always succeeds as it's just notification
      }
    });
  }

  /**
   * Handle error with automatic recovery
   */
  async handleError(context: ErrorContext): Promise<boolean> {
    // Classify error
    this.classifyError(context);
    
    // Record error
    this.recordError(context);
    
    // Check circuit breaker
    if (this.isCircuitBreakerOpen(context.component)) {
      console.warn(`Circuit breaker open for ${context.component}, skipping recovery`);
      return false;
    }

    // Attempt recovery
    const recovered = await this.attemptRecovery(context);
    
    // Update circuit breaker
    this.updateCircuitBreaker(context.component, recovered);
    
    // Update metrics
    this.updateMetrics(context, recovered);
    
    return recovered;
  }

  /**
   * Classify error based on error message and context
   */
  private classifyError(context: ErrorContext) {
    const errorMessage = context.error.message.toLowerCase();
    
    // Network errors
    if (errorMessage.includes('network') || 
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('fetch')) {
      context.category = 'network';
    }
    // Authentication errors
    else if (errorMessage.includes('unauthorized') ||
             errorMessage.includes('forbidden') ||
             errorMessage.includes('auth') ||
             context.error.name === 'AuthError') {
      context.category = 'auth';
    }
    // Data errors
    else if (errorMessage.includes('parse') ||
             errorMessage.includes('invalid') ||
             errorMessage.includes('validation') ||
             errorMessage.includes('format')) {
      context.category = 'data';
    }
    // Quota errors
    else if (errorMessage.includes('quota') ||
             errorMessage.includes('rate limit') ||
             errorMessage.includes('too many')) {
      context.category = 'quota';
    }
    // System errors
    else if (errorMessage.includes('system') ||
             errorMessage.includes('internal') ||
             errorMessage.includes('server error')) {
      context.category = 'system';
    }
    else {
      context.category = 'unknown';
    }

    // Classify severity based on error type and component
    if (context.component === 'authentication' || 
        context.category === 'auth') {
      context.severity = 'critical';
    } else if (context.category === 'network' && 
               context.operation.includes('realtime')) {
      context.severity = 'high';
    } else if (context.category === 'data') {
      context.severity = 'medium';
    } else {
      context.severity = 'low';
    }
  }

  /**
   * Record error and analyze patterns
   */
  private recordError(context: ErrorContext) {
    // Add to error history
    if (!this.errorHistory.has(context.component)) {
      this.errorHistory.set(context.component, []);
    }
    this.errorHistory.get(context.component)!.push(context);

    // Create error signature for pattern analysis
    const signature = this.createErrorSignature(context);
    
    // Update pattern tracking
    const pattern = this.errorPatterns.get(signature) || {
      signature,
      count: 0,
      lastSeen: 0,
      recoverySuccess: 0,
      totalAttempts: 0
    };
    
    pattern.count++;
    pattern.lastSeen = context.timestamp;
    pattern.totalAttempts++;
    
    this.errorPatterns.set(signature, pattern);
    
    // Clean old history
    this.cleanErrorHistory();
  }

  /**
   * Create error signature for pattern matching
   */
  private createErrorSignature(context: ErrorContext): string {
    return `${context.component}:${context.category}:${context.operation}:${context.error.name}`;
  }

  /**
   * Attempt error recovery using best available strategy
   */
  private async attemptRecovery(context: ErrorContext): Promise<boolean> {
    const availableStrategies = this.selectRecoveryStrategies(context);
    
    if (availableStrategies.length === 0) {
      console.warn('No recovery strategies available for error:', context);
      return false;
    }

    // Try strategies in order of preference
    for (const strategy of availableStrategies) {
      const attemptId = this.generateAttemptId();
      const attempt: RecoveryAttempt = {
        id: attemptId,
        errorId: context.errorId,
        strategy,
        startTime: Date.now(),
        success: false,
        cost: strategy.cost
      };

      this.activeRecoveries.set(attemptId, attempt);

      try {
        console.log(`Attempting recovery with strategy: ${strategy.name}`);
        
        const success = await strategy.execute(context);
        
        attempt.endTime = Date.now();
        attempt.success = success;
        
        if (success) {
          attempt.message = 'Recovery successful';
          this.updateStrategySuccessRate(strategy.id, true);
          this.updateErrorPattern(context, true);
          
          console.log(`Recovery successful using strategy: ${strategy.name}`);
          return true;
        } else {
          attempt.message = 'Recovery failed';
          this.updateStrategySuccessRate(strategy.id, false);
        }
        
      } catch (error) {
        attempt.endTime = Date.now();
        attempt.success = false;
        attempt.message = `Recovery failed: ${error}`;
        
        this.updateStrategySuccessRate(strategy.id, false);
        console.error(`Recovery strategy ${strategy.name} failed:`, error);
      } finally {
        this.activeRecoveries.delete(attemptId);
      }
    }

    this.updateErrorPattern(context, false);
    return false;
  }

  /**
   * Select best recovery strategies for the error
   */
  private selectRecoveryStrategies(context: ErrorContext): RecoveryStrategy[] {
    const applicableStrategies = Array.from(this.strategies.values())
      .filter(strategy => 
        strategy.category.includes(context.category) &&
        strategy.severity.includes(context.severity)
      );

    // Check for pattern-based best strategy
    const signature = this.createErrorSignature(context);
    const pattern = this.errorPatterns.get(signature);
    
    if (pattern?.bestStrategy) {
      const bestStrategy = this.strategies.get(pattern.bestStrategy);
      if (bestStrategy && applicableStrategies.includes(bestStrategy)) {
        // Put best strategy first
        return [
          bestStrategy,
          ...applicableStrategies.filter(s => s.id !== pattern.bestStrategy)
        ].sort((a, b) => {
          // Sort by success rate and cost
          const scoreA = a.successRate - (a.cost * 0.1);
          const scoreB = b.successRate - (b.cost * 0.1);
          return scoreB - scoreA;
        });
      }
    }

    // Sort by success rate and cost
    return applicableStrategies.sort((a, b) => {
      const scoreA = a.successRate - (a.cost * 0.1);
      const scoreB = b.successRate - (b.cost * 0.1);
      return scoreB - scoreA;
    });
  }

  /**
   * Register a new recovery strategy
   */
  registerStrategy(strategy: RecoveryStrategy) {
    this.strategies.set(strategy.id, strategy);
    this.metrics.strategySuccessRates.set(strategy.id, strategy.successRate);
  }

  /**
   * Circuit breaker management
   */
  private isCircuitBreakerOpen(component: string): boolean {
    const breaker = this.circuitBreakers.get(component);
    if (!breaker) return false;

    if (breaker.isOpen) {
      // Check if timeout has passed
      if (Date.now() - breaker.lastFailure > this.circuitBreakerTimeout) {
        breaker.isOpen = false;
        breaker.failureCount = 0;
        console.log(`Circuit breaker closed for ${component}`);
      }
    }

    return breaker.isOpen;
  }

  private updateCircuitBreaker(component: string, success: boolean) {
    if (!this.circuitBreakers.has(component)) {
      this.circuitBreakers.set(component, {
        isOpen: false,
        lastFailure: 0,
        failureCount: 0
      });
    }

    const breaker = this.circuitBreakers.get(component)!;

    if (success) {
      breaker.failureCount = 0;
    } else {
      breaker.failureCount++;
      breaker.lastFailure = Date.now();

      if (breaker.failureCount >= this.circuitBreakerThreshold) {
        breaker.isOpen = true;
        console.warn(`Circuit breaker opened for ${component} after ${breaker.failureCount} failures`);
        
        toast.error(`${component} temporarily unavailable`, {
          duration: 8000,
          icon: '🚫'
        });
      }
    }
  }

  /**
   * Helper methods
   */
  private getRetryAttempt(errorId: string): number {
    const history = Array.from(this.errorHistory.values()).flat();
    return history.filter(err => err.errorId === errorId).length;
  }

  private async retryOriginalOperation(context: ErrorContext): Promise<boolean> {
    // This would typically retry the original operation that failed
    // For now, simulate with a success rate
    return Math.random() > 0.3; // 70% success rate
  }

  private async refreshAuthToken(): Promise<string | null> {
    // Simulate token refresh
    return `token_${Date.now()}`;
  }

  private sanitizeData(data: any): any {
    // Basic data sanitization
    if (typeof data === 'string') {
      return data.replace(/[^\w\s]/gi, '');
    }
    return data;
  }

  private async getCachedData(operation: string): Promise<any> {
    // Simulate cache lookup
    return Math.random() > 0.5 ? { cached: true, data: 'fallback' } : null;
  }

  private enableDegradedMode(component: string) {
    console.log(`Enabling degraded mode for ${component}`);
    // Implementation would disable non-essential features
  }

  private notifyUser(context: ErrorContext) {
    const message = `${context.component} is experiencing issues. Please try again later.`;
    toast.error(message, { duration: 10000, icon: '❌' });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateAttemptId(): string {
    return `attempt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Update strategy success rates
   */
  private updateStrategySuccessRate(strategyId: string, success: boolean) {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) return;

    const currentRate = this.metrics.strategySuccessRates.get(strategyId) || 0;
    const newRate = success ? 
      Math.min(1.0, currentRate + 0.1) : 
      Math.max(0.0, currentRate - 0.05);
    
    strategy.successRate = newRate;
    this.metrics.strategySuccessRates.set(strategyId, newRate);
  }

  /**
   * Update error pattern with recovery result
   */
  private updateErrorPattern(context: ErrorContext, success: boolean) {
    const signature = this.createErrorSignature(context);
    const pattern = this.errorPatterns.get(signature);
    
    if (pattern) {
      if (success) {
        pattern.recoverySuccess++;
        // Update best strategy if this attempt was successful
        const attempts = Array.from(this.activeRecoveries.values())
          .filter(a => a.errorId === context.errorId && a.success);
        
        if (attempts.length > 0) {
          const bestAttempt = attempts.sort((a, b) => 
            (b.strategy.successRate - b.strategy.cost * 0.1) - 
            (a.strategy.successRate - a.strategy.cost * 0.1)
          )[0];
          
          pattern.bestStrategy = bestAttempt.strategy.id;
        }
      }
    }
  }

  /**
   * Update overall metrics
   */
  private updateMetrics(context: ErrorContext, recovered: boolean) {
    this.metrics.totalErrors++;
    
    if (recovered) {
      this.metrics.recoveredErrors++;
    } else {
      this.metrics.failedRecoveries++;
    }

    // Update average recovery time
    const attempts = Array.from(this.activeRecoveries.values())
      .filter(a => a.errorId === context.errorId && a.endTime);
    
    if (attempts.length > 0) {
      const avgTime = attempts.reduce((sum, a) => 
        sum + (a.endTime! - a.startTime), 0) / attempts.length;
      
      this.metrics.averageRecoveryTime = 
        (this.metrics.averageRecoveryTime + avgTime) / 2;
    }
  }

  /**
   * Clean old error history
   */
  private cleanErrorHistory() {
    const cutoff = Date.now() - this.patternAnalysisWindow;
    
    this.errorHistory.forEach((errors, component) => {
      const filtered = errors.filter(error => error.timestamp > cutoff);
      this.errorHistory.set(component, filtered);
    });
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup() {
    setInterval(() => {
      this.cleanErrorHistory();
      this.cleanOldPatterns();
    }, 60000); // Every minute
  }

  private cleanOldPatterns() {
    const cutoff = Date.now() - this.patternAnalysisWindow;
    
    for (const [signature, pattern] of this.errorPatterns) {
      if (pattern.lastSeen < cutoff) {
        this.errorPatterns.delete(signature);
      }
    }
  }

  /**
   * Get recovery metrics and status
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeRecoveries: this.activeRecoveries.size,
      knownPatterns: this.errorPatterns.size,
      circuitBreakers: Array.from(this.circuitBreakers.entries())
        .map(([component, breaker]) => ({
          component,
          isOpen: breaker.isOpen,
          failureCount: breaker.failureCount
        }))
    };
  }

  /**
   * Get error patterns for analysis
   */
  getErrorPatterns() {
    return Array.from(this.errorPatterns.values())
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Reset circuit breaker for component
   */
  resetCircuitBreaker(component: string) {
    const breaker = this.circuitBreakers.get(component);
    if (breaker) {
      breaker.isOpen = false;
      breaker.failureCount = 0;
      console.log(`Circuit breaker manually reset for ${component}`);
    }
  }
}

// Singleton instance
export const errorRecoveryManager = new ErrorRecoveryManager();

// Convenience function for error handling
export const handleError = async (error: Error, context: Partial<ErrorContext>): Promise<boolean> => {
  const fullContext: ErrorContext = {
    errorId: `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    error,
    component: context.component || 'unknown',
    operation: context.operation || 'unknown',
    severity: context.severity || 'medium',
    category: context.category || 'unknown',
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    metadata: context.metadata
  };

  return errorRecoveryManager.handleError(fullContext);
};

// React hook for error recovery
export const useErrorRecovery = () => {
  return {
    handleError: (error: Error, context: Partial<ErrorContext>) => 
      handleError(error, context),
    getMetrics: () => errorRecoveryManager.getMetrics(),
    resetCircuitBreaker: (component: string) => 
      errorRecoveryManager.resetCircuitBreaker(component)
  };
};
