import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { ContentCategory, ContentItem, ContentMeta, FilterOptions } from '@/types/content';

const CONTENT_DIR = path.join(process.cwd(), 'content');

export async function getContentBySlug(category: ContentCategory, slug: string): Promise<ContentItem | null> {
  try {
    const fullPath = path.join(CONTENT_DIR, category, `${slug}.md`);
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

export async function getAllContent(options?: FilterOptions): Promise<ContentMeta[]> {
  const categories = options?.category ? [options.category] : ['blog', 'work', 'photography', 'projects'];
  let allContent: ContentMeta[] = [];

  for (const category of categories) {
    const categoryPath = path.join(CONTENT_DIR, category);
    
    try {
      if (!fs.existsSync(categoryPath)) continue;
      
      const files = fs.readdirSync(categoryPath);
      const categoryContent = files
        .filter(file => file.endsWith('.md'))
        .map(file => {
          const fullPath = path.join(categoryPath, file);
          const fileContents = fs.readFileSync(fullPath, 'utf8');
          const { data } = matter(fileContents);
          const slug = file.replace(/\.md$/, '');

          return {
            ...(data as ContentMeta),
            slug,
            category: category as ContentCategory,
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
        return modifier * (new Date(aValue).getTime() - new Date(bValue).getTime());
      }
      
      return modifier * ((aValue as number) - (bValue as number));
    });
  }

  return allContent;
}

export async function getContentPaths(category: ContentCategory): Promise<string[]> {
  const categoryPath = path.join(CONTENT_DIR, category);
  
  try {
    if (!fs.existsSync(categoryPath)) return [];
    
    return fs.readdirSync(categoryPath)
      .filter(file => file.endsWith('.md'))
      .map(file => file.replace(/\.md$/, ''));
  } catch (error) {
    console.error(`Error loading paths for ${category}:`, error);
    return [];
  }
} 