import { auth, defineMcp } from "@lovable.dev/mcp-js";
import {
  listAircraftTool,
  getAircraftTool,
  listFlightsTool,
  listCrewTool,
  listCargoTool,
  whoAmITool,
} from "./tools/index";

// Direct Supabase issuer (never the .lovable.cloud proxy) — mcp-js verifies
// tokens against the issuer the discovery doc publishes.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "skytrack-mcp",
  title: "SkyTrack AAOS",
  version: "0.1.0",
  instructions:
    "Tools for SkyTrack Aviation Operating System. Read fleet, flight, crew and cargo data scoped to your organization. Use `whoami` first to confirm identity and org access.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoAmITool, listAircraftTool, getAircraftTool, listFlightsTool, listCrewTool, listCargoTool],
});
