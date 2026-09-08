// Display names for content categories. URLs, folders, and frontmatter keep the
// original slugs so existing links stay valid; only the visible label changes.
const LABELS: Record<string, string> = {
  blog: 'Notes',
  photography: 'Images',
};

export function categoryLabel(slug: string): string {
  return LABELS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}
