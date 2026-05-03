// Aviation domain types mirroring the Lovable Cloud schema.
import type { Database } from "@/integrations/supabase/types";

export type Aircraft = Database["public"]["Tables"]["aircraft"]["Row"];
export type Flight = Database["public"]["Tables"]["flights"]["Row"];
export type Crew = Database["public"]["Tables"]["crew"]["Row"];
export type Maintenance = Database["public"]["Tables"]["maintenance"]["Row"];
export type Cargo = Database["public"]["Tables"]["cargo"]["Row"];
export type Alert = Database["public"]["Tables"]["alerts"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export const AIRPORTS: Record<string, { name: string; city: string; lat: number; lon: number }> = {
  HKJK: { name: "Jomo Kenyatta Intl", city: "Nairobi", lat: -1.3192, lon: 36.9278 },
  HKNW: { name: "Wilson", city: "Nairobi", lat: -1.3217, lon: 36.8148 },
  HTDA: { name: "Julius Nyerere Intl", city: "Dar es Salaam", lat: -6.8781, lon: 39.2026 },
  HAAB: { name: "Bole Intl", city: "Addis Ababa", lat: 8.9779, lon: 38.7993 },
  HRYR: { name: "Kigali Intl", city: "Kigali", lat: -1.9686, lon: 30.1395 },
  HUEN: { name: "Entebbe Intl", city: "Entebbe", lat: 0.0424, lon: 32.4435 },
  HSSS: { name: "Khartoum Intl", city: "Khartoum", lat: 15.5895, lon: 32.5532 },
  FZAA: { name: "N'djili Intl", city: "Kinshasa", lat: -4.3858, lon: 15.4446 },
};

export function airportLabel(icao: string | null | undefined): string {
  if (!icao) return "—";
  return AIRPORTS[icao] ? `${icao} · ${AIRPORTS[icao].city}` : icao;
}
