/**
 * Worker Manager
 * Manages Web Workers for image processing operations
 * Provides type-safe interfaces and handles worker lifecycle
 */

import { MessageType, WorkerMessage, WorkerResponse } from '../types';

// ============================================================================
// Types
// ============================================================================

interface WorkerConfig {
  workerPath: string;
  autoInit?: boolean;
}

interface WorkerInstance {
  worker: Worker;
  initialized: boolean;
  pendingMessages: Map<string, {
    resolve: (response: WorkerResponse) => void;
    reject: (error: Error) => void;
    timeout: number;
  }>;
}

// ============================================================================
// Worker Manager Class
// ============================================================================

export class WorkerManager {
  private workerInstance: WorkerInstance | null = null;
  private config: WorkerConfig;
  private messageTimeout = 30000; // 30 seconds

  constructor(config: WorkerConfig) {
    this.config = {
      ...config,
      autoInit: config.autoInit ?? true,
    };
  }

  /**
   * Initialize the worker
   */
  async init(): Promise<void> {
    if (this.workerInstance?.initialized) {
      return;
    }

    try {
      const worker = new Worker(new URL(this.config.workerPath, import.meta.url), {
        type: 'module',
      });

      this.workerInstance = {
        worker,
        initialized: false,
        pendingMessages: new Map(),
      };

      // Set up message handler
      worker.onmessage = this.handleMessage.bind(this);
      worker.onerror = this.handleError.bind(this);

      // Initialize worker
      if (this.config.autoInit) {
        await this.sendMessage({
          id: this.generateId(),
          type: MessageType.INIT_WORKER,
          payload: {},
          timestamp: Date.now(),
        });

        this.workerInstance.initialized = true;
      }
    } catch (error) {
      throw new Error(`Failed to initialize worker: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send a message to the worker and wait for response
   */
  async sendMessage<T = any>(message: WorkerMessage): Promise<WorkerResponse<T>> {
    if (!this.workerInstance) {
      await this.init();
    }

    return new Promise<WorkerResponse<T>>((resolve, reject) => {
      // Use window.setTimeout for browser environment to avoid NodeJS.Timeout type
      const timeout = window.setTimeout(() => {
        this.workerInstance!.pendingMessages.delete(message.id);
        reject(new Error(`Worker message timeout: ${message.type}`));
      }, this.messageTimeout);

      this.workerInstance!.pendingMessages.set(message.id, {
        resolve: resolve as (response: WorkerResponse) => void,
        reject,
        timeout,
      });

      this.workerInstance!.worker.postMessage(message);
    });
  }

  /**
   * Handle incoming messages from worker
   */
  private handleMessage(event: MessageEvent<WorkerResponse>): void {
    const response = event.data;
    const pending = this.workerInstance?.pendingMessages.get(response.id);

    if (pending) {
      clearTimeout(pending.timeout);
      this.workerInstance!.pendingMessages.delete(response.id);

      if (response.success) {
        pending.resolve(response);
      } else {
        pending.reject(new Error(response.error || 'Worker operation failed'));
      }
    }
  }

  /**
   * Handle worker errors
   */
  private handleError(error: ErrorEvent): void {
    console.error('Worker error:', error);
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    if (this.workerInstance) {
      // Clear all pending messages
      for (const [id, pending] of this.workerInstance.pendingMessages) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Worker terminated'));
      }

      // Terminate worker
      this.workerInstance.worker.terminate();
      this.workerInstance = null;
    }
  }

  /**
   * Generate unique message ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.sendMessage({
        id: this.generateId(),
        type: MessageType.HEALTH_CHECK,
        payload: {},
        timestamp: Date.now(),
      });
      return response.success;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Worker Manager Factory
// ============================================================================

const workerManagers = new Map<string, WorkerManager>();

/**
 * Get or create a worker manager
 */
export function getWorkerManager(key: string, config: WorkerConfig): WorkerManager {
  if (!workerManagers.has(key)) {
    const manager = new WorkerManager(config);
    workerManagers.set(key, manager);
  }
  return workerManagers.get(key)!;
}

/**
 * Cleanup all workers
 */
export function cleanupAllWorkers(): void {
  for (const manager of workerManagers.values()) {
    manager.terminate();
  }
  workerManagers.clear();
}

// ============================================================================
// Specific Worker Managers
// ============================================================================

/**
 * Get core worker (crop, rotate, flip, resize)
 */
export function getCoreWorker(): WorkerManager {
  return getWorkerManager('core', {
    workerPath: '../workers/coreWorker.ts',
    autoInit: true,
  });
}

/**
 * Get compress worker (JPEG, WebP compression)
 */
export function getCompressWorker(): WorkerManager {
  return getWorkerManager('compress', {
    workerPath: '../workers/compressWorker.ts',
    autoInit: true,
  });
}

/**
 * Get bgremove worker (background removal)
 */
export function getBgRemoveWorker(): WorkerManager {
  return getWorkerManager('bgremove', {
    workerPath: '../workers/bgremoveWorker.ts',
    autoInit: true,
  });
}
