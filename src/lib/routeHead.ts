// Shared head() helper for per-route SEO metadata.
export function pageHead(opts: { title: string; description: string; path: string; ogType?: string }) {
  const ogType = opts.ogType ?? "website";
  return () => ({
    meta: [
      { title: opts.title },
      { name: "description", content: opts.description },
      { property: "og:title", content: opts.title },
      { property: "og:description", content: opts.description },
      { property: "og:url", content: opts.path },
      { property: "og:type", content: ogType },
    ],
    links: [{ rel: "canonical", href: opts.path }],
  });
}
