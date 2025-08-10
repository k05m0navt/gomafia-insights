// =============================================================================
// CONNECTION POOL CLASS
// =============================================================================
// Dynamic connection pooling with load balancing for real-time subscriptions

import { toast } from 'react-hot-toast';

export interface ConnectionConfig {
  url: string;
  apikey?: string;
  maxRetries?: number;
  retryDelay?: number;
  heartbeatInterval?: number;
  timeout?: number;
}

export interface SubscriptionRequest {
  id: string;
  table: string;
  filter?: any;
  onUpdate: (data: any) => void;
  onError: (error: Error) => void;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface PoolConnection {
  id: string;
  websocket: WebSocket | null;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  subscriptions: Map<string, SubscriptionRequest>;
  load: number; // Number of active subscriptions
  lastActivity: number;
  lastPing: number;
  errorCount: number;
  reconnectAttempts: number;
  createdAt: number;
}

export interface LoadBalancingStrategy {
  selectConnection(connections: Map<string, PoolConnection>): PoolConnection | null;
}

class ConnectionPool {
  private connections = new Map<string, PoolConnection>();
  private config: ConnectionConfig;
  private isRunning = false;
  
  // Pool configuration
  private minConnections = 1;
  private maxConnections = 5;
  private targetConnectionLoad = 10; // Target subscriptions per connection
  private maxConnectionLoad = 20; // Maximum subscriptions per connection
  private connectionTimeout = 30000; // 30 seconds
  private healthCheckInterval = 10000; // 10 seconds
  private reconnectDelay = 5000; // 5 seconds
  
  // Load balancing
  private loadBalancer: LoadBalancingStrategy;
  
  // Metrics
  private metrics = {
    totalConnections: 0,
    activeConnections: 0,
    totalSubscriptions: 0,
    failedConnections: 0,
    reconnectAttempts: 0,
    avgLatency: 0
  };

  constructor(config: ConnectionConfig) {
    this.config = config;
    this.loadBalancer = new RoundRobinBalancer();
    this.initializePool();
  }

  /**
   * Initialize connection pool
   */
  private async initializePool() {
    this.isRunning = true;
    
    // Create minimum number of connections
    for (let i = 0; i < this.minConnections; i++) {
      await this.createConnection();
    }
    
    // Start health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Create a new connection
   */
  private async createConnection(): Promise<PoolConnection> {
    const connectionId = this.generateConnectionId();
    
    const connection: PoolConnection = {
      id: connectionId,
      websocket: null,
      status: 'connecting',
      subscriptions: new Map(),
      load: 0,
      lastActivity: Date.now(),
      lastPing: Date.now(),
      errorCount: 0,
      reconnectAttempts: 0,
      createdAt: Date.now()
    };

    this.connections.set(connectionId, connection);
    
    try {
      await this.establishConnection(connection);
      this.metrics.totalConnections++;
      this.updateActiveConnectionCount();
      
      console.log(`Connection pool: Created connection ${connectionId}`);
      return connection;
    } catch (error) {
      console.error(`Failed to create connection ${connectionId}:`, error);
      this.connections.delete(connectionId);
      this.metrics.failedConnections++;
      throw error;
    }
  }

  /**
   * Establish WebSocket connection
   */
  private async establishConnection(connection: PoolConnection): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(this.config.url);
        connection.websocket = ws;

        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Connection timeout'));
        }, this.connectionTimeout);

        ws.onopen = () => {
          clearTimeout(timeout);
          connection.status = 'connected';
          connection.lastActivity = Date.now();
          connection.errorCount = 0;
          connection.reconnectAttempts = 0;
          
          this.setupWebSocketHandlers(connection);
          resolve();
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          connection.status = 'error';
          connection.errorCount++;
          reject(error);
        };

        ws.onclose = () => {
          clearTimeout(timeout);
          this.handleConnectionClose(connection);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupWebSocketHandlers(connection: PoolConnection) {
    if (!connection.websocket) return;

    connection.websocket.onmessage = (event) => {
      this.handleMessage(connection, event);
    };

    connection.websocket.onerror = (error) => {
      this.handleConnectionError(connection, error);
    };

    connection.websocket.onclose = () => {
      this.handleConnectionClose(connection);
    };

    // Send authentication if API key provided
    if (this.config.apikey) {
      this.sendMessage(connection, {
        type: 'auth',
        apikey: this.config.apikey
      });
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(connection: PoolConnection, event: MessageEvent) {
    connection.lastActivity = Date.now();
    
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'pong':
          connection.lastPing = Date.now();
          break;
          
        case 'subscription_data':
          this.handleSubscriptionData(connection, data);
          break;
          
        case 'error':
          this.handleSubscriptionError(connection, data);
          break;
          
        case 'subscription_confirmed':
          console.log(`Subscription confirmed: ${data.subscription_id}`);
          break;
          
        default:
          console.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }

  /**
   * Handle subscription data
   */
  private handleSubscriptionData(connection: PoolConnection, data: any) {
    const subscription = connection.subscriptions.get(data.subscription_id);
    if (subscription && subscription.onUpdate) {
      try {
        subscription.onUpdate(data.payload);
      } catch (error) {
        console.error('Error in subscription callback:', error);
        if (subscription.onError) {
          subscription.onError(error as Error);
        }
      }
    }
  }

  /**
   * Handle subscription errors
   */
  private handleSubscriptionError(connection: PoolConnection, data: any) {
    const subscription = connection.subscriptions.get(data.subscription_id);
    if (subscription && subscription.onError) {
      subscription.onError(new Error(data.message || 'Subscription error'));
    }
  }

  /**
   * Handle connection errors
   */
  private handleConnectionError(connection: PoolConnection, error: Event) {
    console.error(`Connection ${connection.id} error:`, error);
    connection.status = 'error';
    connection.errorCount++;
    
    // Notify all subscriptions of the error
    connection.subscriptions.forEach(subscription => {
      if (subscription.onError) {
        subscription.onError(new Error('Connection error'));
      }
    });

    // Schedule reconnection if needed
    this.scheduleReconnection(connection);
  }

  /**
   * Handle connection close
   */
  private handleConnectionClose(connection: PoolConnection) {
    console.log(`Connection ${connection.id} closed`);
    connection.status = 'disconnected';
    
    // Update metrics
    this.updateActiveConnectionCount();
    
    // Notify subscriptions
    connection.subscriptions.forEach(subscription => {
      if (subscription.onError) {
        subscription.onError(new Error('Connection closed'));
      }
    });

    // Schedule reconnection if pool is running
    if (this.isRunning) {
      this.scheduleReconnection(connection);
    }
  }

  /**
   * Schedule connection reconnection
   */
  private scheduleReconnection(connection: PoolConnection) {
    if (connection.reconnectAttempts >= (this.config.maxRetries || 5)) {
      console.error(`Max reconnection attempts reached for ${connection.id}`);
      this.removeConnection(connection.id);
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, connection.reconnectAttempts);
    connection.reconnectAttempts++;
    this.metrics.reconnectAttempts++;

    setTimeout(async () => {
      if (this.connections.has(connection.id)) {
        try {
          await this.establishConnection(connection);
          console.log(`Reconnected ${connection.id}`);
          
          // Re-subscribe to existing subscriptions
          this.resubscribeConnection(connection);
        } catch (error) {
          console.error(`Reconnection failed for ${connection.id}:`, error);
          this.scheduleReconnection(connection);
        }
      }
    }, delay);
  }

  /**
   * Re-subscribe all subscriptions for a connection
   */
  private resubscribeConnection(connection: PoolConnection) {
    connection.subscriptions.forEach((subscription, id) => {
      this.sendSubscription(connection, subscription);
    });
  }

  /**
   * Subscribe to real-time updates
   */
  subscribe(request: SubscriptionRequest): () => void {
    // Select best connection using load balancer
    let connection = this.loadBalancer.selectConnection(this.connections);
    
    // Create new connection if needed
    if (!connection || connection.load >= this.maxConnectionLoad) {
      if (this.connections.size < this.maxConnections) {
        // Create new connection asynchronously
        this.createConnection().then(newConnection => {
          this.addSubscriptionToConnection(newConnection, request);
        }).catch(error => {
          console.error('Failed to create new connection:', error);
          // Fallback to existing connection
          if (connection) {
            this.addSubscriptionToConnection(connection, request);
          } else {
            request.onError(new Error('No available connections'));
          }
        });
        
        // For now, use existing connection if available
        if (connection) {
          this.addSubscriptionToConnection(connection, request);
        }
      } else {
        // Use least loaded connection
        connection = this.findLeastLoadedConnection();
        if (connection) {
          this.addSubscriptionToConnection(connection, request);
        } else {
          request.onError(new Error('All connections at capacity'));
        }
      }
    } else {
      this.addSubscriptionToConnection(connection, request);
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(request.id);
    };
  }

  /**
   * Add subscription to specific connection
   */
  private addSubscriptionToConnection(connection: PoolConnection, request: SubscriptionRequest) {
    connection.subscriptions.set(request.id, request);
    connection.load = connection.subscriptions.size;
    this.metrics.totalSubscriptions++;

    // Send subscription message if connected
    if (connection.status === 'connected') {
      this.sendSubscription(connection, request);
    }
  }

  /**
   * Send subscription message
   */
  private sendSubscription(connection: PoolConnection, request: SubscriptionRequest) {
    this.sendMessage(connection, {
      type: 'subscribe',
      subscription_id: request.id,
      table: request.table,
      filter: request.filter || {}
    });
  }

  /**
   * Unsubscribe from updates
   */
  unsubscribe(subscriptionId: string) {
    for (const [connectionId, connection] of this.connections) {
      if (connection.subscriptions.has(subscriptionId)) {
        // Send unsubscribe message
        if (connection.status === 'connected') {
          this.sendMessage(connection, {
            type: 'unsubscribe',
            subscription_id: subscriptionId
          });
        }

        // Remove from connection
        connection.subscriptions.delete(subscriptionId);
        connection.load = connection.subscriptions.size;
        this.metrics.totalSubscriptions--;
        
        // Remove connection if empty and above minimum
        if (connection.load === 0 && this.connections.size > this.minConnections) {
          this.removeConnection(connectionId);
        }
        
        break;
      }
    }
  }

  /**
   * Send message to connection
   */
  private sendMessage(connection: PoolConnection, message: any) {
    if (connection.websocket && connection.status === 'connected') {
      try {
        connection.websocket.send(JSON.stringify(message));
        connection.lastActivity = Date.now();
      } catch (error) {
        console.error('Error sending message:', error);
        this.handleConnectionError(connection, error as Event);
      }
    }
  }

  /**
   * Find least loaded connection
   */
  private findLeastLoadedConnection(): PoolConnection | null {
    let leastLoaded: PoolConnection | null = null;
    let minLoad = Infinity;

    for (const connection of this.connections.values()) {
      if (connection.status === 'connected' && connection.load < minLoad) {
        minLoad = connection.load;
        leastLoaded = connection;
      }
    }

    return leastLoaded;
  }

  /**
   * Remove connection from pool
   */
  private removeConnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Close WebSocket
    if (connection.websocket) {
      connection.websocket.close();
    }

    // Remove from pool
    this.connections.delete(connectionId);
    this.updateActiveConnectionCount();

    console.log(`Removed connection ${connectionId} from pool`);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring() {
    setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);
  }

  /**
   * Perform health check on all connections
   */
  private performHealthCheck() {
    const now = Date.now();

    this.connections.forEach((connection, id) => {
      // Check if connection is stale
      if (now - connection.lastActivity > this.connectionTimeout) {
        console.warn(`Connection ${id} appears stale, reconnecting`);
        this.scheduleReconnection(connection);
        return;
      }

      // Send ping if connected
      if (connection.status === 'connected') {
        this.sendMessage(connection, { type: 'ping' });
      }
    });

    // Scale pool based on load
    this.scalePool();
  }

  /**
   * Scale pool up or down based on current load
   */
  private scalePool() {
    const activeConnections = Array.from(this.connections.values())
      .filter(c => c.status === 'connected');

    const totalLoad = activeConnections.reduce((sum, c) => sum + c.load, 0);
    const avgLoad = activeConnections.length > 0 ? totalLoad / activeConnections.length : 0;

    // Scale up if average load is high
    if (avgLoad > this.targetConnectionLoad && this.connections.size < this.maxConnections) {
      console.log(`Scaling up: avg load ${avgLoad} > target ${this.targetConnectionLoad}`);
      this.createConnection().catch(error => {
        console.error('Failed to scale up:', error);
      });
    }

    // Scale down if we have too many idle connections
    if (avgLoad < this.targetConnectionLoad / 2 && this.connections.size > this.minConnections) {
      const idleConnection = activeConnections
        .filter(c => c.load === 0)
        .sort((a, b) => a.createdAt - b.createdAt)[0]; // Oldest idle connection

      if (idleConnection) {
        console.log(`Scaling down: removing idle connection ${idleConnection.id}`);
        this.removeConnection(idleConnection.id);
      }
    }
  }

  /**
   * Update active connection count
   */
  private updateActiveConnectionCount() {
    this.metrics.activeConnections = Array.from(this.connections.values())
      .filter(c => c.status === 'connected').length;
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get pool metrics
   */
  getMetrics() {
    this.updateActiveConnectionCount();
    return { ...this.metrics };
  }

  /**
   * Get detailed pool status
   */
  getStatus() {
    const connections = Array.from(this.connections.values()).map(conn => ({
      id: conn.id,
      status: conn.status,
      load: conn.load,
      errorCount: conn.errorCount,
      lastActivity: conn.lastActivity,
      uptime: Date.now() - conn.createdAt
    }));

    return {
      isRunning: this.isRunning,
      connections,
      metrics: this.getMetrics()
    };
  }

  /**
   * Shutdown pool
   */
  shutdown() {
    this.isRunning = false;
    
    this.connections.forEach((connection, id) => {
      this.removeConnection(id);
    });

    console.log('Connection pool shutdown complete');
  }
}

// Load balancing strategies
class RoundRobinBalancer implements LoadBalancingStrategy {
  private currentIndex = 0;

  selectConnection(connections: Map<string, PoolConnection>): PoolConnection | null {
    const connArray = Array.from(connections.values())
      .filter(c => c.status === 'connected');
    
    if (connArray.length === 0) return null;

    const connection = connArray[this.currentIndex % connArray.length];
    this.currentIndex++;
    
    return connection;
  }
}

class LeastLoadedBalancer implements LoadBalancingStrategy {
  selectConnection(connections: Map<string, PoolConnection>): PoolConnection | null {
    let leastLoaded: PoolConnection | null = null;
    let minLoad = Infinity;

    for (const connection of connections.values()) {
      if (connection.status === 'connected' && connection.load < minLoad) {
        minLoad = connection.load;
        leastLoaded = connection;
      }
    }

    return leastLoaded;
  }
}

// Export singleton instance and factory
export const createConnectionPool = (config: ConnectionConfig) => {
  return new ConnectionPool(config);
};

export { ConnectionPool, RoundRobinBalancer, LeastLoadedBalancer };
