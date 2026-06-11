
-- Lock down Realtime: only authorized roles per channel/topic
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Crew channel: admin, dispatcher, maintenance, crew
CREATE POLICY "rt_crew_authorized" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    realtime.topic() = 'crew' AND (
      public.has_role(auth.uid(),'admin') OR
      public.has_role(auth.uid(),'dispatcher') OR
      public.has_role(auth.uid(),'maintenance') OR
      public.has_role(auth.uid(),'crew')
    )
  );

-- Aircraft / flights / alerts: admin, dispatcher, maintenance
CREATE POLICY "rt_ops_authorized" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    realtime.topic() IN ('aircraft','flights','alerts') AND (
      public.has_role(auth.uid(),'admin') OR
      public.has_role(auth.uid(),'dispatcher') OR
      public.has_role(auth.uid(),'maintenance')
    )
  );

-- Tighten user_roles: explicit non-admin write block via lack of permissive policies.
-- Drop overly-broad ALL policy and split into explicit per-command policies.
DROP POLICY IF EXISTS "admin manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "block non-admin role writes" ON public.user_roles;

CREATE POLICY "admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Restrict has_role EXECUTE: keep it callable (RLS policies need it) but document intent.
-- Revoke from public, grant only to authenticated + service_role (required by policies).
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
