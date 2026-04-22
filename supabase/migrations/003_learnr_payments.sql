-- Skeelus Payments Table
-- Tracks Stripe payment status for sessions

CREATE TABLE IF NOT EXISTS public.learnr_payments (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'pending', 'paid', 'failed')),
  amount_cents INTEGER NOT NULL DEFAULT 2990,
  currency TEXT NOT NULL DEFAULT 'USD',
  receipt_url TEXT,
  paid_at TIMESTAMPTZ,
  stripe_checkout_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (id),
  UNIQUE (session_id)
);

-- Enable RLS
ALTER TABLE public.learnr_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own payments"
  ON public.learnr_payments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payments"
  ON public.learnr_payments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments"
  ON public.learnr_payments
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.learnr_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_session_id ON public.learnr_payments(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.learnr_payments(status);

-- Updated at trigger
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.learnr_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();