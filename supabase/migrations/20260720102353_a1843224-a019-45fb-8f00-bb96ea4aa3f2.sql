
-- Fix marketplace RLS: scope reads to own-org and cross-org discovery via a safe view.
DROP POLICY IF EXISTS "auth read all listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "org admins update" ON public.marketplace_listings;
DROP POLICY IF EXISTS "org admins delete" ON public.marketplace_listings;

CREATE POLICY "own org read full listings"
ON public.marketplace_listings
FOR SELECT TO authenticated
USING (public.user_in_org(auth.uid(), org_id));

CREATE POLICY "admins update own org listings"
ON public.marketplace_listings
FOR UPDATE TO authenticated
USING (public.user_has_org_role(auth.uid(), org_id, 'admin'))
WITH CHECK (public.user_has_org_role(auth.uid(), org_id, 'admin'));

CREATE POLICY "admins delete own org listings"
ON public.marketplace_listings
FOR DELETE TO authenticated
USING (public.user_has_org_role(auth.uid(), org_id, 'admin'));

-- Public discovery view — cross-org visible, but WITHOUT contact_email or rate.
CREATE OR REPLACE VIEW public.marketplace_public
WITH (security_invoker = true) AS
SELECT id, org_id, kind, title, aircraft_type, tail, base_iata,
       available_from, available_to, notes, status, created_at
FROM public.marketplace_listings
WHERE status = 'open';

-- The invoker's RLS on the base table would hide cross-org rows; we want the
-- view itself to be readable to any authenticated caller regardless of org.
-- Wrap with a security-definer function-backed view instead:
DROP VIEW IF EXISTS public.marketplace_public;

CREATE OR REPLACE FUNCTION public.marketplace_public_listings()
RETURNS TABLE (
  id uuid, org_id uuid, kind text, title text, aircraft_type text,
  tail text, base_iata text, notes text, status text, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, org_id, kind, title, aircraft_type, tail, base_iata, notes, status, created_at
  FROM public.marketplace_listings
  WHERE status = 'open'
$$;

REVOKE ALL ON FUNCTION public.marketplace_public_listings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marketplace_public_listings() TO authenticated;

-- Reveal contact for a specific listing (rate-audit trail could be added later).
CREATE OR REPLACE FUNCTION public.marketplace_reveal_contact(_listing_id uuid)
RETURNS TABLE (contact_email text, hourly_rate_usd numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  RETURN QUERY
    SELECT l.contact_email, l.hourly_rate_usd
    FROM public.marketplace_listings l
    WHERE l.id = _listing_id AND l.status = 'open';
END;
$$;
REVOKE ALL ON FUNCTION public.marketplace_reveal_contact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.marketplace_reveal_contact(uuid) TO authenticated;

-- ============================================================
-- Push fan-out via pg_net.
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Store the dispatch URL + shared secret in a locked table only the trigger reads.
CREATE TABLE IF NOT EXISTS public.push_dispatch_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  endpoint_url text NOT NULL,
  shared_secret text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.push_dispatch_config TO service_role;
ALTER TABLE public.push_dispatch_config ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated/anon: table is service-role only.

-- Trigger function: after a notification is inserted, POST notification_id to
-- the dispatch endpoint. Uses pg_net for async delivery so DB writes stay fast.
CREATE OR REPLACE FUNCTION public.enqueue_push_for_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cfg RECORD;
BEGIN
  SELECT endpoint_url, shared_secret INTO cfg FROM public.push_dispatch_config WHERE id = true;
  IF cfg IS NULL THEN RETURN NEW; END IF;
  -- Only push notifications addressed to a specific user (skip role-broadcast rows here).
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url := cfg.endpoint_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Dispatch-Secret', cfg.shared_secret
    ),
    body := jsonb_build_object('notification_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_push ON public.notifications;
CREATE TRIGGER trg_enqueue_push
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.enqueue_push_for_notification();
