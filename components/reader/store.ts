'use client';
import { create } from 'zustand';
import { listBookmarks, removeBookmark as repoRemove, updateBookmarkLabel } from '@/lib/bookmarks-repo';
import type { MutableRefObject } from 'react';

export interface TocNode {
  label?: string | Record<string, string>;
  href?: string;
  index?: number;
  subitems?: TocNode[];
  children?: TocNode[];
}

interface FoliateView {
  goTo: (target: number | string | Record<string, unknown>) => void;
  goToFraction: (fraction: number) => void;
  goLeft: () => void;
  goRight: () => void;
  getSectionFractions?: () => number[];
  renderer?: {
    paginator?: {
      pageCount?: number;
      pages?: unknown[];
    };
  };
}

export interface Bookmark {
  id: string;
  sectionIndex: number;
  sectionFraction: number;
  totalBookFraction?: number; // The actual fraction used by foliate-js for navigation
  text: string;
  timestamp: Date;
}

export interface Annotation {
  id: string;
  sectionIndex: number;
  sectionFraction: number;
  text: string;
  note?: string;
  timestamp: Date;
}

export type PositionMeta = {
  chapterIndex: number
  sectionPages: number
  chapterPage: number
}

interface ReaderState {
  // View instance
  view: FoliateView | null;
  
  // Book metadata
  title: string | null;
  author: string | null;
  toc: TocNode[];
  sectionCount: number;
  coverUrl: string | null;
  
  // Book identification
  bookId: string | null;
  
  // Reading progress
  sectionIndex: number;
  sectionFraction: number;
  positionMeta: PositionMeta | null;
  
  // UI state
  isSidebarOpen: boolean;
  showChrome: boolean;
  sidebarTab: 'toc' | 'bookmarks' | 'annotations';
  
  // Bookmarks and annotations
  bookmarks: Bookmark[];
  annotations: Annotation[];
  
  // Search
  searchQuery: string;
  searchResults: Array<{
    sectionIndex: number;
    sectionFraction: number;
    text: string;
    context: string;
  }>;
  isSearching: boolean;
  
  // History for navigation
  history: Array<{ index: number; fraction: number }>;
  historyIndex: number;
}

interface ReaderActions {
  // View management
  setView: (view: FoliateView | null) => void;
  teardownView: () => void;
  
  // Book metadata
  setSnapshot: (snapshot: {
    title: string | null;
    author: string | null;
    toc: TocNode[];
    sectionCount: number;
  }) => void;
  setCoverUrl: (url: string | null) => void;
  
  // Book identification
  setBookId: (id: string | null) => void;
  
  // Progress
  setProgress: (index: number, fraction: number) => void;
  setLocation: (idx: number, frac: number) => void;
  setPositionMeta: (m: PositionMeta) => void;
  
  // UI
  toggleSidebar: (open?: boolean) => void;
  setShowChrome: (show: boolean) => void;
  setSidebarTab: (tab: 'toc' | 'bookmarks' | 'annotations') => void;
  
  // Bookmarks
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'timestamp'>) => void;
  removeBookmark: (id: string) => void;
  goToBookmark: (bookmark: Bookmark) => void;
  
  // New bookmark actions
  loadBookmarks: (bookId: string) => Promise<void>;
  addBookmarkAtCurrent: () => void;
  deleteBookmark: (id: string) => Promise<void>;
  renameBookmark: (id: string, label: string) => Promise<void>;
  
  // Annotations
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'timestamp'>) => void;
  removeAnnotation: (id: string) => void;
  goToAnnotation: (annotation: Annotation) => void;
  
  // Search
  setSearchQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  goToSearchResult: (result: { sectionIndex: number; sectionFraction: number }) => void;
  clearSearch: () => void;
  
  // Navigation
  navBack: () => void;
  navForward: () => void;
}

type ReaderStore = ReaderState & ReaderActions;



export const useReaderStore = create<ReaderStore>((set, get) => ({
  // Initial state
  view: null,
  title: null,
  author: null,
  toc: [],
  sectionCount: 0,
  coverUrl: null,
  bookId: null,
  sectionIndex: 0,
  sectionFraction: 0,
  positionMeta: null,
  isSidebarOpen: true,
  showChrome: false,
  sidebarTab: 'toc',
  bookmarks: [],
  annotations: [],
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  history: [],
  historyIndex: -1,

  // Actions
  setView: (view) => set({ view }),
  
  teardownView: () => {
    const v = get().view as unknown as {
      renderer?: {
        paginator?: { disconnect?: () => void };
        disconnect?: () => void;
      };
      close?: () => void;
      replaceChildren?: () => void;
    };
    try { v?.renderer?.paginator?.disconnect?.(); } catch {}
    try { v?.renderer?.disconnect?.(); } catch {}
    try { v?.close?.(); } catch {}
    try { v?.replaceChildren?.(); } catch {}
    set({ view: null });
  },
  
  setSnapshot: (snapshot) => set(snapshot),
  
  setCoverUrl: (url) => set({ coverUrl: url }),
  
  setBookId: (id) => set({ bookId: id }),
  
  setPositionMeta: (m) => set({ positionMeta: m }),
  
  setProgress: (index, fraction) => {
    set((s) => {
      
      // Seed history on first progress update
      if (s.history.length === 0) {
        return {
          ...s,
          sectionIndex: index,
          sectionFraction: fraction,
          history: [{ index, fraction }],
          historyIndex: 0,
        };
      }
      
      // Only add to history if we've moved significantly
      const currentPos = index + fraction;
      const lastPos = s.history[s.historyIndex]?.index + s.history[s.historyIndex]?.fraction || 0;
      
      if (Math.abs(currentPos - lastPos) > 0.1) {
        const newHistory = s.history.slice(0, s.historyIndex + 1);
        newHistory.push({ index, fraction });
        
        return {
          ...s,
          sectionIndex: index,
          sectionFraction: fraction,
          history: newHistory,
          historyIndex: newHistory.length - 1,
        };
      }
      
      return {
        ...s,
        sectionIndex: index,
        sectionFraction: fraction,
      };
    });
  },
  
  setLocation: (idx, frac) => set({ sectionIndex: idx, sectionFraction: Math.max(0, Math.min(1, frac)) }),
  
  toggleSidebar: (open) => set((s) => ({ 
    isSidebarOpen: open !== undefined ? open : !s.isSidebarOpen 
  })),
  
  setShowChrome: (show) => set({ showChrome: show }),
  
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  
  addBookmark: (bookmark) => set((s) => ({
    bookmarks: [...s.bookmarks, {
      ...bookmark,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    }],
  })),
  
  removeBookmark: (id) => set((s) => ({
    bookmarks: s.bookmarks.filter(b => b.id !== id),
  })),
  
  goToBookmark: (bookmark) => {
    // Prefer the total book fraction if available (this is what foliate-js uses)
    if (bookmark.totalBookFraction !== undefined && Number.isFinite(bookmark.totalBookFraction)) {
      console.log('Navigating to bookmark using total book fraction:', bookmark.totalBookFraction);
      
      // Use goToFraction directly with the total book fraction
      const view = get().view;
      if (view && typeof view.goToFraction === 'function') {
        view.goToFraction(bookmark.totalBookFraction);
        return;
      }
    }
    
    // Fallback to the old method using section index/fraction
    const idx = bookmark.sectionIndex ?? 0;
    const frac = Math.max(0, Math.min(1, bookmark.sectionFraction ?? 0));

    console.log('Navigating to bookmark using section-based positioning:', { bookmark, idx, frac });

    // Use the reader:goto event system for consistent navigation
    window.dispatchEvent(new CustomEvent('reader:goto', {
      detail: {
        index: Number(idx),
        fraction: Number(frac)
      }
    }));
  },
  
  // New bookmark actions
  loadBookmarks: async (bookId) => {
    const items = await listBookmarks(bookId);
    // Convert repo bookmarks to store bookmarks
    const storeBookmarks = items.map(item => ({
      id: item.id,
      sectionIndex: item.sectionIndex,
      sectionFraction: item.sectionFraction,
      text: item.label,
      timestamp: new Date(item.createdAt)
    }));
    set({ bookmarks: storeBookmarks });
  },

  addBookmarkAtCurrent: () => {
    const { bookmarks, view, toc } = get();
    if (!view) return;

    // Prefer the live position from the reader's ref; fall back to store
    const live = (window as { __readerLastPos?: MutableRefObject<{ idx: number; frac: number }> }).__readerLastPos?.current as { idx: number; frac: number } | undefined;
    const sectionIndex = Number.isFinite(live?.idx) ? live!.idx : get().sectionIndex;
    const sectionFraction = Number.isFinite(live?.frac) ? live!.frac : get().sectionFraction;
    
    const idx = sectionIndex ?? 0;
    const frac = Math.max(0, Math.min(1, sectionFraction ?? 0));
    
    // Debug logging to see what values we're getting
    console.log('Creating bookmark at position:', { idx, frac, sectionIndex, sectionFraction, toc });

    // Calculate the total book fraction using foliate-js logic
    // This is what foliate-js actually uses for navigation
    let totalBookFraction = 0;
    
    if (view.getSectionFractions && typeof view.getSectionFractions === 'function') {
      const fracs = view.getSectionFractions();
      if (fracs.length >= 2) {
        // Use the same logic as foliate-js SectionProgress.getProgress
        const start = fracs[idx] ?? 0;
        const end = fracs[idx + 1] ?? 1;
        const span = Math.max(0, end - start);
        totalBookFraction = start + frac * span;
      } else {
        // Fallback: calculate based on spine length
        const spineLen = (view as FoliateView & { book?: { spine?: { length: number } } }).book?.spine?.length ?? 1;
        totalBookFraction = (idx + frac) / Math.max(1, spineLen);
      }
    } else {
      // Fallback: calculate based on spine length
      const spineLen = (view as FoliateView & { book?: { spine?: { length: number } } }).book?.spine?.length ?? 1;
      totalBookFraction = (idx + frac) / Math.max(1, spineLen);
    }

    // Since Foliate treats the book as one section, use TOC to determine actual chapter
    let actualChapter = 1;
    let actualPage = 1;
    
    if (toc && toc.length > 0) {
      // Map the current fraction to a chapter using TOC
      // This is a heuristic approach since we don't have exact chapter boundaries
      const chapterFraction = frac;
      const chaptersCount = toc.length;
      
      // Estimate which chapter we're in based on the fraction
      const estimatedChapterIndex = Math.floor(chapterFraction * chaptersCount);
      actualChapter = Math.max(1, Math.min(chaptersCount, estimatedChapterIndex + 1));
      
      // Calculate page within chapter (rough estimate)
      const chapterStart = estimatedChapterIndex / chaptersCount;
      const chapterEnd = (estimatedChapterIndex + 1) / chaptersCount;
      const chapterSpan = chapterEnd - chapterStart;
      const positionInChapter = chapterSpan > 0 ? (chapterFraction - chapterStart) / chapterSpan : 0;
      
      // Estimate pages per chapter (rough heuristic)
      const estimatedPagesPerChapter = 20; // Rough estimate
      actualPage = Math.max(1, Math.round(positionInChapter * estimatedPagesPerChapter));
      
      console.log('Chapter estimation:', {
        chapterFraction,
        chaptersCount,
        estimatedChapterIndex,
        actualChapter,
        chapterStart,
        chapterEnd,
        positionInChapter,
        actualPage
      });
    } else {
      // Fallback: use the old method if no TOC
      const v = view as FoliateView & { book?: { spine?: { length: number } } }
      const fracs: number[] = v.getSectionFractions?.() || [];
      
      // Calculate chapter page number
      const start = fracs[idx] ?? 0;
      const end = fracs[idx + 1] ?? 1;
      const span = Math.max(0, end - start);
      const paginator = v.renderer?.paginator;
      const totalPages: number =
        Number(paginator?.pageCount) ||
        Number(paginator?.pages?.length) ||
        400; // stable fallback
      const sectionPages = Math.max(1, Math.round(totalPages * (span || 1 / Math.max(1, fracs.length - 1))));
      actualPage = Math.min(sectionPages, Math.max(1, Math.round(frac * sectionPages)));
      actualChapter = idx + 1;
    }

    const label = `Chapter ${actualChapter}; Page ${actualPage}`;

    // Store the bookmark with the total book fraction (this is what foliate-js uses)
    // Also keep sectionIndex/sectionFraction for backward compatibility
    const newBm: Bookmark = {
      id: crypto.randomUUID(),
      sectionIndex: idx,
      sectionFraction: frac,
      totalBookFraction: totalBookFraction,
      text: label,
      timestamp: new Date(),
    };
    
    // Also persist to IndexedDB if we have a bookId
    const { bookId } = get();
    if (bookId) {
      import('@/lib/bookmarks-repo').then(({ addBookmark }) => {
        addBookmark({
          id: newBm.id,
          bookId,
          label: newBm.text,
          createdAt: Date.now(),
          sectionIndex: newBm.sectionIndex,
          sectionFraction: newBm.sectionFraction,
          cfi: null
        }).catch(console.error);
      }).catch(console.error);
    }
    
    set({ bookmarks: [newBm, ...bookmarks] });
    
    // Log the calculated total book fraction for debugging
    console.log('Bookmark created with total book fraction:', totalBookFraction);
    console.log('Bookmark details:', {
      sectionIndex: idx,
      sectionFraction: frac,
      totalBookFraction,
      label
    });
  },

  deleteBookmark: async (id) => {
    await repoRemove(id);
    set({ bookmarks: get().bookmarks.filter(b => b.id !== id) });
  },

  renameBookmark: async (id, label) => {
    await updateBookmarkLabel(id, label);
    set({ bookmarks: get().bookmarks.map(b => (b.id === id ? { ...b, text: label } : b)) });
  },
  
  addAnnotation: (annotation) => set((s) => ({
    annotations: [...s.annotations, {
      ...annotation,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    }],
  })),
  
  removeAnnotation: (id) => set((s) => ({
    annotations: s.annotations.filter(a => a.id !== id),
  })),
  
  goToAnnotation: (annotation) => {
    const idx = annotation.sectionIndex ?? 0;
    const frac = Math.max(0, Math.min(1, annotation.sectionFraction ?? 0));

    // Use the reader:goto event system for consistent navigation
    window.dispatchEvent(new CustomEvent('reader:goto', {
      detail: {
        index: Number(idx),
        fraction: Number(frac)
      }
    }));
  },
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  search: async (query) => {
    const { view } = get();
    if (!view || !(query ?? '').trim()) {
      set({ searchResults: [], isSearching: false });
      return;
    }
    
    set({ isSearching: true });
    
    try {
      // This would integrate with foliate-js search functionality
      // For now, we'll simulate search results
      const results = [
        {
          sectionIndex: 0,
          sectionFraction: 0.1,
          text: query,
          context: `...found "${query}" in chapter 1...`,
        },
        {
          sectionIndex: 2,
          sectionFraction: 0.3,
          text: query,
          context: `...found "${query}" in chapter 3...`,
        },
      ];
      
      set({ searchResults: results, isSearching: false });
    } catch (error) {
      console.error('Search failed:', error);
      set({ searchResults: [], isSearching: false });
    }
  },
  
  goToSearchResult: (result) => {
    const idx = result.sectionIndex ?? 0;
    const frac = Math.max(0, Math.min(1, result.sectionFraction ?? 0));

    // Use the reader:goto event system for consistent navigation
    window.dispatchEvent(new CustomEvent('reader:goto', {
      detail: {
        index: Number(idx),
        fraction: Number(frac)
      }
    }));
  },
  
  clearSearch: () => set({ searchQuery: '', searchResults: [] }),
  
  navBack: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const target = history[newIndex];
      
      const idx = target.index ?? 0;
      const frac = Math.max(0, Math.min(1, target.fraction ?? 0));

      // Use the reader:goto event system for consistent navigation
      window.dispatchEvent(new CustomEvent('reader:goto', {
        detail: {
          index: Number(idx),
          fraction: Number(frac)
        }
      }));
      
      set({ historyIndex: newIndex });
    }
  },
  
  navForward: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const target = history[newIndex];
      
      const idx = target.index ?? 0;
      const frac = Math.max(0, Math.min(1, target.fraction ?? 0));

      // Use the reader:goto event system for consistent navigation
      window.dispatchEvent(new CustomEvent('reader:goto', {
        detail: {
          index: Number(idx),
          fraction: Number(frac)
        }
      }));
      
      set({ historyIndex: newIndex });
    }
  },
}));
