// Media detection utilities

export type VideoType = 'youtube' | 'vimeo' | 'mux';

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

  // Mux-hosted episodes use the same click-to-play player as other talks.
  const muxMatch = url.match(/^https:\/\/player\.mux\.com\/([a-zA-Z0-9]+)(?:[?#].*)?$/);
  if (muxMatch) return { isVideo: true, type: 'mux', id: muxMatch[1] };

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

/**
 * Build a YouTube thumbnail URL for a video id.
 * Uses `hqdefault.jpg`, which every video is guaranteed to have — unlike
 * `maxresdefault.jpg`, which only exists for videos uploaded in HD and 404s otherwise.
 */
export function getYouTubeThumbnail(id: string, quality: 'hqdefault' | 'maxresdefault' = 'hqdefault'): string {
  return `https://i.ytimg.com/vi/${id}/${quality}.jpg`;
}

/**
 * Local video files that play like animated GIFs (silent, looping, inline),
 * as opposed to the embedded players above.
 */
export function isLoopingVideo(src: string | undefined): boolean {
  return typeof src === 'string' && /\.(mp4|webm)(\?|#|$)/i.test(src);
}

/** Thumbnail for supported hosted video players. */
export function getVideoThumbnail(videoInfo: VideoInfo): string | undefined {
  if (!videoInfo.id) return undefined;
  if (videoInfo.type === 'youtube') return getYouTubeThumbnail(videoInfo.id);
  if (videoInfo.type === 'mux') return `https://image.mux.com/${videoInfo.id}/thumbnail.jpg`;
  return undefined;
}
