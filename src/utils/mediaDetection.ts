// Media detection utilities

export type VideoType = 'youtube' | 'vimeo';

export interface VideoInfo {
  isVideo: boolean;
  type?: VideoType;
  id?: string;
}

// YouTube URL patterns
const youtubePatterns = [
  /youtube\.com\/watch\?v=([^&]+)/,
  /youtu\.be\/([^?]+)/,
  /youtube\.com\/embed\/([^?]+)/,
  /youtube\.com\/v\/([^?]+)/
];

// Vimeo URL patterns
const vimeoPatterns = [
  /vimeo\.com\/([0-9]+)/,
  /player\.vimeo\.com\/video\/([0-9]+)/
];

/**
 * Check if a URL is a video embed and extract video info
 */
export function getVideoInfo(url: string): VideoInfo {
  if (!url) return { isVideo: false };

  // Check YouTube patterns
  for (const pattern of youtubePatterns) {
    const match = url.match(pattern);
    if (match) {
      return { isVideo: true, type: 'youtube', id: match[1] };
    }
  }

  // Check Vimeo patterns
  for (const pattern of vimeoPatterns) {
    const match = url.match(pattern);
    if (match) {
      return { isVideo: true, type: 'vimeo', id: match[1] };
    }
  }

  return { isVideo: false };
}
