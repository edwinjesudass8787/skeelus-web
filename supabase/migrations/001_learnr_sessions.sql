-- Skeelus Sessions Table
-- Stores user learning sessions with curriculum and progress

CREATE TABLE IF NOT EXISTS public.learnr_sessions (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  curriculum JSONB NOT NULL DEFAULT '{}',
  current_stage INTEGER NOT NULL DEFAULT 1,
  stage_progress JSONB NOT NULL DEFAULT '[]',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  messages JSONB NOT NULL DEFAULT '[]',
  video_presentation JSONB,
  video_evaluation JSONB,
  video_attempts JSONB DEFAULT '[]',
  case_study_presentation JSONB,
  case_study_evaluation JSONB,
  action_plan_draft JSONB,
  payment_status TEXT DEFAULT 'unpaid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.learnr_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own sessions"
  ON public.learnr_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON public.learnr_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON public.learnr_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON public.learnr_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.learnr_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON public.learnr_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_last_accessed ON public.learnr_sessions(last_accessed_at DESC);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.learnr_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();