/**
 * AI Logging Service
 * Console-only logging (Supabase removed)
 */

export interface AIQueryLog {
  // User Information
  user_id?: string;
  user_email?: string;
  user_name?: string;
  
  // Request Information
  prompt: string;
  backend?: string;
  complexity?: string;
  
  // Questions & Answers
  questions_asked?: any[];
  user_answers?: Record<string, string>;
  skip_questions?: boolean;
  
  // Generation Details
  generated_code?: string;
  code_language?: string;
  
  // Meta-Functions
  used_meta_functions?: boolean;
  meta_functions?: any[];
  
  // Research Mode
  used_research_mode?: boolean;
  research_iterations?: number;
  
  // Success/Failure
  status: 'success' | 'error' | 'partial';
  error_message?: string;
  error_details?: any;
  
  // Performance Metrics
  generation_time_ms?: number;
  execution_time_ms?: number;
  total_time_ms?: number;
  
  // Results
  mesh_created?: boolean;
  vertex_count?: number;
  triangle_count?: number;
  
  // Metadata
  session_id?: string;
  user_agent?: string;
  ip_address?: string;
}

export interface AIErrorLog {
  // Link to query log
  query_log_id?: string;
  
  // User Information
  user_id?: string;
  user_email?: string;
  
  // Error Information
  error_type: string;
  error_message: string;
  error_stack?: string;
  error_code?: string;
  
  // Context
  prompt?: string;
  generated_code?: string;
  stage?: string;
  
  // Additional Details
  error_details?: any;
  
  // Metadata
  session_id?: string;
  user_agent?: string;
  browser_info?: any;
}

class AILoggerService {
  private sessionId: string;
  
  constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
  
  /**
   * Log an AI query (console only)
   */
  async logQuery(logData: Partial<AIQueryLog>): Promise<string | null> {
    const logId = `log_${Date.now()}`;
    console.log('[AI-LOGGER] Query:', {
      id: logId,
      prompt: logData.prompt?.substring(0, 50),
      status: logData.status,
      session: this.sessionId
    });
    return logId;
  }
  
  /**
   * Log an error (console only)
   */
  async logError(errorData: Partial<AIErrorLog>): Promise<void> {
    console.error('[AI-LOGGER] Error:', {
      error_type: errorData.error_type,
      error_message: errorData.error_message?.substring(0, 100),
      session: this.sessionId
    });
  }
  
  /**
   * Create a query logger that tracks timing
   */
  createQueryLogger(prompt: string) {
    const startTime = Date.now();
    let generationStartTime: number | null = null;
    let executionStartTime: number | null = null;
    const self = this;
    
    return {
      startGeneration() {
        generationStartTime = Date.now();
      },
      
      startExecution() {
        executionStartTime = Date.now();
      },
      
      async logSuccess(data: Partial<AIQueryLog>): Promise<string | null> {
        const totalTime = Date.now() - startTime;
        const generationTime = generationStartTime ? Date.now() - generationStartTime : undefined;
        const executionTime = executionStartTime ? Date.now() - executionStartTime : undefined;
        
        return await self.logQuery({
          prompt,
          status: 'success',
          generation_time_ms: generationTime,
          execution_time_ms: executionTime,
          total_time_ms: totalTime,
          ...data
        });
      },
      
      async logFailure(error: Error, data: Partial<AIQueryLog> = {}): Promise<string | null> {
        const totalTime = Date.now() - startTime;
        const generationTime = generationStartTime ? Date.now() - generationStartTime : undefined;
        
        const queryLogId = await self.logQuery({
          prompt,
          status: 'error',
          error_message: error.message,
          error_details: { name: error.name, stack: error.stack },
          generation_time_ms: generationTime,
          total_time_ms: totalTime,
          ...data
        });
        
        await self.logError({
          query_log_id: queryLogId || undefined,
          error_type: 'generation',
          error_message: error.message,
          error_stack: error.stack,
          prompt: prompt,
          ...data
        });
        
        return queryLogId;
      }
    };
  }
  
  /**
   * Get user statistics (no-op without Supabase)
   */
  async getUserStats() {
    return null;
  }
  
  /**
   * Get recent query logs (no-op without Supabase)
   */
  async getRecentQueries(limit: number = 10) {
    return [];
  }
  
  /**
   * Get recent errors (no-op without Supabase)
   */
  async getRecentErrors(limit: number = 10) {
    return [];
  }
}

// Export singleton instance
export const aiLogger = new AILoggerService();
