export type ContentCategory = 'blog' | 'work' | 'play' | 'talks' | 'photography' | 'shelf';

export interface ContentMeta {
  title: string;
  date: string;
  category: string;
  stars: number;
  description?: string;
  slug: string;
  thumbnail?: string;  // Image for grid display (falls back to heroImage)
  heroImage?: string;  // Image for detail page
  imageDimensions?: { width: number; height: number };  // Pixel size of the grid image, from the dimensions manifest
  carousel?: string[];
  carouselCaption?: string;
  carouselPicker?: boolean;  // Set false to hide the hero carousel's slide dropdown
  series?: string[];  // Extra photos in a mini-series; only heroImage shows in the grid
  hasContent?: boolean;
  location?: string;
  span?: number;
  private?: boolean;
  hideFromAll?: boolean;  // Hidden from the unfiltered "All" grid; still shown under its tag filters
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