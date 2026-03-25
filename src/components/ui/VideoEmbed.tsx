import Image from 'next/image';
import { VideoInfo } from '@/utils/mediaDetection';

interface VideoEmbedProps {
  videoInfo: VideoInfo;
  title: string;
  sizes?: string;
  priority?: boolean;
}

export default function VideoEmbed({ videoInfo, title, sizes, priority }: VideoEmbedProps) {
  if (!videoInfo.isVideo) return null;

  if (videoInfo.type === 'youtube') {
    return (
      <>
        <Image
          src={`https://i.ytimg.com/vi/${videoInfo.id}/maxresdefault.jpg`}
          alt={`Thumbnail for ${title}`}
          fill
          className="object-cover"
          sizes={sizes || '100vw'}
          priority={priority}
        />
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoInfo.id}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title}
        />
      </>
    );
  }

  // Vimeo
  return (
    <iframe
      className="absolute top-0 left-0 w-full h-full"
      src={`https://player.vimeo.com/video/${videoInfo.id}`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      title={title}
    />
  );
}
