import { category, type JourneyRoute } from "./model";
export const JOURNEY_STAGES = [
  "Arrival source",
  "First observed page",
  "Next observed page",
  "Last observed page",
];
export type FlowNode = {
  id: string;
  stage: number;
  label: string;
  category: string | null;
  expandable: boolean;
  sessions: number;
  routes: number[];
  x: number;
  y: number;
  height: number;
};
export type FlowLink = {
  id: string;
  from: string;
  to: string;
  stage: number;
  sessions: number;
  engaged: number;
  measured: number;
  seconds: number;
  routes: number[];
  width: number;
  path: string;
};
export function buildJourneyFlow(
  routes: JourneyRoute[],
  expanded: string[],
  titles: Record<string, string>,
) {
  const sourceCounts = new Map<string, number>(),
    pageCounts = new Map<string, number>();
  for (const r of routes) {
    sourceCounts.set(r.source, (sourceCounts.get(r.source) || 0) + r.sessions);
    for (const page of [r.first, r.next, r.last])
      if (page) pageCounts.set(page, (pageCounts.get(page) || 0) + r.sessions);
  }
  const ranked = (counts: Map<string, number>) =>
    [...counts]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([key]) => key);
  const sources = new Set(ranked(sourceCounts).slice(0, 6));
  const expandedPages = new Set(
    expanded.flatMap((cat) =>
      ranked(pageCounts)
        .filter((p) => category(p) === cat)
        .slice(0, 4),
    ),
  );
  const descriptor = (r: JourneyRoute, stage: number) => {
    if (!stage)
      return {
        key: sources.has(r.source) ? `source:${r.source}` : "other-sources",
        label: sources.has(r.source) ? r.source : "Other sources",
        category: null,
        expandable: false,
      };
    const page = [r.first, r.next, r.last][stage - 1];
    if (!page)
      return {
        key: "no-next",
        label: "No next page observed",
        category: null,
        expandable: false,
      };
    const cat = category(page),
      isExpanded = expanded.includes(cat);
    const label =
      page === "/"
        ? "Home"
        : titles[page] || page.replace(/^\//, "").replaceAll("-", " ");
    return {
      key: isExpanded
        ? expandedPages.has(page)
          ? `page:${page}`
          : `other:${cat}`
        : `category:${cat}`,
      label: isExpanded
        ? expandedPages.has(page)
          ? label
          : `Other ${cat.toLowerCase()} pages`
        : cat,
      category: cat,
      expandable: !isExpanded && cat !== "Home",
    };
  };
  const nodeMap = new Map<string, FlowNode>(),
    linkMap = new Map<string, FlowLink>();
  routes.forEach((r, index) => {
    const ids = [0, 1, 2, 3].map((stage) => {
      const d = descriptor(r, stage),
        id = `${stage}:${d.key}`;
      const node = nodeMap.get(id) || {
        id,
        stage,
        label: d.label,
        category: d.category,
        expandable: d.expandable,
        sessions: 0,
        routes: [],
        x: 0,
        y: 0,
        height: 0,
      };
      node.sessions += r.sessions;
      node.routes.push(index);
      nodeMap.set(id, node);
      return id;
    });
    for (let stage = 0; stage < 3; stage++) {
      const id = JSON.stringify([ids[stage], ids[stage + 1]]);
      const link = linkMap.get(id) || {
        id,
        from: ids[stage],
        to: ids[stage + 1],
        stage,
        sessions: 0,
        engaged: 0,
        measured: 0,
        seconds: 0,
        routes: [],
        width: 0,
        path: "",
      };
      link.sessions += r.sessions;
      link.engaged += [r.firstEngaged, r.nextEngaged, r.lastEngaged][stage];
      link.measured += stage === 1 && !r.next ? 0 : r.sessions;
      link.seconds += [r.firstSeconds, r.nextSeconds, r.lastSeconds][stage];
      link.routes.push(index);
      linkMap.set(id, link);
    }
  });
  const columns = [0, 1, 2, 3].map((stage) =>
    [...nodeMap.values()]
      .filter((n) => n.stage === stage)
      .sort(
        (a, b) => b.sessions - a.sessions || a.label.localeCompare(b.label),
      ),
  );
  const links = [...linkMap.values()];
  // Weighted neighbor ordering reduces crossings without changing any values.
  for (let pass = 0; pass < 4; pass++) {
    const forward = pass % 2 === 0;
    for (const stage of forward ? [1, 2, 3] : [2, 1, 0]) {
      const neighbor = columns[stage + (forward ? -1 : 1)];
      const position = new Map(neighbor.map((n, i) => [n.id, i]));
      const center = (n: FlowNode) => {
        const adjacent = links.filter((l) =>
          forward ? l.to === n.id : l.from === n.id,
        );
        return (
          adjacent.reduce(
            (sum, l) =>
              sum + (position.get(forward ? l.from : l.to) || 0) * l.sessions,
            0,
          ) / n.sessions
        );
      };
      columns[stage].sort(
        (a, b) => center(a) - center(b) || a.label.localeCompare(b.label),
      );
    }
  }
  const sessions = routes.reduce((n, r) => n + r.sessions, 0),
    scale = 360 / Math.max(1, sessions);
  const columnHeight = (col: FlowNode[]) =>
    col.reduce((n, node) => n + Math.max(44, node.sessions * scale) + 18, 0);
  const height = Math.max(410, ...columns.map(columnHeight)) + 60;
  columns.forEach((col, stage) => {
    let y = 40 + (height - 60 - columnHeight(col)) / 2;
    for (const node of col) {
      const slot = Math.max(44, node.sessions * scale);
      node.height = node.sessions * scale;
      node.x = 18 + stage * 310;
      node.y = y + (slot - node.height) / 2;
      y += slot + 18;
    }
  });
  const offsetsOut = new Map<string, number>(),
    offsetsIn = new Map<string, number>();
  links.sort(
    (a, b) =>
      nodeMap.get(a.from)!.y - nodeMap.get(b.from)!.y ||
      nodeMap.get(a.to)!.y - nodeMap.get(b.to)!.y,
  );
  for (const l of links) {
    const a = nodeMap.get(l.from)!,
      b = nodeMap.get(l.to)!;
    l.width = l.sessions * scale;
    const sy = a.y + (offsetsOut.get(a.id) || 0) + l.width / 2,
      ty = b.y + (offsetsIn.get(b.id) || 0) + l.width / 2;
    offsetsOut.set(a.id, (offsetsOut.get(a.id) || 0) + l.width);
    offsetsIn.set(b.id, (offsetsIn.get(b.id) || 0) + l.width);
    l.path = `M ${a.x + 8} ${sy} C ${a.x + 156} ${sy}, ${b.x - 148} ${ty}, ${b.x} ${ty}`;
  }
  return { nodes: columns.flat(), links, height, width: 1150, sessions };
}
