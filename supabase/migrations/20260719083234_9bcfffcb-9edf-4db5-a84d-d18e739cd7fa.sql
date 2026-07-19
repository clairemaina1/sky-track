ALTER TABLE public.aircraft ADD COLUMN IF NOT EXISTS icao24_hex text;
CREATE INDEX IF NOT EXISTS idx_aircraft_icao24_hex ON public.aircraft (lower(icao24_hex));
COMMENT ON COLUMN public.aircraft.icao24_hex IS '24-bit ICAO Mode-S transponder hex code (lowercase). Used to match against ADS-B feeds like OpenSky Network.';