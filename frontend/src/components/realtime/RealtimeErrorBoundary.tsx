'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, Wifi, WifiOff, Bug, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

// Error classification types
type ErrorCategory = 'network' | 'render' | 'data' | 'permission' | 'unknown';
type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

interface ErrorReport {
  message: string;
  stack?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: Date;
  componentName?: string;
  errorBoundary: string;
  retryCount: number;
  userAgent: string;
  url: string;
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, errorReport: ErrorReport) => void;
  enableRetry?: boolean;
  enableReporting?: boolean;
  maxRetries?: number;
  componentName?: string;
  showDetailedErrors?: boolean;
  autoResetTimeout?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorReport: ErrorReport | null;
  retryCount: number;
  isRetrying: boolean;
  isReconnecting: boolean;
  showErrorDetails: boolean;
  isAutoReset: boolean;
}

export class RealtimeErrorBoundary extends Component<Props, State> {
  private autoResetTimer: NodeJS.Timeout | null = null;
  private retryTimer: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorReport: null,
      retryCount: 0,
      isRetrying: false,
      isReconnecting: false,
      showErrorDetails: false,
      isAutoReset: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorReport = this.createErrorReport(error, errorInfo);
    
    this.setState({
      errorInfo,
      errorReport
    });

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorReport);
    }

    // Show toast notification
    this.showErrorNotification(errorReport);

    // Auto-reset timer if enabled
    if (this.props.autoResetTimeout && this.props.autoResetTimeout > 0) {
      this.startAutoReset();
    }

    // Report error to monitoring service (placeholder)
    if (this.props.enableReporting !== false) {
      this.reportError(errorReport);
    }
  }

  componentWillUnmount() {
    if (this.autoResetTimer) {
      clearTimeout(this.autoResetTimer);
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  private createErrorReport(error: Error, errorInfo: ErrorInfo): ErrorReport {
    const category = this.categorizeError(error);
    const severity = this.determineSeverity(error, category);

    return {
      message: error.message,
      stack: error.stack,
      category,
      severity,
      timestamp: new Date(),
      componentName: this.props.componentName || 'Unknown Component',
      errorBoundary: 'RealtimeErrorBoundary',
      retryCount: this.state.retryCount,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
  }

  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network';
    }
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      return 'permission';
    }
    if (message.includes('data') || message.includes('parse') || message.includes('json')) {
      return 'data';
    }
    if (stack.includes('render') || message.includes('render') || message.includes('component')) {
      return 'render';
    }
    return 'unknown';
  }

  private determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    // Critical errors that break core functionality
    if (category === 'permission' || error.message.includes('Critical')) {
      return 'critical';
    }
    
    // High severity for network issues that affect real-time features
    if (category === 'network' || error.message.includes('Connection')) {
      return 'high';
    }
    
    // Medium severity for data issues
    if (category === 'data' || category === 'render') {
      return 'medium';
    }
    
    // Low severity for other issues
    return 'low';
  }

  private showErrorNotification(errorReport: ErrorReport) {
    const icons = {
      network: '📡',
      render: '🔧',
      data: '📊',
      permission: '🔒',
      unknown: '⚠️'
    };

    const messages = {
      network: 'Connection issue detected',
      render: 'Component rendering error',
      data: 'Data processing error',
      permission: 'Permission error',
      unknown: 'Unexpected error occurred'
    };

    const message = messages[errorReport.category];
    const icon = icons[errorReport.category];

    if (errorReport.severity === 'critical') {
      toast.error(`${icon} ${message}`, {
        duration: 8000,
        position: 'top-center',
      });
    } else if (errorReport.severity === 'high') {
      toast.error(`${icon} ${message}`, {
        duration: 6000,
        position: 'top-right',
      });
    } else {
      toast(`${icon} ${message}`, {
        duration: 4000,
        position: 'top-right',
      });
    }
  }

  private async reportError(errorReport: ErrorReport) {
    // Placeholder for error reporting service
    console.group('🐛 Real-time Error Report');
    console.error('Error:', errorReport.message);
    console.error('Category:', errorReport.category);
    console.error('Severity:', errorReport.severity);
    console.error('Component:', errorReport.componentName);
    console.error('Retry Count:', errorReport.retryCount);
    console.error('Timestamp:', errorReport.timestamp.toISOString());
    if (errorReport.stack) {
      console.error('Stack:', errorReport.stack);
    }
    console.groupEnd();

    // In production, this would send to monitoring service
    // await errorReportingService.report(errorReport);
  }

  private startAutoReset() {
    this.setState({ isAutoReset: true });
    
    this.autoResetTimer = setTimeout(() => {
      this.handleRetry();
    }, this.props.autoResetTimeout!);
  }

  private handleRetry = async () => {
    const maxRetries = this.props.maxRetries || 3;
    
    if (this.state.retryCount >= maxRetries) {
      toast.error('Maximum retry attempts reached', {
        duration: 6000,
        position: 'top-center',
      });
      return;
    }

    this.setState({ 
      isRetrying: true,
      retryCount: this.state.retryCount + 1
    });

    // Clear auto-reset timer
    if (this.autoResetTimer) {
      clearTimeout(this.autoResetTimer);
      this.autoResetTimer = null;
    }

    // Simulate retry delay
    this.retryTimer = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorReport: null,
        isRetrying: false,
        isAutoReset: false
      });

      toast.success('Component recovered successfully', {
        duration: 3000,
        position: 'top-right',
        icon: '✅',
      });
    }, 2000);
  };

  private handleReconnect = async () => {
    this.setState({ isReconnecting: true });

    // Simulate reconnection attempt
    setTimeout(() => {
      this.setState({ isReconnecting: false });
      this.handleRetry();
    }, 1500);
  };

  private toggleErrorDetails = () => {
    this.setState(prev => ({
      showErrorDetails: !prev.showErrorDetails
    }));
  };

  private renderErrorDetails() {
    const { error, errorInfo, errorReport } = this.state;
    
    if (!error || !errorReport) return null;

    return (
      <motion.div
        className="mt-4 p-4 bg-slate-900 rounded-lg border border-slate-600"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-slate-400">Error Message:</span>
            <p className="text-red-400 font-mono mt-1">{error.message}</p>
          </div>
          
          <div>
            <span className="text-slate-400">Category:</span>
            <span className={`ml-2 px-2 py-1 rounded text-xs ${
              errorReport.category === 'network' ? 'bg-blue-900 text-blue-300' :
              errorReport.category === 'render' ? 'bg-purple-900 text-purple-300' :
              errorReport.category === 'data' ? 'bg-orange-900 text-orange-300' :
              errorReport.category === 'permission' ? 'bg-red-900 text-red-300' :
              'bg-gray-900 text-gray-300'
            }`}>
              {errorReport.category}
            </span>
          </div>
          
          <div>
            <span className="text-slate-400">Severity:</span>
            <span className={`ml-2 px-2 py-1 rounded text-xs ${
              errorReport.severity === 'critical' ? 'bg-red-900 text-red-300' :
              errorReport.severity === 'high' ? 'bg-orange-900 text-orange-300' :
              errorReport.severity === 'medium' ? 'bg-yellow-900 text-yellow-300' :
              'bg-green-900 text-green-300'
            }`}>
              {errorReport.severity}
            </span>
          </div>
          
          <div>
            <span className="text-slate-400">Timestamp:</span>
            <span className="text-white ml-2">{errorReport.timestamp.toLocaleString()}</span>
          </div>
          
          <div>
            <span className="text-slate-400">Retry Count:</span>
            <span className="text-white ml-2">{errorReport.retryCount}</span>
          </div>

          {error.stack && (
            <div>
              <span className="text-slate-400">Stack Trace:</span>
              <pre className="text-xs text-slate-300 bg-slate-800 p-2 rounded mt-1 overflow-auto max-h-32">
                {error.stack}
              </pre>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { errorReport } = this.state;
    const maxRetries = this.props.maxRetries || 3;
    const canRetry = this.props.enableRetry !== false && this.state.retryCount < maxRetries;

    // Use custom fallback if provided
    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <motion.div
        className="flex flex-col items-center justify-center p-8 bg-slate-800 rounded-lg border border-slate-700 min-h-[300px]"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        role="alert"
        aria-live="assertive"
      >
        <motion.div
          className="flex items-center space-x-3 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className={`p-3 rounded-full ${
            errorReport?.severity === 'critical' ? 'bg-red-900' :
            errorReport?.severity === 'high' ? 'bg-orange-900' :
            errorReport?.severity === 'medium' ? 'bg-yellow-900' :
            'bg-blue-900'
          }`}>
            <AlertTriangle className={`w-6 h-6 ${
              errorReport?.severity === 'critical' ? 'text-red-400' :
              errorReport?.severity === 'high' ? 'text-orange-400' :
              errorReport?.severity === 'medium' ? 'text-yellow-400' :
              'text-blue-400'
            }`} />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-1">
              Real-time Component Error
            </h3>
            <p className="text-slate-400 text-sm">
              {this.props.componentName || 'Component'} encountered an error
            </p>
          </div>
        </motion.div>

        <motion.div
          className="text-center mb-6 max-w-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-slate-300 mb-2">
            {errorReport?.category === 'network' 
              ? 'There seems to be a connection issue. Check your internet connection and try again.'
              : errorReport?.category === 'permission'
              ? 'Permission denied. Please check your access rights.'
              : errorReport?.category === 'data'
              ? 'There was an issue processing the data. The service may be temporarily unavailable.'
              : 'An unexpected error occurred. The component will attempt to recover automatically.'}
          </p>
          
          {this.state.isAutoReset && (
            <p className="text-blue-400 text-sm">
              Auto-recovery in progress...
            </p>
          )}
        </motion.div>

        <motion.div
          className="flex flex-wrap justify-center gap-3 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {canRetry && (
            <motion.button
              onClick={this.handleRetry}
              disabled={this.state.isRetrying}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Retry component"
            >
              <RefreshCw className={`w-4 h-4 ${this.state.isRetrying ? 'animate-spin' : ''}`} />
              <span>{this.state.isRetrying ? 'Retrying...' : 'Retry'}</span>
            </motion.button>
          )}

          {errorReport?.category === 'network' && (
            <motion.button
              onClick={this.handleReconnect}
              disabled={this.state.isReconnecting}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 text-white rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Reconnect to service"
            >
              {this.state.isReconnecting ? (
                <WifiOff className="w-4 h-4 animate-pulse" />
              ) : (
                <Wifi className="w-4 h-4" />
              )}
              <span>{this.state.isReconnecting ? 'Reconnecting...' : 'Reconnect'}</span>
            </motion.button>
          )}

          {this.props.showDetailedErrors && (
            <motion.button
              onClick={this.toggleErrorDetails}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label={this.state.showErrorDetails ? 'Hide error details' : 'Show error details'}
            >
              <Bug className="w-4 h-4" />
              <span>Details</span>
              {this.state.showErrorDetails ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </motion.button>
          )}
        </motion.div>

        {this.state.retryCount >= maxRetries && (
          <motion.div
            className="text-center p-4 bg-red-900/20 border border-red-700 rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-red-400 text-sm">
              Maximum retry attempts reached. Please refresh the page or contact support if the issue persists.
            </p>
          </motion.div>
        )}

        <AnimatePresence>
          {this.state.showErrorDetails && this.renderErrorDetails()}
        </AnimatePresence>
      </motion.div>
    );
  }
}

// Convenience hook for wrapping components with error boundary
export function withRealtimeErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Partial<Props>
) {
  const WrappedComponent = (props: P) => (
    <RealtimeErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </RealtimeErrorBoundary>
  );

  WrappedComponent.displayName = `withRealtimeErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}
