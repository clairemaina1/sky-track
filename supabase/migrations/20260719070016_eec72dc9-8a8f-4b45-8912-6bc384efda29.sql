
-- ============================================================
-- 1. SECURITY: revoke anon/public EXECUTE on trigger SECURITY DEFINER fns
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.enroll_pending_user() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_super_admin_if_owner() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_creator_or_last_admin_demotion() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_creator_or_last_admin_removal() FROM anon, PUBLIC;
-- handle_new_user is already locked; leave triggers untouched.

-- ============================================================
-- 2. REALTIME: reassert strict org-scoped policies with WITH CHECK
-- ============================================================
DROP POLICY IF EXISTS "org scoped realtime read" ON realtime.messages;
DROP POLICY IF EXISTS "org scoped realtime write" ON realtime.messages;

CREATE POLICY "org scoped realtime read"
  ON realtime.messages FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR (
      public.realtime_topic_org_id(realtime.topic()) IS NOT NULL
      AND public.user_in_org(auth.uid(), public.realtime_topic_org_id(realtime.topic()))
    )
  );

CREATE POLICY "org scoped realtime write"
  ON realtime.messages FOR INSERT
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR (
      public.realtime_topic_org_id(realtime.topic()) IS NOT NULL
      AND public.user_in_org(auth.uid(), public.realtime_topic_org_id(realtime.topic()))
    )
  );

-- ============================================================
-- 3. CREW CREDENTIALS: instant-clearance credential vault
-- ============================================================
CREATE TABLE IF NOT EXISTS public.crew_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id uuid NOT NULL REFERENCES public.crew(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  credential_type text NOT NULL, -- 'medical', 'license', 'type_rating', 'sim_check', 'visa', 'route_qual'
  reference text,                 -- cert number / route code
  issued_on date,
  expires_on date NOT NULL,
  issuing_authority text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crew_credentials TO authenticated;
GRANT ALL ON public.crew_credentials TO service_role;

ALTER TABLE public.crew_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read credentials"
  ON public.crew_credentials FOR SELECT
  USING (public.is_super_admin(auth.uid()) OR public.user_in_org(auth.uid(), org_id));

CREATE POLICY "Admins manage credentials"
  ON public.crew_credentials FOR ALL
  USING (
    public.is_super_admin(auth.uid())
    OR public.user_has_org_role(auth.uid(), org_id, 'admin')
    OR public.user_has_org_role(auth.uid(), org_id, 'dispatcher')
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.user_has_org_role(auth.uid(), org_id, 'admin')
    OR public.user_has_org_role(auth.uid(), org_id, 'dispatcher')
  );

CREATE TRIGGER touch_crew_credentials
  BEFORE UPDATE ON public.crew_credentials
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_crew_credentials_expiry
  ON public.crew_credentials(org_id, expires_on);

-- Helper: is a crew member fully cleared (nothing expiring in the next N days)?
CREATE OR REPLACE FUNCTION public.crew_is_clear(_crew_id uuid, _days int DEFAULT 7)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.crew_credentials
    WHERE crew_id = _crew_id
      AND expires_on <= (current_date + (_days || ' days')::interval)::date
  )
$$;

REVOKE EXECUTE ON FUNCTION public.crew_is_clear(uuid, int) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.crew_is_clear(uuid, int) TO authenticated;

-- ============================================================
-- 4. CREW ASSIGNMENTS: dual-layer bid-offer engine
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.crew_layer AS ENUM ('cabin', 'pilot');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.assignment_status AS ENUM
    ('offered','accepted','declined','expired','cascaded','locked','auto_assigned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.crew_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  flight_id uuid NOT NULL REFERENCES public.flights(id) ON DELETE CASCADE,
  crew_id uuid NOT NULL REFERENCES public.crew(id) ON DELETE CASCADE,
  layer public.crew_layer NOT NULL,
  status public.assignment_status NOT NULL DEFAULT 'offered',
  rank int NOT NULL DEFAULT 1,        -- pilot rank 1..3 for bid queue
  offered_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz,             -- 15-min countdown for pilots
  reason text,                        -- scoring rationale
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crew_assignments TO authenticated;
GRANT ALL ON public.crew_assignments TO service_role;

ALTER TABLE public.crew_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read assignments"
  ON public.crew_assignments FOR SELECT
  USING (public.is_super_admin(auth.uid()) OR public.user_in_org(auth.uid(), org_id));

CREATE POLICY "Dispatchers manage assignments"
  ON public.crew_assignments FOR ALL
  USING (
    public.is_super_admin(auth.uid())
    OR public.user_has_org_role(auth.uid(), org_id, 'admin')
    OR public.user_has_org_role(auth.uid(), org_id, 'dispatcher')
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.user_has_org_role(auth.uid(), org_id, 'admin')
    OR public.user_has_org_role(auth.uid(), org_id, 'dispatcher')
  );

CREATE TRIGGER touch_crew_assignments
  BEFORE UPDATE ON public.crew_assignments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_crew_assignments_flight
  ON public.crew_assignments(flight_id, layer, status);

-- ============================================================
-- 5. INTEGRATIONS registry (ACARS / SITA / AMOS / ICAO status board)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,       -- 'ACARS','SITA','AMOS','ICAO','ACARS_OOOI'
  status text NOT NULL DEFAULT 'disconnected', -- 'connected','pending','disconnected','error'
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, provider)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrations TO authenticated;
GRANT ALL ON public.integrations TO service_role;

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read integrations"
  ON public.integrations FOR SELECT
  USING (public.is_super_admin(auth.uid()) OR public.user_in_org(auth.uid(), org_id));

CREATE POLICY "Admins manage integrations"
  ON public.integrations FOR ALL
  USING (
    public.is_super_admin(auth.uid())
    OR public.user_has_org_role(auth.uid(), org_id, 'admin')
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.user_has_org_role(auth.uid(), org_id, 'admin')
  );

CREATE TRIGGER touch_integrations
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
