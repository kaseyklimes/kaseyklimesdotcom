// Filter URLs follow their visible labels; content detail URLs keep their existing slugs.
const FILTER_SLUGS: Record<string, string> = {
  blog: 'notes',
  photography: 'images',
};

export function filterPath(tag: string): string {
  return tag === 'all' ? '/' : `/${encodeURIComponent(FILTER_SLUGS[tag] ?? tag)}`;
}

export function filterTag(pathname: string): string | null {
  const slug = pathname.replace(/^\/|\/$/g, '');
  if (!slug || slug === 'all' || slug.includes('/')) return null;
  return Object.entries(FILTER_SLUGS).find(([, path]) => path === slug)?.[0] ?? slug;
}
