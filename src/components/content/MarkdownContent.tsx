import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import Image from 'next/image';
import Carousel from '@/components/ui/Carousel';
import rehypeFigures from './rehype-figures.mjs';
import rehypeImageDimensions from './rehype-image-dimensions.mjs';
import { splitLayoutBlocks } from './layout-blocks';
import LoopingVideo from '@/components/ui/LoopingVideo';
import { isLoopingVideo } from '@/utils/mediaDetection';
import { articleImageSizes } from '@/utils/imageSizes';

type ImageProps = {
  src?: unknown;
  alt?: string;
  title?: string;
  width?: number | string;
  height?: number | string;
  sizes?: string;
  'data-optimize'?: string;
  'data-columns'?: number | string;
  'data-priority'?: string;
};

// Original aspect ratios keep charts readable; figures own the spacing.
// A video file in an image slot plays silently on loop, like the GIF it replaced.
// Local raster images carry dimensions from the rehype pass and go through the
// optimizer, which resizes them to the column and serves AVIF/WebP. Everything
// else (SVG, GIF, remote URLs) stays a plain <img>.
function MarkdownImage(props: ImageProps) {
  const src = typeof props.src === 'string' ? props.src : undefined;
  const { alt, title, width, height } = props;
  if (isLoopingVideo(src)) return <LoopingVideo src={src as string} label={alt || title} />;

  const w = Number(width);
  const h = Number(height);
  if (src && props['data-optimize'] !== undefined && w > 0 && h > 0) {
    const columns = Number(props['data-columns']) || 1;
    return (
      <Image
        src={src}
        alt={alt || ''}
        title={title}
        width={w}
        height={h}
        sizes={props.sizes || articleImageSizes(w, columns)}
        priority={props['data-priority'] !== undefined}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt || ''} title={title} width={width} height={height} loading="lazy" decoding="async" />;
}

function Markdown({ children, reportPages = false }: { children: string; reportPages?: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, [rehypeFigures, { reportPages }], rehypeImageDimensions]}
      components={{
        img: MarkdownImage,
        table: ({ children }) => (
          <div className="markdown-table" tabIndex={0} role="region" aria-label="Scrollable table">
            <table>{children}</table>
          </div>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

export default function MarkdownContent({ content, reportPages = false }: { content: string; reportPages?: boolean }) {
  return <>{splitLayoutBlocks(content).map((block, index) => {
    if (block.type === 'carousel') {
      const images = block.content.split('\n').map(line => line.trim()).filter(Boolean);
      return images.length ? <div key={index} className="my-8 not-prose"><Carousel images={images} alt="Image carousel" /></div> : null;
    }
    if (block.type === 'columns') {
      const columns = block.content.split(/^\|\|\|\s*$/m.test(block.content) ? /^\|\|\|\s*$/m : /(?=^### )/m).filter(col => col.trim());
      return <div key={index} className="markdown-columns">{columns.map((column, i) => <div key={i}><Markdown>{column}</Markdown></div>)}</div>;
    }
    return <Markdown key={index} reportPages={reportPages}>{block.content}</Markdown>;
  })}</>;
}
