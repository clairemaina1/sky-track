import { createFileRoute } from "@tanstack/react-router";

const SPEC = {
  openapi: "3.1.0",
  info: { title: "SkyTrack Public API", version: "1.0.0" },
  servers: [{ url: "https://skytrackk.lovable.app/api/public/v1" }],
  security: [{ bearerAuth: [] }],
  components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } } },
  paths: {
    "/aircraft": { get: { summary: "List aircraft" }, post: { summary: "Create aircraft" } },
    "/flights": { get: { summary: "List flights" }, post: { summary: "Create flight" } },
    "/crew": { get: { summary: "List crew" } },
  },
};

export const Route = createFileRoute("/api/public/v1/openapi/json")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify(SPEC, null, 2), {
          headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
        }),
    },
  },
});
