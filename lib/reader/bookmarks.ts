export type BookmarkTarget =
  | { type: "cfi"; value: string }         // precise for EPUB
  | { type: "href"; value: string }        // chapter href e.g. "ch03.xhtml#id"
  | { type: "page"; value: number }        // fixed-layout/PDF page index
  | { type: "fraction"; value: number };   // fallback: % through the book

export type Bookmark = {
  id: string;          // uuid
  bookId: string;
  createdAt: number;   // Date.now()
  label: string;       // e.g. "Chapter 5" or "Page 12"
  target: BookmarkTarget;
  snippet?: string;    // optional short quote
  // Optional hierarchical chapter breadcrumb, e.g., ["Part I", "Chapter 3", "Section 2"]
  chapterPath?: string[];
};

const KEY = "storytime.bookmarks.v1";

function loadAll(): Record<string, Bookmark[]> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAll(all: Record<string, Bookmark[]>) {
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function getBookmarks(bookId: string): Bookmark[] {
  const all = loadAll();
  return all[bookId] || [];
}

export function addBookmark(bm: Bookmark) {
  const all = loadAll();
  all[bm.bookId] = [bm, ...(all[bm.bookId] || [])];
  saveAll(all);
}

export function removeBookmark(bookId: string, id: string) {
  const all = loadAll();
  all[bookId] = (all[bookId] || []).filter(b => b.id !== id);
  saveAll(all);
}
