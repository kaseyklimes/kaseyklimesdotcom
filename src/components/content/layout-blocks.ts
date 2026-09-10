// Only standalone markers outside fenced code open layout blocks. Ordinary
// punctuation, Markdown tables, and code examples never become columns.
export function splitLayoutBlocks(content: string) {
  const blocks: { type: 'markdown' | 'columns' | 'carousel'; content: string; picker?: boolean }[] = [];
  let type: 'markdown' | 'columns' | 'carousel' = 'markdown';
  let lines: string[] = [];
  let fence = '';
  let picker: boolean | undefined;
  const flush = () => {
    if (lines.join('\n').trim()) blocks.push({ type, content: lines.join('\n'), ...(type === 'carousel' ? { picker } : {}) });
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
      // `<carousel>` or `<carousel picker="false">` (hides the slide dropdown).
      const open = type === 'markdown' && line.trim().match(/^<carousel(?:\s+picker=["']?(true|false)["']?)?\s*>$/);
      if (open) {
        flush(); type = 'carousel'; picker = open[1] !== 'false'; continue;
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
