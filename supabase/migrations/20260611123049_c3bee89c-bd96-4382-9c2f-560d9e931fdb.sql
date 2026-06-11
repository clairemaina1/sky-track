
-- 1) Restrict crew read access to operational roles only
DROP POLICY IF EXISTS "ops read crew" ON public.crew;
CREATE POLICY "ops read crew" ON public.crew
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'dispatcher')
    OR public.has_role(auth.uid(),'maintenance')
    OR public.has_role(auth.uid(),'crew')
  );

-- 2) Explicit restrictive guard on user_roles writes (defence-in-depth
--    against privilege escalation; works alongside the existing
--    "admin manage roles" permissive policy).
DROP POLICY IF EXISTS "block non-admin role writes" ON public.user_roles;
CREATE POLICY "block non-admin role writes" ON public.user_roles
  AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
