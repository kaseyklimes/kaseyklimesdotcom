// Only standalone markers outside fenced code open layout blocks. Ordinary
// punctuation, Markdown tables, and code examples never become columns.
export function splitLayoutBlocks(content: string) {
  const blocks: { type: 'markdown' | 'columns' | 'carousel'; content: string }[] = [];
  let type: 'markdown' | 'columns' | 'carousel' = 'markdown';
  let lines: string[] = [];
  let fence = '';
  const flush = () => {
    if (lines.join('\n').trim()) blocks.push({ type, content: lines.join('\n') });
    lines = [];
  };
  for (const line of content.split('\n')) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    const fenced = !!fence;
    if (marker) {
      if (!fence) fence = marker[1];
      else if (new RegExp(`^\\s{0,3}${fence[0]}{${fence.length},}\\s*$`).test(line)) fence = '';
    }
    if (!fenced && !marker) {
      if (line.trim() === ':::' && type !== 'carousel') {
        flush(); type = type === 'columns' ? 'markdown' : 'columns'; continue;
      }
      if (line.trim() === '<carousel>' && type === 'markdown') {
        flush(); type = 'carousel'; continue;
      }
      if (line.trim() === '</carousel>' && type === 'carousel') {
        flush(); type = 'markdown'; continue;
      }
    }
    lines.push(!fenced && !marker ? line.replace(/^\^\^/, '') : line);
  }
  flush();
  return blocks;
}
