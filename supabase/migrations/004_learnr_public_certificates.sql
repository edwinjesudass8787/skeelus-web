-- Skeelus Public Certificates View
-- Allows public verification of certificates without authentication

CREATE OR REPLACE VIEW public.learnr_public_certificates AS
SELECT
  p.user_id,
  p.topic,
  p.certificate_id,
  p.curriculum,
  p.reflections,
  p.completed_at,
  p.created_at
FROM public.learnr_portfolios p
WHERE p.certificate_id IS NOT NULL;

-- Grant public read access (no insert/update/delete)
GRANT SELECT ON public.learnr_public_certificates TO PUBLIC;