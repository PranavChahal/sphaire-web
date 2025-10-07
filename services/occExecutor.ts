export interface OCCTExecutionResult {
  success: boolean;
  geometry?: any[];
  meshData?: any;
  message?: string;
  error?: string;
}

export class OpenCascadeExecutor {
  private worker: Worker | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    console.log('OpenCascade: Executor instance created');
  }

  async initializeWorker(): Promise<void> {
    if (this.isInitialized) {
      console.log('OpenCascade: Worker already initialized');
      return;
    }

    if (this.isInitializing && this.initializationPromise) {
      console.log('OpenCascade: Worker initialization in progress, waiting...');
      return this.initializationPromise;
    }

    this.isInitializing = true;
    
    this.initializationPromise = new Promise((resolve, reject) => {
      try {
        console.log('OpenCascade: Initializing worker with Next.js compatibility...');
        
        this.worker = new Worker(
          new URL('../workers/occt.worker.ts', import.meta.url)
        );
        
        const handleWorkerReady = (e: MessageEvent) => {
          if (e.data.type === 'worker-ready') {
            this.worker?.removeEventListener('message', handleWorkerReady);
            
            if (e.data.success) {
              this.isInitialized = true;
              this.isInitializing = false;
              console.log('OpenCascade: Worker initialized successfully');
              resolve();
            } else {
              this.isInitializing = false;
              console.error('OpenCascade: Worker initialization failed:', e.data.error);
              reject(new Error(e.data.error || 'Worker initialization failed'));
            }
          }
        };

        this.worker.addEventListener('message', handleWorkerReady);
        
        this.worker.onerror = (error) => {
          this.isInitializing = false;
          console.error('OpenCascade: Worker error:', error);
          reject(new Error(`Worker error: ${error.message}`));
        };
        
        setTimeout(() => {
          if (this.isInitializing) {
            this.isInitializing = false;
            this.worker?.removeEventListener('message', handleWorkerReady);
            reject(new Error('OpenCascade worker initialization timeout'));
          }
        }, 30000);
        
      } catch (error) {
        this.isInitializing = false;
        console.error('OpenCascade: Worker initialization setup failed:', error);
        reject(error);
      }
    });

    return this.initializationPromise;
  }

  async executeCode(code: string): Promise<OCCTExecutionResult> {
    try {
      console.log('OpenCascade: Starting code execution...');
      
      if (!this.worker || !this.isInitialized) {
        console.log('OpenCascade: Worker not ready, initializing...');
        await this.initializeWorker();
      }

      if (!this.worker || !this.isInitialized) {
        throw new Error('OpenCascade worker failed to initialize');
      }

      return new Promise((resolve) => {
        const executionId = Math.random().toString(36).substr(2, 9);
        console.log(`OpenCascade: Executing code with ID ${executionId}`);
        
        const handleExecutionResult = (e: MessageEvent) => {
          if (e.data.type === 'execution-result' && e.data.id === executionId) {
            this.worker?.removeEventListener('message', handleExecutionResult);
            
            if (e.data.success) {
              console.log('OpenCascade: Code execution successful');
              resolve(e.data.result);
            } else {
              console.error('OpenCascade: Code execution failed:', e.data.error);
              resolve({
                success: false,
                error: e.data.error || 'Code execution failed'
              });
            }
          }
        };

        this.worker?.addEventListener('message', handleExecutionResult);
        
        this.worker?.postMessage({ 
          type: 'execute-code',
          code, 
          id: executionId 
        });
        
        setTimeout(() => {
          this.worker?.removeEventListener('message', handleExecutionResult);
          resolve({
            success: false,
            error: 'OpenCascade execution timeout (60s)'
          });
        }, 60000);
      });
      
    } catch (error) {
      console.error('OpenCascade: Execution setup failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown execution error'
      };
    }
  }

  terminate(): void {
    if (this.worker) {
      console.log('OpenCascade: Terminating worker');
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      this.isInitializing = false;
      this.initializationPromise = null;
    }
  }

  getStatus(): { initialized: boolean; initializing: boolean } {
    return {
      initialized: this.isInitialized,
      initializing: this.isInitializing
    };
  }
}

export const occExecutor = new OpenCascadeExecutor();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    occExecutor.terminate();
  });
}
