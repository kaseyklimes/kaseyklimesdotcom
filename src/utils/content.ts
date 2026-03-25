import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { ContentCategory, ContentItem, ContentMeta, FilterOptions } from '@/types/content';
import { HIDE_TWEETS } from '@/utils/config';
import { parseDateToTimestamp } from '@/utils/dateFormatting';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const VALID_CATEGORIES = ['blog', 'work', 'photography', 'shelf', 'tweet'];

export function getContentBySlug(category: ContentCategory, slug: string): ContentItem | null {
  try {
    // Respect hide-tweets flag
    if (HIDE_TWEETS && category === 'tweet') {
      return null;
    }
    // Validate category
    if (!VALID_CATEGORIES.includes(category)) {
      console.warn(`Invalid category: ${category}`);
      return null;
    }

    const fullPath = path.join(CONTENT_DIR, category, `${slug}.md`);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.warn(`File not found: ${fullPath}`);
      return null;
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
      ...(data as ContentMeta),
      content,
      slug,
    };
  } catch (error) {
    console.error(`Error loading content for ${category}/${slug}:`, error);
    return null;
  }
}

export function getAllContent(options?: FilterOptions): ContentMeta[] {
  // Build category list, respecting hide-tweets flag
  const categories = (() => {
    if (options?.category) {
      if (HIDE_TWEETS && options.category === 'tweet') return [];
      return [options.category];
    }
    return HIDE_TWEETS ? VALID_CATEGORIES.filter(c => c !== 'tweet') : VALID_CATEGORIES;
  })();
  let allContent: ContentMeta[] = [];

  for (const category of categories) {
    const categoryPath = path.join(CONTENT_DIR, category);

    try {
      if (!fs.existsSync(categoryPath)) {
        console.warn(`Category directory not found: ${categoryPath}`);
        continue;
      }

      const files = fs.readdirSync(categoryPath)
        .filter(file => file.endsWith('.md'));

      const categoryContent = files.map(file => {
        const fullPath = path.join(categoryPath, file);
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const { data, content } = matter(fileContents);
        const slug = file.replace(/\.md$/, '');

        return {
          ...(data as ContentMeta),
          slug,
          category: category as ContentCategory,
          hasContent: content.trim().length > 0
        };
      });

      allContent = [...allContent, ...categoryContent];
    } catch (error) {
      console.error(`Error loading content for ${category}:`, error);
    }
  }

  // Apply sorting
  if (options?.sortBy) {
    allContent.sort((a, b) => {
      const aValue = a[options.sortBy!];
      const bValue = b[options.sortBy!];
      const modifier = options.order === 'desc' ? -1 : 1;

      if (options.sortBy === 'date') {
        return modifier * (parseDateToTimestamp(aValue as string) - parseDateToTimestamp(bValue as string));
      }

      return modifier * ((aValue as number) - (bValue as number));
    });
  }

  return allContent;
}

/**
 * Get related content for a given category, excluding the current item.
 * Optimized to only read the minimum number of files needed (limit + buffer).
 * This avoids reading the entire category directory for better performance.
 */
export function getRelatedContent(
  category: ContentCategory,
  excludeSlug: string,
  limit = 2
): ContentMeta[] {
  // Validate category
  if (!VALID_CATEGORIES.includes(category)) {
    console.warn(`Invalid category: ${category}`);
    return [];
  }

  // Respect hide-tweets flag
  if (HIDE_TWEETS && category === 'tweet') {
    return [];
  }

  const categoryPath = path.join(CONTENT_DIR, category);

  try {
    if (!fs.existsSync(categoryPath)) {
      console.warn(`Category directory not found: ${categoryPath}`);
      return [];
    }

    const files = fs.readdirSync(categoryPath)
      .filter(f => f.endsWith('.md') && f !== `${excludeSlug}.md`);

    // Only read enough files to get the limit (plus a small buffer for filtering)
    const results: ContentMeta[] = [];
    const maxFilesToRead = Math.min(files.length, limit + 2); // Small buffer

    for (let i = 0; i < maxFilesToRead && results.length < limit; i++) {
      const file = files[i];
      const fullPath = path.join(categoryPath, file);

      try {
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const { data, content } = matter(fileContents);
        const slug = file.replace(/\.md$/, '');

        results.push({
          ...(data as ContentMeta),
          slug,
          category: category as ContentCategory,
          hasContent: content.trim().length > 0
        });
      } catch (error) {
        console.error(`Error reading file ${file}:`, error);
      }
    }

    return results;
  } catch (error) {
    console.error(`Error getting related content for ${category}:`, error);
    return [];
  }
}

export function getContentPaths(category: ContentCategory): string[] {
  // Validate category
  if (!VALID_CATEGORIES.includes(category)) {
    console.warn(`Invalid category: ${category}`);
    return [];
  }

  // Respect hide-tweets flag for path generation
  if (HIDE_TWEETS && category === 'tweet') {
    return [];
  }

  const categoryPath = path.join(CONTENT_DIR, category);

  try {
    if (!fs.existsSync(categoryPath)) {
      console.warn(`Category directory not found: ${categoryPath}`);
      return [];
    }

    return fs.readdirSync(categoryPath)
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace(/\.md$/, ''));
  } catch (error) {
    console.error(`Error loading paths for ${category}:`, error);
    return [];
  }
} 