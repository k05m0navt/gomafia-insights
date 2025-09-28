// =============================================================================
// ATTENTION TRACKER CLASS
// =============================================================================
// Tracks user attention and visibility for adaptive throttling optimization

export interface AttentionState {
  isVisible: boolean;
  isActive: boolean;
  isInViewport: boolean;
  lastInteraction: number;
  interactionType: 'mouse' | 'keyboard' | 'scroll' | 'touch' | 'none';
  attentionLevel: 'high' | 'medium' | 'low' | 'background';
  confidence: number; // 0-1 confidence in attention level
}

export interface ViewportInfo {
  element: Element;
  isIntersecting: boolean;
  intersectionRatio: number;
  lastVisible: number;
}

class AttentionTracker {
  private state: AttentionState;
  private intersectionObserver: IntersectionObserver | null = null;
  private trackedElements = new Map<Element, ViewportInfo>();
  private eventListeners: Array<() => void> = [];
  
  // Configuration
  private inactivityThreshold = 30000; // 30 seconds
  private lowAttentionThreshold = 60000; // 1 minute
  private intersectionThreshold = [0, 0.1, 0.5, 0.9]; // Different levels of visibility
  
  // Callbacks
  private stateChangeCallback: ((state: AttentionState) => void) | null = null;
  private onVisibilityChange: ((element: Element, info: ViewportInfo) => void) | null = null;

  constructor() {
    this.state = {
      isVisible: !document.hidden,
      isActive: true,
      isInViewport: true,
      lastInteraction: Date.now(),
      interactionType: 'none',
      attentionLevel: 'high',
      confidence: 1.0
    };

    this.initializeVisibilityAPI();
    this.initializeIntersectionObserver();
    this.initializeInteractionTracking();
    this.startAttentionEvaluation();
  }

  /**
   * Initialize Page Visibility API
   */
  private initializeVisibilityAPI() {
    const handleVisibilityChange = () => {
      this.updateVisibility(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    this.eventListeners.push(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    });
  }

  /**
   * Initialize Intersection Observer for viewport tracking
   */
  private initializeIntersectionObserver() {
    if (!('IntersectionObserver' in window)) {
      console.warn('IntersectionObserver not supported, viewport tracking disabled');
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          this.handleIntersectionChange(entry);
        });
      },
      {
        threshold: this.intersectionThreshold,
        rootMargin: '50px' // Track elements slightly outside viewport
      }
    );
  }

  /**
   * Initialize interaction tracking (mouse, keyboard, scroll, touch)
   */
  private initializeInteractionTracking() {
    const interactions = [
      { event: 'mousemove', type: 'mouse' as const },
      { event: 'mousedown', type: 'mouse' as const },
      { event: 'click', type: 'mouse' as const },
      { event: 'keydown', type: 'keyboard' as const },
      { event: 'keyup', type: 'keyboard' as const },
      { event: 'scroll', type: 'scroll' as const },
      { event: 'wheel', type: 'scroll' as const },
      { event: 'touchstart', type: 'touch' as const },
      { event: 'touchmove', type: 'touch' as const },
      { event: 'touchend', type: 'touch' as const }
    ];

    interactions.forEach(({ event, type }) => {
      const handler = () => this.recordInteraction(type);
      
      document.addEventListener(event, handler, { passive: true });
      this.eventListeners.push(() => {
        document.removeEventListener(event, handler);
      });
    });

    // Focus/blur events for window
    const handleFocus = () => this.updateActivity(true);
    const handleBlur = () => this.updateActivity(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    this.eventListeners.push(() => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    });
  }

  /**
   * Start periodic attention level evaluation
   */
  private startAttentionEvaluation() {
    setInterval(() => {
      this.evaluateAttentionLevel();
    }, 1000); // Evaluate every second
  }

  /**
   * Record user interaction
   */
  private recordInteraction(type: AttentionState['interactionType']) {
    const now = Date.now();
    const previousType = this.state.interactionType;
    
    this.state.lastInteraction = now;
    this.state.interactionType = type;
    this.state.isActive = true;

    // If interaction type changed, re-evaluate attention
    if (previousType !== type) {
      this.evaluateAttentionLevel();
    }
  }

  /**
   * Update page visibility
   */
  private updateVisibility(isVisible: boolean) {
    if (this.state.isVisible !== isVisible) {
      this.state.isVisible = isVisible;
      this.evaluateAttentionLevel();
    }
  }

  /**
   * Update window activity (focus/blur)
   */
  private updateActivity(isActive: boolean) {
    if (this.state.isActive !== isActive) {
      this.state.isActive = isActive;
      this.evaluateAttentionLevel();
    }
  }

  /**
   * Handle intersection observer changes
   */
  private handleIntersectionChange(entry: IntersectionObserverEntry) {
    const element = entry.target;
    const info = this.trackedElements.get(element);
    
    if (info) {
      info.isIntersecting = entry.isIntersecting;
      info.intersectionRatio = entry.intersectionRatio;
      
      if (entry.isIntersecting) {
        info.lastVisible = Date.now();
      }

      // Notify callback
      if (this.onVisibilityChange) {
        this.onVisibilityChange(element, info);
      }

      // Update overall viewport state
      this.updateViewportState();
    }
  }

  /**
   * Update overall viewport state based on tracked elements
   */
  private updateViewportState() {
    const visibleElements = Array.from(this.trackedElements.values())
      .filter(info => info.isIntersecting);

    const wasInViewport = this.state.isInViewport;
    this.state.isInViewport = visibleElements.length > 0;

    if (wasInViewport !== this.state.isInViewport) {
      this.evaluateAttentionLevel();
    }
  }

  /**
   * Evaluate current attention level
   */
  private evaluateAttentionLevel() {
    const now = Date.now();
    const timeSinceInteraction = now - this.state.lastInteraction;
    
    let attentionLevel: AttentionState['attentionLevel'] = 'background';
    let confidence = 1.0;

    // Base evaluation on visibility and activity
    if (!this.state.isVisible || !this.state.isActive) {
      attentionLevel = 'background';
      confidence = 1.0;
    } else if (!this.state.isInViewport) {
      attentionLevel = 'low';
      confidence = 0.8;
    } else {
      // Evaluate based on interaction recency and type
      if (timeSinceInteraction < 5000) { // 5 seconds
        attentionLevel = 'high';
        confidence = this.getInteractionConfidence(this.state.interactionType);
      } else if (timeSinceInteraction < this.inactivityThreshold) {
        attentionLevel = 'medium';
        confidence = Math.max(0.5, 1 - (timeSinceInteraction / this.inactivityThreshold));
      } else if (timeSinceInteraction < this.lowAttentionThreshold) {
        attentionLevel = 'low';
        confidence = Math.max(0.3, 1 - (timeSinceInteraction / this.lowAttentionThreshold));
      } else {
        attentionLevel = 'background';
        confidence = 0.9;
      }
    }

    // Update state if changed
    const hasChanged = 
      this.state.attentionLevel !== attentionLevel || 
      Math.abs(this.state.confidence - confidence) > 0.1;

    if (hasChanged) {
      this.state.attentionLevel = attentionLevel;
      this.state.confidence = confidence;

      // Notify state change
      if (this.stateChangeCallback) {
        this.stateChangeCallback({ ...this.state });
      }
    }
  }

  /**
   * Get confidence level based on interaction type
   */
  private getInteractionConfidence(type: AttentionState['interactionType']): number {
    switch (type) {
      case 'keyboard':
        return 1.0; // Highest confidence - user is actively typing
      case 'mouse':
        return 0.9; // High confidence - user is actively clicking/moving
      case 'touch':
        return 0.9; // High confidence - user is actively touching
      case 'scroll':
        return 0.7; // Medium confidence - user might be scanning
      case 'none':
        return 0.3; // Low confidence - no recent interaction
      default:
        return 0.5;
    }
  }

  /**
   * Track element for viewport visibility
   */
  trackElement(element: Element) {
    if (!this.intersectionObserver) return;

    if (!this.trackedElements.has(element)) {
      const info: ViewportInfo = {
        element,
        isIntersecting: false,
        intersectionRatio: 0,
        lastVisible: Date.now()
      };

      this.trackedElements.set(element, info);
      this.intersectionObserver.observe(element);
    }
  }

  /**
   * Stop tracking element
   */
  untrackElement(element: Element) {
    if (this.intersectionObserver && this.trackedElements.has(element)) {
      this.intersectionObserver.unobserve(element);
      this.trackedElements.delete(element);
      this.updateViewportState();
    }
  }

  /**
   * Get current attention state
   */
  getState(): AttentionState {
    return { ...this.state };
  }

  /**
   * Get suggested throttling multiplier based on attention level
   */
  getThrottlingMultiplier(): number {
    switch (this.state.attentionLevel) {
      case 'high':
        return 1.0; // No throttling
      case 'medium':
        return 1.5; // Mild throttling
      case 'low':
        return 3.0; // Significant throttling
      case 'background':
        return 10.0; // Heavy throttling
      default:
        return 2.0;
    }
  }

  /**
   * Register callback for state changes
   */
  onStateChange(callback: (state: AttentionState) => void) {
    this.stateChangeCallback = callback;
  }

  /**
   * Register callback for element visibility changes
   */
  onElementVisibilityChange(callback: (element: Element, info: ViewportInfo) => void) {
    this.onVisibilityChange = callback;
  }

  /**
   * Get viewport information for tracked elements
   */
  getTrackedElements(): Map<Element, ViewportInfo> {
    return new Map(this.trackedElements);
  }

  /**
   * Force re-evaluation of attention level
   */
  refresh() {
    this.evaluateAttentionLevel();
  }

  /**
   * Cleanup resources
   */
  destroy() {
    // Remove all event listeners
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners.length = 0;

    // Disconnect intersection observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }

    // Clear tracked elements
    this.trackedElements.clear();

    // Clear callbacks
    this.stateChangeCallback = null;
    this.onVisibilityChange = null;
  }
}

// Singleton instance
export const attentionTracker = new AttentionTracker();

// React hook for attention tracking
export const useAttentionTracker = () => {
  return {
    getState: () => attentionTracker.getState(),
    trackElement: (element: Element) => attentionTracker.trackElement(element),
    untrackElement: (element: Element) => attentionTracker.untrackElement(element),
    getThrottlingMultiplier: () => attentionTracker.getThrottlingMultiplier()
  };
};
