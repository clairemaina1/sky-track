
-- 1. organizations table
CREATE TYPE public.org_tier AS ENUM ('commercial', 'flight_school');

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tier public.org_tier NOT NULL DEFAULT 'commercial',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. organization_members table
CREATE TABLE public.organization_members (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'dispatcher',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 3. helper: is the user a member of the org? (security definer => no recursion)
CREATE OR REPLACE FUNCTION public.user_in_org(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND org_id = _org_id
  )
$$;

CREATE OR REPLACE FUNCTION public.user_has_org_role(_user_id uuid, _org_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND org_id = _org_id AND role = _role
  )
$$;

-- 4. policies for orgs / members
CREATE POLICY "members read their orgs" ON public.organizations
  FOR SELECT TO authenticated
  USING (public.user_in_org(auth.uid(), id));

CREATE POLICY "authenticated create orgs" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "admins update their orgs" ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.user_has_org_role(auth.uid(), id, 'admin'))
  WITH CHECK (public.user_has_org_role(auth.uid(), id, 'admin'));

CREATE POLICY "members read members in their orgs" ON public.organization_members
  FOR SELECT TO authenticated
  USING (public.user_in_org(auth.uid(), org_id));

CREATE POLICY "admins manage members" ON public.organization_members
  FOR ALL TO authenticated
  USING (public.user_has_org_role(auth.uid(), org_id, 'admin'))
  WITH CHECK (public.user_has_org_role(auth.uid(), org_id, 'admin'));

-- 5. seed demo org and migrate existing rows
INSERT INTO public.organizations (id, name, tier)
VALUES ('00000000-0000-0000-0000-000000000001', 'SkyTrack Demo', 'commercial');

-- backfill membership for any existing users
INSERT INTO public.organization_members (org_id, user_id, role)
SELECT '00000000-0000-0000-0000-000000000001', id, 'admin'
FROM auth.users
ON CONFLICT DO NOTHING;

-- 6. add org_id to existing tables (nullable first, backfill, then NOT NULL)
ALTER TABLE public.aircraft    ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.crew        ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.flights     ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.maintenance ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.cargo       ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.alerts      ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.aircraft    SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE public.crew        SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE public.flights     SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE public.maintenance SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE public.cargo       SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;
UPDATE public.alerts      SET org_id = '00000000-0000-0000-0000-000000000001' WHERE org_id IS NULL;

ALTER TABLE public.aircraft    ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.crew        ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.flights     ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.maintenance ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.cargo       ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE public.alerts      ALTER COLUMN org_id SET NOT NULL;

CREATE INDEX idx_aircraft_org    ON public.aircraft(org_id);
CREATE INDEX idx_crew_org        ON public.crew(org_id);
CREATE INDEX idx_flights_org     ON public.flights(org_id);
CREATE INDEX idx_maintenance_org ON public.maintenance(org_id);
CREATE INDEX idx_cargo_org       ON public.cargo(org_id);
CREATE INDEX idx_alerts_org      ON public.alerts(org_id);

-- 7. drop old (org-agnostic) policies and replace with org-scoped ones
DROP POLICY IF EXISTS "ops read aircraft" ON public.aircraft;
DROP POLICY IF EXISTS "dispatcher write aircraft" ON public.aircraft;
CREATE POLICY "org members read aircraft" ON public.aircraft
  FOR SELECT TO authenticated USING (public.user_in_org(auth.uid(), org_id));
CREATE POLICY "org dispatchers write aircraft" ON public.aircraft
  FOR ALL TO authenticated
  USING (public.user_has_org_role(auth.uid(), org_id, 'admin') OR public.user_has_org_role(auth.uid(), org_id, 'dispatcher'))
  WITH CHECK (public.user_has_org_role(auth.uid(), org_id, 'admin') OR public.user_has_org_role(auth.uid(), org_id, 'dispatcher'));

DROP POLICY IF EXISTS "ops read crew" ON public.crew;
DROP POLICY IF EXISTS "dispatcher write crew" ON public.crew;
CREATE POLICY "org members read crew" ON public.crew
  FOR SELECT TO authenticated USING (public.user_in_org(auth.uid(), org_id));
CREATE POLICY "org dispatchers write crew" ON public.crew
  FOR ALL TO authenticated
  USING (public.user_has_org_role(auth.uid(), org_id, 'admin') OR public.user_has_org_role(auth.uid(), org_id, 'dispatcher'))
  WITH CHECK (public.user_has_org_role(auth.uid(), org_id, 'admin') OR public.user_has_org_role(auth.uid(), org_id, 'dispatcher'));

DROP POLICY IF EXISTS "ops read flights" ON public.flights;
DROP POLICY IF EXISTS "dispatcher write flights" ON public.flights;
CREATE POLICY "org members read flights" ON public.flights
  FOR SELECT TO authenticated USING (public.user_in_org(auth.uid(), org_id));
CREATE POLICY "org dispatchers write flights" ON public.flights
  FOR ALL TO authenticated
  USING (public.user_has_org_role(auth.uid(), org_id, 'admin') OR public.user_has_org_role(auth.uid(), org_id, 'dispatcher'))
  WITH CHECK (public.user_has_org_role(auth.uid(), org_id, 'admin') OR public.user_has_org_role(auth.uid(), org_id, 'dispatcher'));

DROP POLICY IF EXISTS "ops read maintenance" ON public.maintenance;
DROP POLICY IF EXISTS "maint write maintenance" ON public.maintenance;
CREATE POLICY "org members read maintenance" ON public.maintenance
  FOR SELECT TO authenticated USING (public.user_in_org(auth.uid(), org_id));
CREATE POLICY "org maint write maintenance" ON public.maintenance
  FOR ALL TO authenticated
  USING (public.user_has_org_role(auth.uid(), org_id, 'admin') OR public.user_has_org_role(auth.uid(), org_id, 'maintenance') OR public.user_has_org_role(auth.uid(), org_id, 'dispatcher'))
  WITH CHECK (public.user_has_org_role(auth.uid(), org_id, 'admin') OR public.user_has_org_role(auth.uid(), org_id, 'maintenance') OR public.user_has_org_role(auth.uid(), org_id, 'dispatcher'));

DROP POLICY IF EXISTS "ops read cargo" ON public.cargo;
DROP POLICY IF EXISTS "dispatcher write cargo" ON public.cargo;
CREATE POLICY "org members read cargo" ON public.cargo
  FOR SELECT TO authenticated USING (public.user_in_org(auth.uid(), org_id));
CREATE POLICY "org dispatchers write cargo" ON public.cargo
  FOR ALL TO authenticated
  USING (public.user_has_org_role(auth.uid(), org_id, 'admin') OR public.user_has_org_role(auth.uid(), org_id, 'dispatcher'))
  WITH CHECK (public.user_has_org_role(auth.uid(), org_id, 'admin') OR public.user_has_org_role(auth.uid(), org_id, 'dispatcher'));

DROP POLICY IF EXISTS "ops read alerts" ON public.alerts;
DROP POLICY IF EXISTS "dispatcher write alerts" ON public.alerts;
CREATE POLICY "org members read alerts" ON public.alerts
  FOR SELECT TO authenticated USING (public.user_in_org(auth.uid(), org_id));
CREATE POLICY "org write alerts" ON public.alerts
  FOR ALL TO authenticated
  USING (public.user_has_org_role(auth.uid(), org_id, 'admin') OR public.user_has_org_role(auth.uid(), org_id, 'dispatcher') OR public.user_has_org_role(auth.uid(), org_id, 'maintenance'))
  WITH CHECK (public.user_has_org_role(auth.uid(), org_id, 'admin') OR public.user_has_org_role(auth.uid(), org_id, 'dispatcher') OR public.user_has_org_role(auth.uid(), org_id, 'maintenance'));

-- 8. update handle_new_user trigger: also enroll new users in the demo org (Phase 3 will replace this)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'dispatcher')
    ON CONFLICT DO NOTHING;
  INSERT INTO public.organization_members (org_id, user_id, role)
    VALUES ('00000000-0000-0000-0000-000000000001', NEW.id, 'dispatcher')
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. updated_at trigger for organizations
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER touch_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
