
-- Product variants per tenant
DO $$ BEGIN
  CREATE TYPE public.product_profile AS ENUM (
    'airline_ops',        -- KQ-style narrow/regional
    'widebody_intl',      -- Emirates-style long-haul
    'regulator',          -- KCAA-style oversight
    'flight_school',
    'cargo_ops',
    'generic'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS product_profile public.product_profile NOT NULL DEFAULT 'generic';

-- Support ticketing
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members see their org tickets" ON public.support_tickets
  FOR SELECT USING (
    (org_id IS NOT NULL AND user_in_org(auth.uid(), org_id))
    OR user_id = auth.uid()
    OR is_super_admin(auth.uid())
  );
CREATE POLICY "members open tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND (org_id IS NULL OR user_in_org(auth.uid(), org_id))
  );
CREATE POLICY "owners and super admin update tickets" ON public.support_tickets
  FOR UPDATE USING (
    user_id = auth.uid() OR is_super_admin(auth.uid())
  ) WITH CHECK (
    user_id = auth.uid() OR is_super_admin(auth.uid())
  );

CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_support_tickets_org ON public.support_tickets(org_id, status);
