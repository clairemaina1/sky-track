
-- Secure org-creation RPC (single transaction, no client-side race)
CREATE OR REPLACE FUNCTION public.create_organization_with_admin(
  _name text,
  _tier text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_org_id uuid;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _tier NOT IN ('commercial', 'flight_school') THEN
    RAISE EXCEPTION 'Invalid tier';
  END IF;
  IF length(trim(_name)) < 2 THEN
    RAISE EXCEPTION 'Organization name required';
  END IF;

  INSERT INTO public.organizations (name, tier, created_by)
    VALUES (trim(_name), _tier, uid)
    RETURNING id INTO new_org_id;

  INSERT INTO public.organization_members (org_id, user_id, role)
    VALUES (new_org_id, uid, 'admin');

  RETURN new_org_id;
END;
$$;

-- Lock down the self-join policy so it requires being the org creator
DROP POLICY IF EXISTS "Users can join orgs they create" ON public.organization_members;
CREATE POLICY "Users can join orgs they create"
  ON public.organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = org_id AND o.created_by = auth.uid()
    )
  );
