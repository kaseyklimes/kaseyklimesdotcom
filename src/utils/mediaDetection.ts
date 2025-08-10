// Media detection utilities extracted from MasonryGrid

export function isVideoEmbed(url: string): boolean {
  const videoPatterns = [
    /youtube\.com\/watch\?v=/,
    /youtu\.be\//,
    /vimeo\.com\//,
    /\.mp4$/i,
    /\.webm$/i,
    /\.mov$/i,
    /\.avi$/i
  ];
  
  return videoPatterns.some(pattern => pattern.test(url));
}

export function getVideoEmbedId(url: string): string | null {
  // YouTube patterns
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  if (youtubeMatch) return youtubeMatch[1];
  
  // Vimeo patterns
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return vimeoMatch[1];
  
  return null;
}

export function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}