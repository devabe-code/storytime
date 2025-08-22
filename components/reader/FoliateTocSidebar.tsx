'use client';

import { useRouter } from 'next/navigation';
import { BookOpen, Search, Menu, X, ChevronRight } from 'lucide-react';
import { useReaderStore } from './store';
import { useState } from 'react';

// Helper functions for TOC
const fmtLabel = (label: string | Record<string, string> | undefined) =>
  typeof label === 'string' ? label : (label && Object.values(label)[0]) || 'Untitled';

const getKids = (n: { subitems?: unknown[]; children?: unknown[] }) => {
  const items = Array.isArray(n?.subitems) ? n.subitems :
                Array.isArray(n?.children) ? n.children : [];
  return items as Array<{ label?: string | Record<string, string>; href?: string; index?: number; subitems?: unknown[]; children?: unknown[] }>;
};

export default function FoliateTocSidebar() {
  const router = useRouter();
  const isOpen = useReaderStore(s => s.isSidebarOpen);
  const toggleSidebar = useReaderStore(s => s.toggleSidebar);
  const view = useReaderStore(s => s.view);
  const title = useReaderStore(s => s.title);
  const author = useReaderStore(s => s.author);
  const toc = useReaderStore(s => s.toc);

  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  
  const makeKey = (node: { href?: string; label?: string | Record<string, string> }, path: string) => {
    const id = node?.href ? `href:${node.href}` : `lbl:${fmtLabel(node.label)}`;
    return `${path}::${id}`;
  };
  
  const toggleKey = (k: string) => {
    setOpenKeys(p => { 
      const n = new Set(p); 
      if (n.has(k)) {
        n.delete(k);
      } else {
        n.add(k);
      }
      return n; 
    });
  };

  // navigate:
  const onClickNode = (node: { href?: string; index?: number }, view: { goTo: (dest: string | { index: number }) => void } | null) => {
    if (node?.href) view?.goTo(node.href);
    else if (typeof node?.index === 'number') view?.goTo({ index: node.index });
  };

  const goTo = (node: { href?: string; index?: number }) => onClickNode(node, view);

  return (
    <aside
      role="navigation"
      aria-label="Table of contents"
      className={`${isOpen ? 'block' : 'hidden lg:block'} w-80 shrink-0 h-[100dvh] min-h-0 overflow-y-auto border-r bg-background/95 backdrop-blur`}
    >
      {/* Top row */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2 p-3">
          <button className="p-2 hover:bg-muted rounded" onClick={() => router.push('/')}>
            <BookOpen className="h-5 w-5" />
          </button>
          <button className="p-2 hover:bg-muted rounded">
            <Search className="h-5 w-5" />
          </button>
          <button className="p-2 hover:bg-muted rounded">
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto">
            <button className="p-2 hover:bg-muted rounded" onClick={() => toggleSidebar(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Book card */}
        <div className="px-3 pb-3">
          <div className="flex gap-3 items-center">
            <img 
              id="side-bar-cover"
              alt={title ?? 'Cover'} 
              className="h-16 w-12 rounded object-cover bg-muted" 
              style={{ display: 'none' }}
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{title ?? 'Untitled'}</div>
              <div className="text-xs text-muted-foreground truncate">{author ?? '—'}</div>
            </div>
          </div>
        </div>

        <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Table of Contents</div>
      </div>

      {/* Nested TOC */}
      <div className="px-2 pb-4">
        <ul className="space-y-0.5">
          {Array.isArray(toc) && toc.length > 0 ? toc.map((node, i) => (
            <TreeNode
              key={makeKey(node, `root/${i}`)}
              node={node}
              path={`root/${i}`}
              depth={0}
              makeKey={makeKey}
              openKeys={openKeys}
              onToggle={toggleKey}
              onGoTo={goTo}
            />
          )) : (
            <li className="px-2 py-2 text-sm text-muted-foreground">No chapters found.</li>
          )}
        </ul>

        {/* Bookmarks tab could go here later */}
      </div>
    </aside>
  );
}

// TOC Tree Node Component
function TreeNode({
  node, path, depth, makeKey, openKeys, onToggle, onGoTo
}: {
  node: { label?: string | Record<string, string>; href?: string; index?: number; subitems?: unknown[]; children?: unknown[] }; 
  path: string; 
  depth: number;
  makeKey: (n: { href?: string; label?: string | Record<string, string> }, p: string) => string;
  openKeys: Set<string>; 
  onToggle: (k: string) => void; 
  onGoTo: (n: { href?: string; index?: number }) => void;
}) {
  const hasChildren = getKids(node).length > 0;
  const k = makeKey(node, path);
  const open = hasChildren ? openKeys.has(k) : false;

  return (
    <li>
      <div
        className="w-full grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {hasChildren ? (
          <button className="h-5 w-5 inline-grid place-items-center rounded hover:bg-muted/60" onClick={() => onToggle(k)}>
            <ChevronRight className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
        ) : <span className="w-5" />}

        <button className="text-left truncate" onClick={() => onGoTo(node)} title={fmtLabel(node.label)}>
          {fmtLabel(node.label)}
        </button>

        <span className="text-xs text-muted-foreground pr-1" />
      </div>

      {hasChildren && open && (
        <ul className="space-y-0.5">
          {getKids(node).map((child: { label?: string | Record<string, string>; href?: string; index?: number; subitems?: unknown[]; children?: unknown[] }, i: number) => (
            <TreeNode
              key={makeKey(child, `${path}/${i}`)}
              node={child}
              path={`${path}/${i}`}
              depth={depth + 1}
              makeKey={makeKey}
              openKeys={openKeys}
              onToggle={onToggle}
              onGoTo={onGoTo}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
