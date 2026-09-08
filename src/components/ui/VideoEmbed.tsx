'use client';

import { useState } from 'react';
import Image from 'next/image';
import { VideoInfo, getYouTubeThumbnail } from '@/utils/mediaDetection';

interface VideoEmbedProps {
  videoInfo: VideoInfo;
  title: string;
  sizes?: string;
  priority?: boolean;
}

/**
 * A click-to-play facade for YouTube and Vimeo embeds.
 *
 * The player iframe pulls in roughly half a megabyte of script per video, so
 * it only mounts once the visitor asks for it. Until then the card shows the
 * video's own thumbnail behind a play button, which is what the player would
 * have shown anyway.
 */
export default function VideoEmbed({ videoInfo, title, sizes, priority }: VideoEmbedProps) {
  const [playing, setPlaying] = useState(false);
  // YouTube's largest thumbnail only exists for HD uploads; fall back when it 404s.
  const [thumbnail, setThumbnail] = useState<'maxresdefault' | 'hqdefault'>('maxresdefault');

  if (!videoInfo.isVideo || !videoInfo.id) return null;

  const embedUrl = videoInfo.type === 'youtube'
    ? `https://www.youtube.com/embed/${videoInfo.id}?autoplay=1&rel=0`
    : `https://player.vimeo.com/video/${videoInfo.id}?autoplay=1`;

  if (playing) {
    return (
      <iframe
        className="absolute top-0 left-0 w-full h-full"
        src={embedUrl}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={title}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label={`Play video: ${title}`}
      className="group/play absolute top-0 left-0 w-full h-full bg-black text-left"
      onClick={event => {
        // Cards in the grid sit inside a link to the detail page; play here instead.
        event.preventDefault();
        event.stopPropagation();
        setPlaying(true);
      }}
    >
      {videoInfo.type === 'youtube' && (
        <Image
          src={getYouTubeThumbnail(videoInfo.id, thumbnail)}
          alt=""
          fill
          className="object-cover"
          sizes={sizes || '100vw'}
          priority={priority}
          onError={() => setThumbnail('hqdefault')}
        />
      )}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-12 w-[4.25rem] items-center justify-center rounded-xl bg-black/70 text-white transition-colors group-hover/play:bg-[#ff0000]">
          <svg className="ml-0.5 h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
