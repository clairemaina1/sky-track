
-- 1. Replace email-from-JWT invitation policy with one anchored to verified identity
CREATE OR REPLACE FUNCTION public.invitation_matches_user(_user_id uuid, _email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id
      AND lower(email) = lower(_email)
  )
$$;

DROP POLICY IF EXISTS "Invited users can read their own invites" ON public.invitations;

CREATE POLICY "Invited users can read their own invites"
  ON public.invitations
  FOR SELECT
  TO authenticated
  USING (public.invitation_matches_user(auth.uid(), email));

-- 2. Remove overly-permissive realtime topic policies that allowed cross-org subscription
DROP POLICY IF EXISTS "rt_crew_authorized" ON realtime.messages;
DROP POLICY IF EXISTS "rt_ops_authorized" ON realtime.messages;
