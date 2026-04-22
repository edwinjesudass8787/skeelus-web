-- Skeelus Portfolios Table
-- Stores completed learning portfolios/certificates

CREATE TABLE IF NOT EXISTS public.learnr_portfolios (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_id TEXT NOT NULL UNIQUE,
  topic TEXT NOT NULL,
  certificate_id TEXT NOT NULL UNIQUE,
  curriculum JSONB NOT NULL DEFAULT '{}',
  reflections TEXT,
  evidence JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  html TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.learnr_portfolios ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own portfolios"
  ON public.learnr_portfolios
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own portfolios"
  ON public.learnr_portfolios
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolios"
  ON public.learnr_portfolios
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolios"
  ON public.learnr_portfolios
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON public.learnr_portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_portfolio_id ON public.learnr_portfolios(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_certificate_id ON public.learnr_portfolios(certificate_id);

-- Updated at trigger
CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON public.learnr_portfolios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();