
-- 1. Audit log: null-org rows only visible to super_admin
DROP POLICY IF EXISTS "org members can read audit log" ON public.audit_log;
CREATE POLICY "org members can read audit log" ON public.audit_log
  FOR SELECT USING (
    (org_id IS NOT NULL AND user_in_org(auth.uid(), org_id))
    OR is_super_admin(auth.uid())
  );

-- Also require org_id on insert (no more anonymous null-org writes)
DROP POLICY IF EXISTS "authenticated can insert audit rows for their org" ON public.audit_log;
CREATE POLICY "authenticated can insert audit rows for their org" ON public.audit_log
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND org_id IS NOT NULL
    AND user_in_org(auth.uid(), org_id)
  );

-- 2. pending_users: users cannot approve/modify themselves; only super_admin
-- Split the ALL super_admin policy into explicit ones so intent is clear;
-- and forbid any self-update path.
DROP POLICY IF EXISTS "super admin manages pending" ON public.pending_users;
CREATE POLICY "super admin selects pending" ON public.pending_users
  FOR SELECT USING (is_super_admin(auth.uid()));
CREATE POLICY "super admin updates pending" ON public.pending_users
  FOR UPDATE USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "super admin deletes pending" ON public.pending_users
  FOR DELETE USING (is_super_admin(auth.uid()));
-- Restrict self-insert: user can only insert their OWN pending row with status='pending'
DROP POLICY IF EXISTS "users insert own pending" ON public.pending_users;
CREATE POLICY "users insert own pending" ON public.pending_users
  FOR INSERT WITH CHECK (
    (user_id = auth.uid() AND status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR is_super_admin(auth.uid())
  );

-- 3. Marketplace: hide contact_email + hourly_rate_usd from cross-org and
--    from non-owner reads. Own org sees everything; other orgs must use the
--    public listings function (already excludes contact info) or the
--    marketplace_reveal_contact RPC.
DROP POLICY IF EXISTS "own org read full listings" ON public.marketplace_listings;
CREATE POLICY "own org read full listings" ON public.marketplace_listings
  FOR SELECT USING (user_in_org(auth.uid(), org_id));

-- Revoke direct table read from authenticated on sensitive columns via a
-- safer default: only own-org members can select the base table.
REVOKE SELECT ON public.marketplace_listings FROM anon;
-- authenticated already limited by RLS above; keep authenticated grant so
-- own-org selects still work.
