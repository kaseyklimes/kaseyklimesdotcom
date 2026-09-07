// Group Markdown images structurally, never by flattening React children to text.
// This preserves links/emphasis and prevents figures from nesting inside <p>.
const element = (tagName, children, properties = {}) => ({ type: 'element', tagName, properties, children });
const isElement = (node, tag) => node.type === 'element' && node.tagName === tag;
const isWhitespace = node => node.type === 'text' && !node.value.trim();
const isImage = node => isElement(node, 'img') ||
  (isElement(node, 'a') && node.children.some(child => isElement(child, 'img')) && node.children.every(child => isElement(child, 'img') || isWhitespace(child)));

function splitParagraph(node) {
  if (!isElement(node, 'p') || !node.children.some(isImage)) return [node];
  const blocks = [];
  let run = [];
  let images = false;
  const flush = () => {
    if (run.some(child => !isWhitespace(child))) {
      blocks.push(images
        ? element('figure', [element('div', run, { className: ['markdown-images'] })])
        : element('p', run));
    }
    run = [];
  };
  for (const child of node.children) {
    if (!isWhitespace(child) && isImage(child) !== images) {
      flush();
      images = isImage(child);
    }
    run.push(child);
  }
  flush();
  return blocks;
}

export default function rehypeFigures({ reportPages = false } = {}) {
  return tree => {
    function visit(parent) {
      if (!parent.children) return;
      for (const child of parent.children) visit(child);
      parent.children = parent.children.flatMap(splitParagraph);
      for (let i = 0; i < parent.children.length; i++) {
        const figure = parent.children[i];
        if (!isElement(figure, 'figure')) continue;
        let nextIndex = i + 1;
        while (isWhitespace(parent.children[nextIndex] || {})) nextIndex++;
        const next = parent.children[nextIndex];
        if (!next || !isElement(next, 'p')) continue;
        const first = next.children[0];
        if (first?.type !== 'text' || !/^Caption:\s*/i.test(first.value)) continue;
        first.value = first.value.replace(/^Caption:\s*/i, '');
        figure.children.push(element('figcaption', next.children));
        parent.children.splice(i + 1, nextIndex - i);
      }
    }
    visit(tree);
    if (reportPages) addReportNavigation(tree);
  };
}


// Opt-in document navigation keeps ordinary blog figures unchanged.
function addReportNavigation(tree) {
  const figures = tree.children.filter(node => isElement(node, 'figure'));
  if (!figures.length) return;
  const text = value => ({ type: 'text', value });
  const link = (label, href, properties = {}) => element('a', [text(label)], { href, ...properties });
  const external = { target: '_blank', rel: ['noopener', 'noreferrer'] };
  const previews = [];
  figures.forEach((figure, index) => {
    figure.properties = { ...figure.properties, id: `report-page-${index + 1}`, className: ['report-page'] };
    let source;
    function linkImages(parent) {
      parent.children = parent.children.map(child => {
        if (isElement(child, 'img')) {
          source ||= child.properties.src;
          return element('a', [child], { href: child.properties.src, ...external, ariaLabel: `View report image ${index + 1} full size` });
        }
        if (isElement(child, 'a')) {
          source ||= child.children.find(node => isElement(node, 'img'))?.properties.src;
        } else if (child.children) linkImages(child);
        return child;
      });
    }
    linkImages(figure);
    previews.push(element('a', [
      ...(source ? [element('img', [], { src: source, alt: '', loading: 'lazy', decoding: 'async' })] : []),
      element('span', [text(`Page ${index + 1}`)]),
    ], { href: `#report-page-${index + 1}`, ariaLabel: `Go to report page ${index + 1}` }));
    const controls = [element('span', [text(`Page ${index + 1} of ${figures.length}`)])];
    if (index > 0) controls.push(link('Previous', `#report-page-${index}`));
    if (index + 1 < figures.length) controls.push(link('Next', `#report-page-${index + 2}`));
    if (source) controls.push(link('View full size ↗', source, external));
    let caption = figure.children.find(node => isElement(node, 'figcaption'));
    if (!caption) {
      caption = element('figcaption', []);
      figure.children.push(caption);
    }
    caption.children.push(element('nav', controls, { className: ['report-page-controls'], ariaLabel: `Report page ${index + 1}` }));
  });
  const index = element('details', [
    element('summary', [text(`Browse report pages (${figures.length})`)]),
    element('nav', previews, { ariaLabel: 'Report pages' }),
  ], { className: ['report-index'] });
  tree.children.splice(tree.children.indexOf(figures[0]), 0, index);
}
