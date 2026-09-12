import fs from 'node:fs';
import path from 'node:path';
import { getContentBySlug } from '@/utils/content';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Validate the slug through the existing loader before using it as a file path.
  const post = getContentBySlug('blog', slug);
  if (!post || post.private) return new Response('Not found', { status: 404 });
  const markdown = fs.readFileSync(path.join(process.cwd(), 'content/blog', `${slug}.md`), 'utf8');
  return new Response(markdown, { headers: {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
  } });
}
