'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TocNode = { label?: string | Record<string, string>; href?: string; index?: number; subitems?: TocNode[]; children?: TocNode[] };
type NavEntry = { index: number; fraction: number };
type Bookmark = { id: string; index: number; fraction: number; label?: string };

export type ReaderState = {
  // foliate view instance
  view: (HTMLElement & {
    open: (src: string | File | Blob) => Promise<void>;
    goTo: (t: any) => Promise<any>;
    prev(): void;
    next(): void;
    goLeft?(): void;
    goRight?(): void;
    goToFraction?(fraction: number): void;
  }) | null;

  // foliate snapshot
  bookId?: string;
  title?: string;
  author?: string;
  language?: string;
  rendition?: any;
  coverUrl?: string;
  toc: TocNode[];
  sectionCount: number;

  // reading telemetry
  sectionIndex: number;
  sectionFraction: number;

  // UI
  isSidebarOpen: boolean;
  showChrome: boolean;
  setShowChrome: (show: boolean) => void;
  coverLocked: boolean;

  // history (Back/Forward to last place, not prev/next page)
  history: NavEntry[];
  historyCursor: number;

  // bookmarks
  bookmarks: Bookmark[];

  // actions
  setView(v: ReaderState['view']): void;
  setSnapshot(p: Partial<ReaderState>): void;

  /** Called from foliate events; also manages history on section changes */
  setProgress(index: number, fraction: number): void;

  /** Lockable cover setter so it never changes after first real cover is found */
  setCover(url: string, lock?: boolean): void;

  toggleSidebar(open?: boolean): void;

  /** Back/Forward to last visited section (section-level granularity) */
  navBack(): void;
  navForward(): void;

  /** Create / remove bookmarks at current position */
  addBookmarkAt(index: number, fraction: number, label?: string): void;
  removeBookmark(id: string): void;
};

export const useReaderStore = create<ReaderState>()(
  persist(
    (set, get) => ({
      view: null,
      toc: [],
      sectionCount: 0,
      sectionIndex: 0,
      sectionFraction: 0,

      isSidebarOpen: true,
      showChrome: false,
      setShowChrome: (show) => set({ showChrome: show }),
      coverLocked: false,
      coverUrl: undefined,

      history: [],
      historyCursor: -1,

      bookmarks: [],

      setView: (v) => set({ view: v }),
      setSnapshot: (p) => set(p),

      setProgress: (index, fraction) =>
        set((s) => {
          const prevIdx = s.sectionIndex;

          // Seed history on first progress update
          let history = s.history;
          let cursor = s.historyCursor;
          if (history.length === 0) {
            history = [{ index, fraction }];
            cursor = 0;
          } else {
            // Push when the section changes (keeps history lightweight).
            if (index !== prevIdx) {
              const trimmed = history.slice(0, cursor + 1);
              history = [...trimmed, { index, fraction }];
              cursor = history.length - 1;
            }
          }

          return {
            sectionIndex: index,
            sectionFraction: fraction,
            history,
            historyCursor: cursor,
          };
        }),

      setCover: (url, lock = false) =>
        set((s) => (s.coverLocked ? {} : { coverUrl: url, coverLocked: lock || s.coverLocked })),

      toggleSidebar: (open) => set((s) => ({ isSidebarOpen: open ?? !s.isSidebarOpen })),

      navBack: () => {
        const s = get();
        if (s.historyCursor <= 0) return;
        const target = s.history[s.historyCursor - 1];
        s.view?.goTo({ index: target.index });
        set({ historyCursor: s.historyCursor - 1 });
      },

      navForward: () => {
        const s = get();
        if (s.historyCursor < 0 || s.historyCursor >= s.history.length - 1) return;
        const target = s.history[s.historyCursor + 1];
        s.view?.goTo({ index: target.index });
        set({ historyCursor: s.historyCursor + 1 });
      },

      addBookmarkAt: (index, fraction, label) =>
        set((s) => {
          const id =
            globalThis.crypto?.randomUUID?.() ??
            `bm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          return { bookmarks: [...s.bookmarks, { id, index, fraction, label }] };
        }),

      removeBookmark: (id) =>
        set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.id !== id) })),
    }),
    { name: 'reader-ui' }
  )
);
