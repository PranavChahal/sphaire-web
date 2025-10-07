-- AI Query and Error Logging System
-- This tracks all AI modeling requests, questions, answers, generated code, and errors

-- ============================================
-- AI Query Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS ai_query_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- User Information
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  user_name TEXT,
  
  -- Request Information
  prompt TEXT NOT NULL,
  backend TEXT DEFAULT 'opencascade',
  complexity TEXT DEFAULT 'complex',
  
  -- Questions & Answers (if questioning flow was used)
  questions_asked JSONB, -- Array of question objects
  user_answers JSONB,    -- Object mapping question IDs to answers
  skip_questions BOOLEAN DEFAULT false,
  
  -- Generation Details
  generated_code TEXT,   -- The OpenCascade code generated
  code_language TEXT DEFAULT 'javascript',
  
  -- Meta-Functions (if used)
  used_meta_functions BOOLEAN DEFAULT false,
  meta_functions JSONB, -- Array of generated helper functions
  
  -- Research Mode (if used)
  used_research_mode BOOLEAN DEFAULT false,
  research_iterations INTEGER,
  
  -- Success/Failure
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'partial')),
  error_message TEXT,
  error_details JSONB,
  
  -- Performance Metrics
  generation_time_ms INTEGER,
  execution_time_ms INTEGER,
  total_time_ms INTEGER,
  
  -- Results
  mesh_created BOOLEAN DEFAULT false,
  vertex_count INTEGER,
  triangle_count INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  session_id TEXT,
  user_agent TEXT,
  ip_address INET
);

-- ============================================
-- AI Error Logs Table
-- ============================================
CREATE TABLE IF NOT EXISTS ai_error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Link to query log (if applicable)
  query_log_id UUID REFERENCES ai_query_logs(id) ON DELETE SET NULL,
  
  -- User Information
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  
  -- Error Information
  error_type TEXT NOT NULL, -- 'generation', 'execution', 'api', 'validation', etc.
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_code TEXT,
  
  -- Context
  prompt TEXT,
  generated_code TEXT,
  stage TEXT, -- 'questioning', 'generation', 'execution', 'rendering'
  
  -- Additional Details
  error_details JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  session_id TEXT,
  user_agent TEXT,
  browser_info JSONB
);

-- ============================================
-- Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ai_query_logs_user_id ON ai_query_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_query_logs_created_at ON ai_query_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_query_logs_status ON ai_query_logs(status);
CREATE INDEX IF NOT EXISTS idx_ai_query_logs_user_email ON ai_query_logs(user_email);

CREATE INDEX IF NOT EXISTS idx_ai_error_logs_user_id ON ai_error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_error_logs_query_log_id ON ai_error_logs(query_log_id);
CREATE INDEX IF NOT EXISTS idx_ai_error_logs_error_type ON ai_error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_ai_error_logs_created_at ON ai_error_logs(created_at DESC);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE ai_query_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_error_logs ENABLE ROW LEVEL SECURITY;

-- Users can only view their own logs
CREATE POLICY "Users can view own query logs"
  ON ai_query_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own query logs"
  ON ai_query_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own error logs"
  ON ai_error_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own error logs"
  ON ai_error_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin can view all logs (create admin role if needed)
-- CREATE POLICY "Admins can view all logs" ON ai_query_logs FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================
-- Helper Functions
-- ============================================

-- Function to get user stats
CREATE OR REPLACE FUNCTION get_user_ai_stats(user_uuid UUID)
RETURNS TABLE (
  total_queries BIGINT,
  successful_queries BIGINT,
  failed_queries BIGINT,
  total_errors BIGINT,
  avg_generation_time_ms NUMERIC,
  most_used_backend TEXT,
  total_meshes_created BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_queries,
    COUNT(*) FILTER (WHERE status = 'success')::BIGINT as successful_queries,
    COUNT(*) FILTER (WHERE status = 'error')::BIGINT as failed_queries,
    (SELECT COUNT(*)::BIGINT FROM ai_error_logs WHERE ai_error_logs.user_id = user_uuid) as total_errors,
    AVG(generation_time_ms)::NUMERIC as avg_generation_time_ms,
    MODE() WITHIN GROUP (ORDER BY backend) as most_used_backend,
    COUNT(*) FILTER (WHERE mesh_created = true)::BIGINT as total_meshes_created
  FROM ai_query_logs
  WHERE ai_query_logs.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Sample Query to View Logs
-- ============================================

-- View recent queries with user info
COMMENT ON TABLE ai_query_logs IS 'Tracks all AI modeling queries with full context including questions, answers, and generated code';
COMMENT ON TABLE ai_error_logs IS 'Tracks all errors during AI modeling process for debugging and analytics';

-- Grant access to authenticated users
GRANT SELECT, INSERT ON ai_query_logs TO authenticated;
GRANT SELECT, INSERT ON ai_error_logs TO authenticated;
