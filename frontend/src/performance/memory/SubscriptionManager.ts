// =============================================================================
// SUBSCRIPTION MANAGER CLASS
// =============================================================================
// Memory management for real-time subscriptions using WeakMap tracking and reference counting

export interface SubscriptionConfig {
  id: string;
  component: React.ComponentType | string;
  table?: string;
  filter?: any;
  onUpdate?: (data: any) => void;
  onError?: (error: Error) => void;
  priority?: 'low' | 'medium' | 'high';
  ttl?: number; // time-to-live in milliseconds
}

export interface SubscriptionInfo {
  id: string;
  componentRef: WeakRef<React.ComponentType | any>;
  unsubscribeFn: () => void;
  createdAt: number;
  lastUsed: number;
  referenceCount: number;
  priority: 'low' | 'medium' | 'high';
  ttl?: number;
  isActive: boolean;
}

class SubscriptionManager {
  // WeakMap for automatic cleanup when components are garbage collected
  private componentSubscriptions = new WeakMap<React.ComponentType | any, Set<string>>();
  
  // Strong references for active subscriptions
  private activeSubscriptions = new Map<string, SubscriptionInfo>();
  
  // WeakRef registry for component tracking
  private componentRegistry = new Map<string, WeakRef<React.ComponentType | any>>();
  
  // Cleanup registry for FinalizationRegistry
  private cleanupRegistry: FinalizationRegistry<string>;
  
  // Configuration
  private maxSubscriptions = 100;
  private cleanupInterval = 30000; // 30 seconds
  private memoryThreshold = 50 * 1024 * 1024; // 50MB
  
  // Metrics
  private metrics = {
    totalCreated: 0,
    totalCleaned: 0,
    activeCount: 0,
    memoryUsage: 0
  };

  constructor() {
    this.cleanupRegistry = new FinalizationRegistry((subscriptionId: string) => {
      this.handleComponentFinalization(subscriptionId);
    });
    
    this.startPeriodicCleanup();
    this.startMemoryMonitoring();
  }

  /**
   * Create a new subscription with automatic cleanup
   */
  createSubscription(config: SubscriptionConfig, component: React.ComponentType | any): string {
    const subscriptionId = this.generateSubscriptionId(config);
    
    // Check for existing subscription
    if (this.activeSubscriptions.has(subscriptionId)) {
      const existing = this.activeSubscriptions.get(subscriptionId)!;
      existing.referenceCount++;
      existing.lastUsed = Date.now();
      return subscriptionId;
    }

    // Check memory limits
    if (this.activeSubscriptions.size >= this.maxSubscriptions) {
      this.performEmergencyCleanup();
    }

    // Create weak reference to component
    const componentRef = new WeakRef(component);
    
    // Create subscription info
    const subscriptionInfo: SubscriptionInfo = {
      id: subscriptionId,
      componentRef,
      unsubscribeFn: () => {}, // Will be set by actual subscription
      createdAt: Date.now(),
      lastUsed: Date.now(),
      referenceCount: 1,
      priority: config.priority || 'medium',
      ttl: config.ttl,
      isActive: true
    };

    // Register for cleanup when component is garbage collected
    this.cleanupRegistry.register(component, subscriptionId);

    // Add to component tracking
    if (!this.componentSubscriptions.has(component)) {
      this.componentSubscriptions.set(component, new Set());
    }
    this.componentSubscriptions.get(component)!.add(subscriptionId);
    
    // Store component reference
    this.componentRegistry.set(subscriptionId, componentRef);

    // Store subscription
    this.activeSubscriptions.set(subscriptionId, subscriptionInfo);
    
    // Update metrics
    this.metrics.totalCreated++;
    this.metrics.activeCount = this.activeSubscriptions.size;

    return subscriptionId;
  }

  /**
   * Register unsubscribe function for a subscription
   */
  registerUnsubscribe(subscriptionId: string, unsubscribeFn: () => void) {
    const subscription = this.activeSubscriptions.get(subscriptionId);
    if (subscription) {
      subscription.unsubscribeFn = unsubscribeFn;
    }
  }

  /**
   * Mark subscription as used (updates last used timestamp)
   */
  markUsed(subscriptionId: string) {
    const subscription = this.activeSubscriptions.get(subscriptionId);
    if (subscription) {
      subscription.lastUsed = Date.now();
    }
  }

  /**
   * Remove subscription and clean up resources
   */
  removeSubscription(subscriptionId: string): boolean {
    const subscription = this.activeSubscriptions.get(subscriptionId);
    if (!subscription) return false;

    // Decrease reference count
    subscription.referenceCount--;
    
    // Only cleanup if no more references
    if (subscription.referenceCount <= 0) {
      return this.cleanupSubscription(subscriptionId);
    }

    return false;
  }

  /**
   * Force cleanup of a subscription
   */
  private cleanupSubscription(subscriptionId: string): boolean {
    const subscription = this.activeSubscriptions.get(subscriptionId);
    if (!subscription) return false;

    try {
      // Call unsubscribe function
      if (subscription.unsubscribeFn) {
        subscription.unsubscribeFn();
      }

      // Mark as inactive
      subscription.isActive = false;

      // Remove from active subscriptions
      this.activeSubscriptions.delete(subscriptionId);
      
      // Remove component reference
      this.componentRegistry.delete(subscriptionId);

      // Update metrics
      this.metrics.totalCleaned++;
      this.metrics.activeCount = this.activeSubscriptions.size;

      return true;
    } catch (error) {
      console.error('Error cleaning up subscription:', error);
      return false;
    }
  }

  /**
   * Handle component finalization (garbage collection)
   */
  private handleComponentFinalization(subscriptionId: string) {
    console.log(`Component finalized, cleaning up subscription: ${subscriptionId}`);
    this.cleanupSubscription(subscriptionId);
  }

  /**
   * Clean up subscriptions for a specific component
   */
  cleanupComponent(component: React.ComponentType | any) {
    const subscriptionIds = this.componentSubscriptions.get(component);
    if (!subscriptionIds) return;

    subscriptionIds.forEach(id => {
      this.removeSubscription(id);
    });

    this.componentSubscriptions.delete(component);
  }

  /**
   * Periodic cleanup of expired and unused subscriptions
   */
  private startPeriodicCleanup() {
    setInterval(() => {
      this.performPeriodicCleanup();
    }, this.cleanupInterval);
  }

  private performPeriodicCleanup() {
    const now = Date.now();
    const subscriptionsToCleanup: string[] = [];

    this.activeSubscriptions.forEach((subscription, id) => {
      const shouldCleanup = this.shouldCleanupSubscription(subscription, now);
      if (shouldCleanup) {
        subscriptionsToCleanup.push(id);
      }
    });

    subscriptionsToCleanup.forEach(id => {
      this.cleanupSubscription(id);
    });

    if (subscriptionsToCleanup.length > 0) {
      console.log(`Periodic cleanup: removed ${subscriptionsToCleanup.length} subscriptions`);
    }
  }

  private shouldCleanupSubscription(subscription: SubscriptionInfo, now: number): boolean {
    // Check if component still exists
    const component = subscription.componentRef.deref();
    if (!component) {
      return true; // Component was garbage collected
    }

    // Check TTL
    if (subscription.ttl && (now - subscription.createdAt) > subscription.ttl) {
      return true;
    }

    // Check if unused for too long (based on priority)
    const maxIdleTime = this.getMaxIdleTime(subscription.priority);
    if ((now - subscription.lastUsed) > maxIdleTime) {
      return true;
    }

    return false;
  }

  private getMaxIdleTime(priority: 'low' | 'medium' | 'high'): number {
    switch (priority) {
      case 'high':
        return 5 * 60 * 1000; // 5 minutes
      case 'medium':
        return 3 * 60 * 1000; // 3 minutes
      case 'low':
        return 1 * 60 * 1000; // 1 minute
      default:
        return 3 * 60 * 1000;
    }
  }

  /**
   * Emergency cleanup when approaching memory limits
   */
  private performEmergencyCleanup() {
    console.warn('Performing emergency subscription cleanup');
    
    // Sort by priority and last used time
    const subscriptions = Array.from(this.activeSubscriptions.entries())
      .sort(([, a], [, b]) => {
        // Sort by priority (low first) then by last used (oldest first)
        const priorityOrder = { low: 0, medium: 1, high: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        return a.lastUsed - b.lastUsed;
      });

    // Clean up lowest priority and oldest subscriptions
    const cleanupCount = Math.ceil(this.activeSubscriptions.size * 0.2); // 20%
    for (let i = 0; i < cleanupCount && i < subscriptions.length; i++) {
      this.cleanupSubscription(subscriptions[i][0]);
    }
  }

  /**
   * Memory monitoring and alerts
   */
  private startMemoryMonitoring() {
    setInterval(() => {
      this.updateMemoryMetrics();
    }, 10000); // Every 10 seconds
  }

  private updateMemoryMetrics() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize;
      
      if (memory.usedJSHeapSize > this.memoryThreshold) {
        console.warn('High memory usage detected, triggering cleanup');
        this.performEmergencyCleanup();
      }
    }
  }

  /**
   * Generate unique subscription ID
   */
  private generateSubscriptionId(config: SubscriptionConfig): string {
    const parts = [
      config.id,
      config.table || 'default',
      JSON.stringify(config.filter || {}),
      typeof config.component === 'string' ? config.component : config.component.name || 'anonymous'
    ];
    
    return btoa(parts.join('|')).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeCount: this.activeSubscriptions.size
    };
  }

  /**
   * Get subscription info
   */
  getSubscriptionInfo(subscriptionId: string): SubscriptionInfo | undefined {
    return this.activeSubscriptions.get(subscriptionId);
  }

  /**
   * Get all active subscriptions
   */
  getAllSubscriptions(): Map<string, SubscriptionInfo> {
    return new Map(this.activeSubscriptions);
  }

  /**
   * Cleanup all subscriptions (for testing or reset)
   */
  cleanup() {
    this.activeSubscriptions.forEach((_, id) => {
      this.cleanupSubscription(id);
    });
    
    this.componentRegistry.clear();
    this.metrics = {
      totalCreated: 0,
      totalCleaned: 0,
      activeCount: 0,
      memoryUsage: 0
    };
  }
}

// Singleton instance
export const subscriptionManager = new SubscriptionManager();

// React hook for subscription management
export const useSubscriptionManager = () => {
  return {
    createSubscription: (config: SubscriptionConfig, component: any) => 
      subscriptionManager.createSubscription(config, component),
    removeSubscription: (id: string) => subscriptionManager.removeSubscription(id),
    markUsed: (id: string) => subscriptionManager.markUsed(id),
    getMetrics: () => subscriptionManager.getMetrics()
  };
};
