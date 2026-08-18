ALTER TABLE public.aircraft ALTER COLUMN approval_status SET DEFAULT 'pending';
ALTER TABLE public.flights ALTER COLUMN approval_status SET DEFAULT 'pending';
ALTER TABLE public.crew ALTER COLUMN approval_status SET DEFAULT 'pending';
ALTER TABLE public.cargo ALTER COLUMN approval_status SET DEFAULT 'pending';
ALTER TABLE public.maintenance ALTER COLUMN approval_status SET DEFAULT 'pending';

ALTER TABLE public.aircraft ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.flights ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.crew ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.cargo ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.maintenance ALTER COLUMN created_by SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "Org admins can manage invitations" ON public.invitations;
CREATE POLICY "Org admins can manage invitations" ON public.invitations
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.user_has_org_role(auth.uid(), org_id, 'admin'))
  WITH CHECK (public.is_super_admin(auth.uid()) OR public.user_has_org_role(auth.uid(), org_id, 'admin'));