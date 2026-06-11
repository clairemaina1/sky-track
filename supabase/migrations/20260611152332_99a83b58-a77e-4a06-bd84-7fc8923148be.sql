
-- 1) Add admin role if not present
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'admin' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'admin';
  END IF;
END $$;

-- 2) Clean-slate: rewrite handle_new_user so new signups do NOT join the demo org
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Give every new user a default base role; they become 'admin' of any org they create.
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'dispatcher')
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

-- 3) Invitations table
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'dispatcher',
  invited_by uuid NOT NULL,
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can manage invitations"
  ON public.invitations FOR ALL
  TO authenticated
  USING (public.user_has_org_role(auth.uid(), org_id, 'admin'))
  WITH CHECK (public.user_has_org_role(auth.uid(), org_id, 'admin'));

CREATE POLICY "Invited users can read their own invites"
  ON public.invitations FOR SELECT
  TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

-- 4) Allow org members to read other members of the same org (for admin panel listing)
DROP POLICY IF EXISTS "Members can view their org members" ON public.organization_members;
CREATE POLICY "Members can view their org members"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (public.user_in_org(auth.uid(), org_id));

-- 5) Admin can update/remove members in their org
DROP POLICY IF EXISTS "Admins can manage members" ON public.organization_members;
CREATE POLICY "Admins can manage members"
  ON public.organization_members FOR ALL
  TO authenticated
  USING (public.user_has_org_role(auth.uid(), org_id, 'admin'))
  WITH CHECK (public.user_has_org_role(auth.uid(), org_id, 'admin'));

-- 6) Allow authenticated users to create new orgs and to add themselves as the first admin member
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
CREATE POLICY "Users can create organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can join orgs they create" ON public.organization_members;
CREATE POLICY "Users can join orgs they create"
  ON public.organization_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
