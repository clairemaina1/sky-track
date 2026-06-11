
-- 1. Privilege escalation: remove the self-join policy. Membership is created
--    by create_organization_with_admin (SECURITY DEFINER) which forces role='admin'.
DROP POLICY IF EXISTS "Users can join orgs they create" ON public.organization_members;

-- 2. Lock down SECURITY DEFINER helper from anonymous callers.
REVOKE EXECUTE ON FUNCTION public.invitation_matches_user(uuid, text) FROM PUBLIC, anon;

-- 3. Realtime broadcast/presence: deny-by-default. The app uses postgres_changes,
--    which inherits per-table RLS via user_in_org. Enabling RLS on realtime.messages
--    with no policies blocks cross-org broadcast/presence subscriptions entirely.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
