import { Outlet, createRootRouteWithContext, HeadContent, Scripts, Link } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import appCss from "../styles.css?url";
import leafletCss from "leaflet/dist/leaflet.css?url";
import { useEventEngine } from "@/lib/eventEngine";
import { useThemeAndLangSync } from "@/hooks/use-theme";
import "@/lib/i18n";

interface RouterContext { queryClient: QueryClient }

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-void">
      <div className="text-center">
        <h1 className="font-display text-7xl text-accent">404</h1>
        <p className="text-secondary-fg mt-2">Signal lost.</p>
        <Link to="/" className="btn-cmd mt-6 inline-flex">Return to Command</Link>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SkyTrack" },
      { name: "description", content: "Agentic Aviation Ops" },
      { property: "og:site_name", content: "SkyTrack AAOS" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "SkyTrack" },
      { name: "twitter:title", content: "SkyTrack" },
      { property: "og:description", content: "Agentic Aviation Ops" },
      { name: "twitter:description", content: "Agentic Aviation Ops" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c21dfa17-3dac-46ab-8588-c99fc818e7ca/id-preview-19ba84d0--6c39bcc2-4ddf-453d-9781-2a4f7eaea700.lovable.app-1781194228658.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c21dfa17-3dac-46ab-8588-c99fc818e7ca/id-preview-19ba84d0--6c39bcc2-4ddf-453d-9781-2a4f7eaea700.lovable.app-1781194228658.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: leafletCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "SkyTrack AAOS",
              description: "Agentic Aviation Operating System for fleet, MRO, crew, and operations.",
              url: "/",
            },
            {
              "@type": "WebSite",
              name: "SkyTrack AAOS",
              description: "Real-time aviation command center: fleet, MRO, crew, disruption, routing, and cargo.",
              url: "/",
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function EngineMount() { useEventEngine(); return null; }

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useThemeAndLangSync();
  return (
    <QueryClientProvider client={queryClient}>
      <EngineMount />
      <Outlet />
    </QueryClientProvider>
  );
}
