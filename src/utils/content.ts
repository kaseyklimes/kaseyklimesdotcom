import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { cache } from 'react';
import { ContentCategory, ContentItem, ContentMeta, FilterOptions } from '@/types/content';
import { parseDateToTimestamp } from '@/utils/dateFormatting';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const VALID_CATEGORIES: ContentCategory[] = ['blog', 'work', 'play', 'photography', 'shelf'];
const VALID_SLUG = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

function isAvailableCategory(category: ContentCategory): boolean {
  return VALID_CATEGORIES.includes(category);
}

// React's request-scoped cache shares reads between metadata and page rendering,
// without retaining stale Markdown across development edits or revalidation.
export const getContentBySlug = cache((category: ContentCategory, slug: string): ContentItem | null => {
  if (!isAvailableCategory(category) || !VALID_SLUG.test(slug)) return null;

  try {
    const fileContents = fs.readFileSync(path.join(CONTENT_DIR, category, `${slug}.md`), 'utf8');
    // Disable gray-matter's global cache, which retains failed parses as empty data.
    const { data, content } = matter(fileContents, {});
    return {
      ...(data as ContentMeta),
      category,
      slug,
      content,
      hasContent: content.trim().length > 0,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`Error loading content for ${category}/${slug}:`, error);
    }
    return null;
  }
});

export const getContentPaths = cache((category: ContentCategory): string[] => {
  if (!isAvailableCategory(category)) return [];
  try {
    return fs.readdirSync(path.join(CONTENT_DIR, category))
      .filter(file => file.endsWith('.md') && VALID_SLUG.test(file.slice(0, -3)))
      .map(file => file.slice(0, -3))
      .sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`Error loading paths for ${category}:`, error);
    }
    return [];
  }
});

function metadata(item: ContentItem): ContentMeta {
  const { content, ...meta } = item;
  void content;
  return meta;
}

export function getAllContent(options?: FilterOptions): ContentMeta[] {
  const categories = options?.category ? [options.category] : VALID_CATEGORIES;
  const allContent: ContentMeta[] = [];
  for (const category of categories) {
    for (const slug of getContentPaths(category)) {
      const item = getContentBySlug(category, slug);
      if (item) allContent.push(metadata(item));
    }
  }

  const sortBy = options?.sortBy;
  if (sortBy) {
    const modifier = options.order === 'desc' ? -1 : 1;
    const value = (item: ContentMeta) => sortBy === 'date'
      ? parseDateToTimestamp(item.date)
      : (Number(item.stars) || 0);
    allContent.sort((a, b) => modifier * (value(a) - value(b)));
  }
  return allContent;
}

export function getRelatedContent(category: ContentCategory, excludeSlug: string, limit = 2): ContentMeta[] {
  if (!Number.isFinite(limit) || limit < 1) return [];
  const results: ContentMeta[] = [];
  for (const slug of getContentPaths(category)) {
    if (slug === excludeSlug) continue;
    const item = getContentBySlug(category, slug);
    if (!item || item.private) continue;
    results.push(metadata(item));
    if (results.length >= Math.floor(limit)) break;
  }
  return results;
}
