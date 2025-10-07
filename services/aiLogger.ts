/**
 * AI Logging Service
 * Tracks all AI modeling queries, questions/answers, generated code, and errors
 * Integrates with Supabase for persistent storage
 */

import { supabase } from '../lib/supabase';

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
    // Generate session ID once per page load
    this.sessionId = this.generateSessionId();
  }
  
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
  
  private async getUserInfo() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return {
        user_id: user?.id,
        user_email: user?.email,
        user_name: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0]
      };
    } catch (error) {
      console.error('Failed to get user info:', error);
      return {};
    }
  }
  
  private getUserAgent(): string {
    if (typeof window !== 'undefined') {
      return window.navigator.userAgent;
    }
    return 'unknown';
  }
  
  private getBrowserInfo(): any {
    if (typeof window !== 'undefined') {
      return {
        userAgent: window.navigator.userAgent,
        language: window.navigator.language,
        platform: window.navigator.platform,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`
      };
    }
    return {};
  }
  
  /**
   * Log an AI query with full context
   */
  async logQuery(logData: Partial<AIQueryLog>): Promise<string | null> {
    try {
      const userInfo = await this.getUserInfo();
      
      const fullLog: any = {
        ...userInfo,
        ...logData,
        session_id: this.sessionId,
        user_agent: this.getUserAgent(),
        completed_at: new Date().toISOString()
      };
      
      console.log('[AI-LOGGER] Logging query:', {
        user: userInfo.user_email,
        prompt: logData.prompt?.substring(0, 50),
        status: logData.status
      });
      
      const { data, error } = await supabase
        .from('ai_query_logs')
        .insert(fullLog)
        .select('id')
        .single();
      
      if (error) {
        console.error('[AI-LOGGER] Failed to log query:', error);
        return null;
      }
      
      console.log('[AI-LOGGER] Query logged with ID:', data.id);
      return data.id;
      
    } catch (error) {
      console.error('[AI-LOGGER] Exception logging query:', error);
      return null;
    }
  }
  
  /**
   * Log an error
   */
  async logError(errorData: Partial<AIErrorLog>): Promise<void> {
    try {
      const userInfo = await this.getUserInfo();
      
      const fullLog: any = {
        ...userInfo,
        ...errorData,
        session_id: this.sessionId,
        user_agent: this.getUserAgent(),
        browser_info: this.getBrowserInfo()
      };
      
      console.log('[AI-LOGGER] Logging error:', {
        user: userInfo.user_email,
        error_type: errorData.error_type,
        error_message: errorData.error_message?.substring(0, 100)
      });
      
      const { error } = await supabase
        .from('ai_error_logs')
        .insert(fullLog);
      
      if (error) {
        console.error('[AI-LOGGER] Failed to log error:', error);
      } else {
        console.log('[AI-LOGGER] Error logged');
      }
      
    } catch (error) {
      console.error('[AI-LOGGER] Exception logging error:', error);
    }
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
      // Mark generation start
      startGeneration() {
        generationStartTime = Date.now();
      },
      
      // Mark execution start
      startExecution() {
        executionStartTime = Date.now();
      },
      
      // Log successful query
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
      
      // Log failed query
      async logFailure(error: Error, data: Partial<AIQueryLog> = {}): Promise<string | null> {
        const totalTime = Date.now() - startTime;
        const generationTime = generationStartTime ? Date.now() - generationStartTime : undefined;
        
        const queryLogId: string | null = await self.logQuery({
          prompt,
          status: 'error',
          error_message: error.message,
          error_details: {
            name: error.name,
            stack: error.stack
          },
          generation_time_ms: generationTime,
          total_time_ms: totalTime,
          ...data
        });
        
        // Also log to error table
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
   * Get user statistics
   */
  async getUserStats() {
    try {
      const { data, error } = await supabase
        .rpc('get_user_ai_stats', { user_uuid: (await supabase.auth.getUser()).data.user?.id });
      
      if (error) {
        console.error('Failed to get user stats:', error);
        return null;
      }
      
      return data[0];
    } catch (error) {
      console.error('Exception getting user stats:', error);
      return null;
    }
  }
  
  /**
   * Get recent query logs for current user
   */
  async getRecentQueries(limit: number = 10) {
    try {
      const { data, error } = await supabase
        .from('ai_query_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Failed to get recent queries:', error);
        return [];
      }
      
      return data;
    } catch (error) {
      console.error('Exception getting recent queries:', error);
      return [];
    }
  }
  
  /**
   * Get recent errors for current user
   */
  async getRecentErrors(limit: number = 10) {
    try {
      const { data, error } = await supabase
        .from('ai_error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Failed to get recent errors:', error);
        return [];
      }
      
      return data;
    } catch (error) {
      console.error('Exception getting recent errors:', error);
      return [];
    }
  }
}

// Export singleton instance
export const aiLogger = new AILoggerService();
