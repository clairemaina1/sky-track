
-- Approval-gate write policies: only admin/super_admin can set approval_status='approved'
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['aircraft','flights','crew','cargo','maintenance']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'write ' || t, t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR ALL
        USING (is_super_admin(auth.uid()) OR user_in_org(auth.uid(), org_id))
        WITH CHECK (
          (is_super_admin(auth.uid()) OR user_in_org(auth.uid(), org_id))
          AND (
            approval_status IS NULL
            OR approval_status <> 'approved'
            OR is_super_admin(auth.uid())
            OR user_has_org_role(auth.uid(), org_id, 'admin')
          )
        )
    $f$, 'write ' || t, t);
  END LOOP;
END $$;

-- Marketplace contact reveal: require org membership + log reveal
CREATE TABLE IF NOT EXISTS public.marketplace_reveal_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.marketplace_reveal_log TO authenticated;
GRANT ALL ON public.marketplace_reveal_log TO service_role;
ALTER TABLE public.marketplace_reveal_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requester or super admin reads reveal log" ON public.marketplace_reveal_log
  FOR SELECT USING (requested_by = auth.uid() OR is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.marketplace_reveal_contact(_listing_id uuid)
RETURNS TABLE(contact_email text, hourly_rate_usd numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  requester_org uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  -- Require the requester to be a member of at least one org
  SELECT org_id INTO requester_org
    FROM public.organization_members
    WHERE user_id = uid
    ORDER BY 1
    LIMIT 1;
  IF requester_org IS NULL AND NOT public.is_super_admin(uid) THEN
    RAISE EXCEPTION 'org membership required to view contact info';
  END IF;

  INSERT INTO public.marketplace_reveal_log(listing_id, requested_by, requester_org_id)
    VALUES (_listing_id, uid, requester_org);

  RETURN QUERY
    SELECT l.contact_email, l.hourly_rate_usd
    FROM public.marketplace_listings l
    WHERE l.id = _listing_id AND l.status = 'open';
END; $$;

REVOKE EXECUTE ON FUNCTION public.marketplace_reveal_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marketplace_reveal_contact(uuid) TO authenticated;
