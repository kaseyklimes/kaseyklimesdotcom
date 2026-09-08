import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import Carousel from '@/components/ui/Carousel';
import rehypeFigures from './rehype-figures.mjs';
import { splitLayoutBlocks } from './layout-blocks';
import LoopingVideo from '@/components/ui/LoopingVideo';
import { isLoopingVideo } from '@/utils/mediaDetection';

function Markdown({ children, reportPages = false }: { children: string; reportPages?: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, [rehypeFigures, { reportPages }]]}
      components={{
        // Original aspect ratios keep charts readable; figures own the spacing.
        // A video file in an image slot plays silently on loop, like the GIF it replaced.
        img: ({ src, alt, title, width, height }) => isLoopingVideo(typeof src === 'string' ? src : undefined)
          ? <LoopingVideo src={src as string} label={alt || title} />
          // eslint-disable-next-line @next/next/no-img-element
          : <img src={src} alt={alt || ''} title={title} width={width} height={height} loading="lazy" decoding="async" />,
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
