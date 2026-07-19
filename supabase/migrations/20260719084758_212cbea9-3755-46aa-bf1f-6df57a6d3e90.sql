
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS accent_color text,
  ADD COLUMN IF NOT EXISTS subdomain text UNIQUE;

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  entity text,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip inet,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members can read audit log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (org_id IS NULL OR public.user_in_org(auth.uid(), org_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "authenticated can insert audit rows for their org"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (org_id IS NULL OR public.user_in_org(auth.uid(), org_id)));
CREATE INDEX IF NOT EXISTS audit_log_org_created_idx ON public.audit_log(org_id, created_at DESC);
