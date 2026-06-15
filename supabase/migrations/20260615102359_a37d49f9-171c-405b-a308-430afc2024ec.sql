
-- ─────────────────────────────────────────────────────────────
-- 1. SUPER_ADMIN role + helper + auto-grant trigger
-- ─────────────────────────────────────────────────────────────
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
COMMIT;

CREATE OR REPLACE FUNCTION public.is_super_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'super_admin')
$$;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, service_role;

-- Auto-grant super_admin to the hardcoded owner email on signup / signin
CREATE OR REPLACE FUNCTION public.grant_super_admin_if_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF lower(NEW.email) = 'clairewm01@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin')
      ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_grant_super ON auth.users;
CREATE TRIGGER on_auth_user_grant_super
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_super_admin_if_owner();

-- Retro-grant if the owner account already exists
INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'super_admin'::app_role FROM auth.users WHERE lower(email) = 'clairewm01@gmail.com'
  ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 2. CATEGORIES + org/user category access
-- ─────────────────────────────────────────────────────────────
CREATE TYPE public.skytrack_category AS ENUM ('flight_school','icao','airline','cargo');

CREATE TABLE public.organization_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category public.skytrack_category NOT NULL,
  brand_label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, category)
);
GRANT SELECT ON public.organization_categories TO authenticated;
GRANT ALL ON public.organization_categories TO service_role;
ALTER TABLE public.organization_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read org categories" ON public.organization_categories FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_in_org(auth.uid(), org_id));
CREATE POLICY "super admin manages org categories" ON public.organization_categories FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TABLE public.user_category_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category public.skytrack_category NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_id, category)
);
GRANT SELECT ON public.user_category_access TO authenticated;
GRANT ALL ON public.user_category_access TO service_role;
ALTER TABLE public.user_category_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own category access" ON public.user_category_access FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR user_id = auth.uid()
         OR public.user_has_org_role(auth.uid(), org_id, 'admin'));
CREATE POLICY "super admin manages category access" ON public.user_category_access FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.user_has_category(_uid uuid, _org uuid, _cat public.skytrack_category)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_category_access
    WHERE user_id = _uid AND org_id = _org AND category = _cat
  )
$$;
GRANT EXECUTE ON FUNCTION public.user_has_category(uuid, uuid, public.skytrack_category) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 3. PENDING USERS — every signup lands here
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.pending_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_org text,
  notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.pending_users TO authenticated;
GRANT ALL ON public.pending_users TO service_role;
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own pending" ON public.pending_users FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "super admin manages pending" ON public.pending_users FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.enroll_pending_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Owner skips the queue
  IF lower(NEW.email) = 'clairewm01@gmail.com' THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.pending_users (user_id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NULL))
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_enroll_pending ON auth.users;
CREATE TRIGGER on_auth_user_enroll_pending
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.enroll_pending_user();

-- Helper: is the calling user fully provisioned (approved + at least one org)
CREATE OR REPLACE FUNCTION public.user_is_provisioned(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_uid)
    OR EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _uid)
$$;
GRANT EXECUTE ON FUNCTION public.user_is_provisioned(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 4. APPROVAL columns on domain tables + category column
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['aircraft','flights','crew','maintenance','cargo','alerts']
  LOOP
    EXECUTE format('ALTER TABLE public.%I
      ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT ''approved'' CHECK (approval_status IN (''pending'',''approved'',''rejected'')),
      ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
      ADD COLUMN IF NOT EXISTS approved_at timestamptz,
      ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
      ADD COLUMN IF NOT EXISTS category public.skytrack_category', t);
  END LOOP;
END $$;

-- Backfill: existing rows are approved; default category derived from org tier
UPDATE public.aircraft a SET category = CASE WHEN o.tier='flight_school' THEN 'flight_school'::public.skytrack_category ELSE 'airline'::public.skytrack_category END
  FROM public.organizations o WHERE a.org_id=o.id AND a.category IS NULL;
UPDATE public.flights f SET category = CASE WHEN o.tier='flight_school' THEN 'flight_school'::public.skytrack_category ELSE 'airline'::public.skytrack_category END
  FROM public.organizations o WHERE f.org_id=o.id AND f.category IS NULL;
UPDATE public.crew c SET category = CASE WHEN o.tier='flight_school' THEN 'flight_school'::public.skytrack_category ELSE 'airline'::public.skytrack_category END
  FROM public.organizations o WHERE c.org_id=o.id AND c.category IS NULL;
UPDATE public.maintenance m SET category = CASE WHEN o.tier='flight_school' THEN 'flight_school'::public.skytrack_category ELSE 'airline'::public.skytrack_category END
  FROM public.organizations o WHERE m.org_id=o.id AND m.category IS NULL;
UPDATE public.cargo c SET category = 'cargo'::public.skytrack_category WHERE c.category IS NULL;
UPDATE public.alerts a SET category = CASE WHEN o.tier='flight_school' THEN 'flight_school'::public.skytrack_category ELSE 'airline'::public.skytrack_category END
  FROM public.organizations o WHERE a.org_id=o.id AND a.category IS NULL;

-- Backfill org_categories from existing org.tier
INSERT INTO public.organization_categories (org_id, category, brand_label)
  SELECT id, 'flight_school'::public.skytrack_category, 'SkyTrack Flight Schools' FROM public.organizations WHERE tier='flight_school'
  ON CONFLICT DO NOTHING;
INSERT INTO public.organization_categories (org_id, category, brand_label)
  SELECT id, 'airline'::public.skytrack_category, 'SkyTrack Airlines' FROM public.organizations WHERE tier<>'flight_school'
  ON CONFLICT DO NOTHING;
-- Grant existing org members access to their org's existing categories
INSERT INTO public.user_category_access (user_id, org_id, category)
  SELECT om.user_id, oc.org_id, oc.category
  FROM public.organization_members om
  JOIN public.organization_categories oc ON oc.org_id = om.org_id
  ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 5. Rewrite RLS on domain tables: org + category + approval + super_admin bypass
-- ─────────────────────────────────────────────────────────────
-- AIRCRAFT
DROP POLICY IF EXISTS "org members read aircraft" ON public.aircraft;
DROP POLICY IF EXISTS "org dispatchers write aircraft" ON public.aircraft;
CREATE POLICY "read aircraft" ON public.aircraft FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid())
  OR (public.user_in_org(auth.uid(), org_id)
      AND (category IS NULL OR public.user_has_category(auth.uid(), org_id, category))
      AND (approval_status = 'approved' OR created_by = auth.uid()
           OR public.user_has_org_role(auth.uid(), org_id, 'admin')))
);
CREATE POLICY "write aircraft" ON public.aircraft FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_in_org(auth.uid(), org_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_in_org(auth.uid(), org_id));

-- FLIGHTS
DROP POLICY IF EXISTS "org members read flights" ON public.flights;
DROP POLICY IF EXISTS "org dispatchers write flights" ON public.flights;
CREATE POLICY "read flights" ON public.flights FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid())
  OR (public.user_in_org(auth.uid(), org_id)
      AND (category IS NULL OR public.user_has_category(auth.uid(), org_id, category))
      AND (approval_status = 'approved' OR created_by = auth.uid()
           OR public.user_has_org_role(auth.uid(), org_id, 'admin')))
);
CREATE POLICY "write flights" ON public.flights FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_in_org(auth.uid(), org_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_in_org(auth.uid(), org_id));

-- CREW
DROP POLICY IF EXISTS "org members read crew" ON public.crew;
DROP POLICY IF EXISTS "org dispatchers write crew" ON public.crew;
CREATE POLICY "read crew" ON public.crew FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid())
  OR (public.user_in_org(auth.uid(), org_id)
      AND (category IS NULL OR public.user_has_category(auth.uid(), org_id, category))
      AND (approval_status = 'approved' OR created_by = auth.uid()
           OR public.user_has_org_role(auth.uid(), org_id, 'admin')))
);
CREATE POLICY "write crew" ON public.crew FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_in_org(auth.uid(), org_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_in_org(auth.uid(), org_id));

-- MAINTENANCE
DROP POLICY IF EXISTS "org members read maintenance" ON public.maintenance;
DROP POLICY IF EXISTS "org maint write maintenance" ON public.maintenance;
CREATE POLICY "read maintenance" ON public.maintenance FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid())
  OR (public.user_in_org(auth.uid(), org_id)
      AND (category IS NULL OR public.user_has_category(auth.uid(), org_id, category))
      AND (approval_status = 'approved' OR created_by = auth.uid()
           OR public.user_has_org_role(auth.uid(), org_id, 'admin')))
);
CREATE POLICY "write maintenance" ON public.maintenance FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_in_org(auth.uid(), org_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_in_org(auth.uid(), org_id));

-- CARGO
DROP POLICY IF EXISTS "org members read cargo" ON public.cargo;
DROP POLICY IF EXISTS "org dispatchers write cargo" ON public.cargo;
CREATE POLICY "read cargo" ON public.cargo FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid())
  OR (public.user_in_org(auth.uid(), org_id)
      AND (category IS NULL OR public.user_has_category(auth.uid(), org_id, category))
      AND (approval_status = 'approved' OR created_by = auth.uid()
           OR public.user_has_org_role(auth.uid(), org_id, 'admin')))
);
CREATE POLICY "write cargo" ON public.cargo FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_in_org(auth.uid(), org_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_in_org(auth.uid(), org_id));

-- ALERTS
DROP POLICY IF EXISTS "org members read alerts" ON public.alerts;
DROP POLICY IF EXISTS "org write alerts" ON public.alerts;
CREATE POLICY "read alerts" ON public.alerts FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid()) OR public.user_in_org(auth.uid(), org_id)
);
CREATE POLICY "write alerts" ON public.alerts FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_in_org(auth.uid(), org_id))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_in_org(auth.uid(), org_id));

-- ORGANIZATIONS: super_admin sees all
DROP POLICY IF EXISTS "members read their orgs" ON public.organizations;
CREATE POLICY "members read their orgs" ON public.organizations FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_in_org(auth.uid(), id));
DROP POLICY IF EXISTS "admins update their orgs" ON public.organizations;
CREATE POLICY "update orgs" ON public.organizations FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_has_org_role(auth.uid(), id, 'admin'))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_has_org_role(auth.uid(), id, 'admin'));

-- ORGANIZATION_MEMBERS: super_admin sees all
DROP POLICY IF EXISTS "members read members in their orgs" ON public.organization_members;
DROP POLICY IF EXISTS "Members can view their org members" ON public.organization_members;
CREATE POLICY "read org members" ON public.organization_members FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_in_org(auth.uid(), org_id));
DROP POLICY IF EXISTS "admins manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.organization_members;
CREATE POLICY "manage org members" ON public.organization_members FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_has_org_role(auth.uid(), org_id, 'admin'))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_has_org_role(auth.uid(), org_id, 'admin'));

-- ─────────────────────────────────────────────────────────────
-- 6. LOCK user_roles writes to super_admin only (roles are permanent)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admins insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins update roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "view own roles" ON public.user_roles;
CREATE POLICY "read roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "super admin writes roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- 7. PILOT LOGBOOK (Flight School category)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.pilot_logbook_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pilot_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aircraft_id uuid REFERENCES public.aircraft(id),
  flight_date date NOT NULL,
  departure_icao text,
  arrival_icao text,
  route text,
  pic_name text,
  sic_name text,
  total_time_min integer NOT NULL DEFAULT 0,
  pic_time_min integer NOT NULL DEFAULT 0,
  sic_time_min integer NOT NULL DEFAULT 0,
  night_time_min integer NOT NULL DEFAULT 0,
  ifr_time_min integer NOT NULL DEFAULT 0,
  sim_time_min integer NOT NULL DEFAULT 0,
  landings_day integer NOT NULL DEFAULT 0,
  landings_night integer NOT NULL DEFAULT 0,
  remarks text,
  instructor_user_id uuid REFERENCES auth.users(id),
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pilot_logbook_entries TO authenticated;
GRANT ALL ON public.pilot_logbook_entries TO service_role;
ALTER TABLE public.pilot_logbook_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read logbook" ON public.pilot_logbook_entries FOR SELECT TO authenticated USING (
  public.is_super_admin(auth.uid())
  OR pilot_user_id = auth.uid()
  OR (public.user_in_org(auth.uid(), org_id) AND public.user_has_org_role(auth.uid(), org_id, 'admin'))
  OR (public.user_in_org(auth.uid(), org_id) AND instructor_user_id = auth.uid())
);
CREATE POLICY "insert logbook self" ON public.pilot_logbook_entries FOR INSERT TO authenticated
  WITH CHECK (
    pilot_user_id = auth.uid()
    AND public.user_in_org(auth.uid(), org_id)
    AND public.user_has_category(auth.uid(), org_id, 'flight_school')
  );
CREATE POLICY "update logbook" ON public.pilot_logbook_entries FOR UPDATE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR (pilot_user_id = auth.uid() AND approval_status = 'pending')
    OR public.user_has_org_role(auth.uid(), org_id, 'admin')
    OR instructor_user_id = auth.uid()
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR (pilot_user_id = auth.uid() AND approval_status = 'pending')
    OR public.user_has_org_role(auth.uid(), org_id, 'admin')
    OR instructor_user_id = auth.uid()
  );
CREATE POLICY "delete logbook" ON public.pilot_logbook_entries FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_has_org_role(auth.uid(), org_id, 'admin'));

CREATE TRIGGER tg_logbook_touch BEFORE UPDATE ON public.pilot_logbook_entries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 8. Server-side approve/reject helpers
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.approve_pending_user(
  _pending_id uuid, _org_id uuid, _role public.app_role, _categories public.skytrack_category[]
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pu RECORD; cat public.skytrack_category;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO pu FROM public.pending_users WHERE id = _pending_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'pending user not found'; END IF;

  INSERT INTO public.organization_members (org_id, user_id, role) VALUES (_org_id, pu.user_id, _role)
    ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  INSERT INTO public.user_roles (user_id, role) VALUES (pu.user_id, _role) ON CONFLICT DO NOTHING;
  FOREACH cat IN ARRAY _categories LOOP
    INSERT INTO public.user_category_access (user_id, org_id, category) VALUES (pu.user_id, _org_id, cat)
      ON CONFLICT DO NOTHING;
  END LOOP;
  UPDATE public.pending_users SET status='approved', reviewed_by=auth.uid(), reviewed_at=now() WHERE id=_pending_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.approve_pending_user(uuid,uuid,public.app_role,public.skytrack_category[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_pending_user(uuid,uuid,public.app_role,public.skytrack_category[]) TO authenticated;
