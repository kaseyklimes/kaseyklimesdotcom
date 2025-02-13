export type ContentCategory = 'blog' | 'work' | 'photography' | 'projects';

export interface ContentMeta {
  title: string;
  category: ContentCategory;
  date: string;
  stars: number;
  heroImage: string;
  description: string;
  slug: string;
}

export interface ContentItem extends ContentMeta {
  content: string;
}

export interface FilterOptions {
  category?: ContentCategory;
  sortBy?: 'date' | 'stars';
  order?: 'asc' | 'desc';
}

export interface GridItem extends ContentMeta {
  aspectRatio?: number;
  priority?: boolean;
} 