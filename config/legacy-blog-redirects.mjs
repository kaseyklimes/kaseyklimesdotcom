import { readdirSync } from 'node:fs';

// Historical slugs that differ from the current Markdown filenames.
// Keep these aliases when renaming posts so inbound links remain valid.
export const legacyBlogAliases = {
  'density-doesnt-drive-housing-prices': 'what-really-drives-housing-prices',
  'why-america-needs-villages': 'the-urban-form-of-loneliness-why-america-needs-villages',
  'an-augmented-mind-designing-a-personal-knowledge-base-with-notion':
    'an-augmented-mind-designing-a-knowledge-base-with-notion',
};

export function getLegacyBlogRedirects() {
  const slugs = readdirSync(new URL('../content/blog/', import.meta.url))
    .filter(file => file.endsWith('.md'))
    .map(file => file.slice(0, -3));
  const targets = { ...Object.fromEntries(slugs.map(slug => [slug, slug])), ...legacyBlogAliases };

  return Object.entries(targets).flatMap(([oldSlug, slug]) => {
    if (!slugs.includes(slug)) throw new Error(`Missing blog redirect target: ${slug}`);
    // Match dates independently of frontmatter: some posts were republished.
    return [
      `/notes/:year(\\d{4})/:month(\\d{1,2})/:day(\\d{1,2})/${oldSlug}`,
      `/notes/${oldSlug}`,
    ].map(source => ({ source, destination: `/blog/${slug}`, permanent: true }));
  });
}
