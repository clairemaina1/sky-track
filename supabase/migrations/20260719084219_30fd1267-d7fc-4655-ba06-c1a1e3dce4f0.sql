
CREATE TABLE public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('wet_lease','dry_lease','charter','crew')),
  title TEXT NOT NULL,
  aircraft_type TEXT,
  tail TEXT,
  base_iata TEXT,
  available_from DATE,
  available_to DATE,
  hourly_rate_usd NUMERIC,
  notes TEXT,
  contact_email TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','matched','closed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_listings TO authenticated;
GRANT ALL ON public.marketplace_listings TO service_role;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
-- All authenticated users can browse listings (cross-org marketplace)
CREATE POLICY "auth read all listings" ON public.marketplace_listings FOR SELECT TO authenticated USING (true);
CREATE POLICY "org members insert" ON public.marketplace_listings FOR INSERT TO authenticated
  WITH CHECK (public.user_in_org(auth.uid(), org_id));
CREATE POLICY "org admins update" ON public.marketplace_listings FOR UPDATE TO authenticated
  USING (public.user_in_org(auth.uid(), org_id)) WITH CHECK (public.user_in_org(auth.uid(), org_id));
CREATE POLICY "org admins delete" ON public.marketplace_listings FOR DELETE TO authenticated
  USING (public.user_in_org(auth.uid(), org_id));
CREATE TRIGGER touch_marketplace_listings BEFORE UPDATE ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed demo listings
INSERT INTO public.marketplace_listings (org_id, kind, title, aircraft_type, tail, base_iata, available_from, available_to, hourly_rate_usd, notes, contact_email)
SELECT o.id, 'wet_lease', 'B737-800 available NBO-JNB corridor', 'B737-800', '5Y-DEMO', 'NBO', current_date, current_date + 45, 6800, 'Crew + insurance included. 150hr min block.', 'ops@skytrack.demo'
FROM public.organizations o WHERE o.name = 'SkyTrack Demo' LIMIT 1;
INSERT INTO public.marketplace_listings (org_id, kind, title, aircraft_type, tail, base_iata, available_from, available_to, hourly_rate_usd, notes, contact_email)
SELECT o.id, 'charter', 'Q400 ad-hoc East Africa charter', 'DHC-8-Q400', '5Y-QDX', 'MBA', current_date + 3, current_date + 30, 3200, 'Reg. 70 pax. Turnkey.', 'ops@skytrack.demo'
FROM public.organizations o WHERE o.name = 'SkyTrack Demo' LIMIT 1;
INSERT INTO public.marketplace_listings (org_id, kind, title, base_iata, available_from, available_to, hourly_rate_usd, notes, contact_email)
SELECT o.id, 'crew', 'B737 Type-Rated Captain — 90d contract', 'NBO', current_date, current_date + 90, 480, 'ATPL, 8,200hr TT, valid Class 1.', 'crew@skytrack.demo'
FROM public.organizations o WHERE o.name = 'SkyTrack Demo' LIMIT 1;
