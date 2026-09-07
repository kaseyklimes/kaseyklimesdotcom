export type ContentCategory = 'blog' | 'work' | 'photography' | 'shelf';

export interface ContentMeta {
  title: string;
  date: string;
  category: string;
  stars: number;
  description?: string;
  slug: string;
  thumbnail?: string;  // Image for grid display (falls back to heroImage)
  heroImage?: string;  // Image for detail page
  carousel?: string[];
  carouselCaption?: string;
  hasContent?: boolean;
  location?: string;
  span?: number;
  private?: boolean;
  clickThroughUrl?: string;
  audioUrl?: string;
  reportPages?: boolean;
  iframeUrl?: string;
  iframeRows?: number;  // Number of grid rows for iframe height
  iframeWidth?: number; // Fixed width in pixels for responsive calculations
  // New field for tags
  tags: string[];
  // Shelf-specific fields
  items?: ContentMeta[];
}

export interface ContentItem extends ContentMeta {
  content: string;
}

export interface FilterOptions {
  category?: ContentCategory;
  sortBy?: 'date' | 'stars';
  order?: 'asc' | 'desc';
}

export interface MasonryGridPage {
  title: string;
  description?: string;
  items: ContentMeta[];
  category: ContentCategory;
  layout: 'masonry';
} 