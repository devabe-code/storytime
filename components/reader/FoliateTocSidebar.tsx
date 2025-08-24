'use client';


import { Search, X, ChevronRight, Bookmark, MessageSquare, List, MoreHorizontal, Trash2, Pencil, CornerDownRight } from 'lucide-react';
import { useReaderStore } from './store';
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';

// Helper functions for TOC
const fmtLabel = (label: string | Record<string, string> | undefined) =>
  typeof label === 'string' ? label : (label && Object.values(label)[0]) || 'Untitled';

const getKids = (n: { subitems?: unknown[]; children?: unknown[] }) => {
  const items = Array.isArray(n?.subitems) ? n.subitems :
                Array.isArray(n?.children) ? n.children : [];
  return items as Array<{ label?: string | Record<string, string>; href?: string; index?: number; subitems?: unknown[]; children?: unknown[] }>;
};

export default function FoliateTocSidebar() {
  const {
    view, title, author, toc, bookmarks, annotations,
    searchQuery, setSearchQuery, search, searchResults, isSearching, clearSearch, goToSearchResult,
    coverUrl, goToBookmark, removeAnnotation, goToAnnotation,
    deleteBookmark, renameBookmark
  } = useReaderStore();
  const sidebarTab = useReaderStore(s => s.sidebarTab);
  const setSidebarTab = useReaderStore(s => s.setSidebarTab);

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

  const goTo = (node: { href?: string; index?: number }) => {
    if (node?.href) {
      // For href navigation, we'll need to handle this differently
      // For now, fall back to direct view call
      view?.goTo(node.href);
    } else if (typeof node?.index === 'number') {
      // Use the reader:goto event system for consistent navigation
      window.dispatchEvent(new CustomEvent('reader:goto', {
        detail: {
          index: Number(node.index),
          fraction: 0
        }
      }));
    }
  };

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if ((searchQuery ?? '').trim()) {
      await search(searchQuery);
    }
  }, [searchQuery, search]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Helper function to go to bookmark by ID
  const goToBookmarkById = (id: string) => {
    const bookmark = bookmarks.find(b => b.id === id);
    if (bookmark) {
      goToBookmark(bookmark);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Book Info */}
      <div className="p-4 border-b">
        <div className="flex items-start gap-3">
          {coverUrl ? (
            <img
              alt={title ?? 'Cover'}
              src={coverUrl}
              className="h-16 w-12 rounded object-cover bg-muted shrink-0"
            />
          ) : (
            <div className="h-16 w-12 rounded bg-muted shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-sm truncate" title={title ?? 'Unknown Book'}>
              {title ?? 'Unknown Book'}
            </h2>
            {author && (
              <p className="text-xs text-muted-foreground truncate mt-1" title={author}>
                {author}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-3 border-b">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search in book..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clearSearch}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 h-7 w-7"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </form>
      </div>

      {/* Tabs */}
      <Tabs value={sidebarTab} onValueChange={(value) => setSidebarTab(value as 'toc' | 'bookmarks' | 'annotations')} className="flex-1 flex flex-col">
        <TabsList className="flex w-full mt-2">
          <TabsTrigger value="toc" className="flex items-center justify-center p-2">
            <List className="h-4 w-4" />
            {bookmarks.length > 0 && (
              <Badge variant="secondary" className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs">
                {bookmarks.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="bookmarks" className="flex items-center justify-center p-2 relative">
            <Bookmark className="h-4 w-4" />
            {bookmarks.length > 0 && (
              <Badge variant="secondary" className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs">
                {bookmarks.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="annotations" className="flex items-center justify-center p-2 relative">
            <MessageSquare className="h-4 w-4" />
            {annotations.length > 0 && (
              <Badge variant="secondary" className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs">
                {annotations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 px-3 pb-0 sidebar-scrollbar" scrollHideDelay={0}>
          {/* TOC Content */}
          <TabsContent value="toc" className="mt-4 space-y-2">
            {Array.isArray(toc) && toc.length > 0 ? (
              <ul className="space-y-0.5">
                {toc.map((node, i) => (
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
                ))}
              </ul>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <List className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No chapters found</p>
              </div>
            )}
          </TabsContent>

          {/* Bookmarks Content */}
          <TabsContent value="bookmarks" className="mt-4 space-y-2">
            <div className="flex flex-col gap-2 p-2">
              {bookmarks.length === 0 ? (
                <div className="text-sm text-muted-foreground px-1 py-2">No bookmarks yet. Press <kbd className="px-1 py-0.5 rounded bg-muted">B</kbd> or use the header button.</div>
              ) : (
                bookmarks.map((b) => (
                  <BookmarkRow 
                    key={b.id} 
                    b={b} 
                    onGo={goToBookmarkById} 
                    onDelete={deleteBookmark} 
                    onRename={renameBookmark} 
                  />
                ))
              )}
            </div>
          </TabsContent>

          {/* Annotations Content */}
          <TabsContent value="annotations" className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Notes & Annotations</h3>
            </div>
            <Separator />
            {annotations.length > 0 ? (
              <div className="space-y-2">
                {annotations.map((annotation) => (
                  <div
                    key={annotation.id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => goToAnnotation(annotation)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{annotation.text}</p>
                        {annotation.note && (
                          <p className="text-xs text-muted-foreground mt-1">{annotation.note}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(annotation.timestamp)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAnnotation(annotation.id);
                        }}
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No notes yet</p>
                <p className="text-xs">Add notes and annotations as you read</p>
              </div>
            )}
          </TabsContent>

          {/* Search Results */}
          {searchQuery && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Search Results</h3>
                <Button variant="ghost" size="sm" onClick={clearSearch}>
                  Clear
                </Button>
              </div>
              <Separator />
              {isSearching ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                  <p className="text-sm">Searching...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => goToSearchResult(result)}
                    >
                      <p className="text-sm font-medium">{result.text}</p>
                      <p className="text-xs text-muted-foreground mt-1">{result.context}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No results found</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </Tabs>
    </div>
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
        className="w-full grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded px-2 py-1.5 hover:bg-muted cursor-pointer"
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => onGoTo(node)}
      >
        {hasChildren ? (
          <button 
            className="h-5 w-5 inline-grid place-items-center rounded hover:bg-muted/60" 
            onClick={(e) => {
              e.stopPropagation();
              onToggle(k);
            }}
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
        ) : <span className="w-5" />}

        {/* 
          TOC UX Note: When clicking a row that also has a chevron, users can accidentally 
          navigate instead of toggling. The chevron handler already stops propagation—good. 
          Consider making the label area toggle on single click and require a double-click 
          (or a separate icon) to navigate, or vice-versa, depending on preference. 
          Current behavior is consistent, though.
        */}
        <span className="text-left truncate" title={fmtLabel(node.label)}>
          {fmtLabel(node.label)}
        </span>

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

// Helper BookmarkRow component
function BookmarkRow({ b, onGo, onDelete, onRename }: {
  b: { id: string; text: string; sectionIndex: number; sectionFraction: number; totalBookFraction?: number; timestamp: Date }
  onGo: (id: string) => void
  onDelete: (id: string) => void
  onRename: (id: string, label: string) => void
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(b.text || 'Bookmark');
  
  return (
    <div className="group flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 hover:bg-muted/40">
      <button className="flex items-center gap-2 text-left min-w-0" onClick={() => onGo(b.id)}>
        <CornerDownRight className="h-4 w-4 shrink-0" />
        <div className="min-w-0">
          {editing ? (
            <input
              className="w-full bg-transparent outline-none"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={() => { onRename(b.id, label.trim() || 'Bookmark'); setEditing(false); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { onRename(b.id, label.trim() || 'Bookmark'); setEditing(false); }
                if (e.key === 'Escape') { setEditing(false); setLabel(b.text || 'Bookmark'); }
              }}
              autoFocus
            />
          ) : (
            <>
              <div className="font-medium truncate">{b.text || 'Bookmark'}</div>
              <div className="text-xs text-muted-foreground truncate">
                Chapter {b.sectionIndex + 1} · {(b.sectionFraction * 100).toFixed(0)}%
                {b.totalBookFraction !== undefined && (
                  <span className="ml-1 text-blue-500">
                    (Total: {(b.totalBookFraction * 100).toFixed(1)}%)
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4 mr-2" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => onDelete(b.id)}>
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
