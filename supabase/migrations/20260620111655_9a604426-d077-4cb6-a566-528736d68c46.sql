
-- 1. Realtime channel authorization: restrict to org-scoped topics
-- Topic convention: 'org:<uuid>:<anything>' OR super_admin sees all
CREATE OR REPLACE FUNCTION public.realtime_topic_org_id(_topic text)
RETURNS uuid
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _topic ~ '^org:[0-9a-fA-F-]{36}:' THEN substring(_topic from 5 for 36)::uuid
    ELSE NULL
  END
$$;

DROP POLICY IF EXISTS "org scoped realtime read" ON realtime.messages;
DROP POLICY IF EXISTS "org scoped realtime write" ON realtime.messages;

CREATE POLICY "org scoped realtime read"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.realtime_topic_org_id((realtime.topic())) IS NOT NULL
    AND public.user_in_org(auth.uid(), public.realtime_topic_org_id((realtime.topic())))
  )
);

CREATE POLICY "org scoped realtime write"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR (
    public.realtime_topic_org_id((realtime.topic())) IS NOT NULL
    AND public.user_in_org(auth.uid(), public.realtime_topic_org_id((realtime.topic())))
  )
);

-- 2. organization_members: protect creator and last-admin
CREATE OR REPLACE FUNCTION public.org_admin_count(_org_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM public.organization_members
  WHERE org_id = _org_id AND role = 'admin'
$$;
REVOKE EXECUTE ON FUNCTION public.org_admin_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_admin_count(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_creator_or_last_admin_removal()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE org_creator uuid;
BEGIN
  -- super admin bypass
  IF public.is_super_admin(auth.uid()) THEN
    RETURN OLD;
  END IF;
  SELECT created_by INTO org_creator FROM public.organizations WHERE id = OLD.org_id;
  IF OLD.user_id = org_creator THEN
    RAISE EXCEPTION 'Cannot remove the organization creator';
  END IF;
  IF OLD.role = 'admin' AND public.org_admin_count(OLD.org_id) <= 1 THEN
    RAISE EXCEPTION 'Cannot remove the last admin of an organization';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS guard_org_member_removal ON public.organization_members;
CREATE TRIGGER guard_org_member_removal
BEFORE DELETE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.prevent_creator_or_last_admin_removal();

CREATE OR REPLACE FUNCTION public.prevent_creator_or_last_admin_demotion()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE org_creator uuid;
BEGIN
  IF public.is_super_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF OLD.role = 'admin' AND NEW.role <> 'admin' THEN
    SELECT created_by INTO org_creator FROM public.organizations WHERE id = OLD.org_id;
    IF OLD.user_id = org_creator THEN
      RAISE EXCEPTION 'Cannot demote the organization creator';
    END IF;
    IF public.org_admin_count(OLD.org_id) <= 1 THEN
      RAISE EXCEPTION 'Cannot demote the last admin of an organization';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_org_member_demotion ON public.organization_members;
CREATE TRIGGER guard_org_member_demotion
BEFORE UPDATE ON public.organization_members
FOR EACH ROW EXECUTE FUNCTION public.prevent_creator_or_last_admin_demotion();

-- 3. pending_users: explicit self-insert policy
DROP POLICY IF EXISTS "users insert own pending" ON public.pending_users;
CREATE POLICY "users insert own pending"
ON public.pending_users
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- 4. Revoke EXECUTE from anon/public on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_in_org(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_has_org_role(uuid, uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_has_category(uuid, uuid, skytrack_category) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_is_provisioned(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.invitation_matches_user(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_organization_with_admin(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_pending_user(uuid, uuid, app_role, skytrack_category[]) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_in_org(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_org_role(uuid, uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_category(uuid, uuid, skytrack_category) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_provisioned(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invitation_matches_user(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization_with_admin(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_pending_user(uuid, uuid, app_role, skytrack_category[]) TO authenticated;
