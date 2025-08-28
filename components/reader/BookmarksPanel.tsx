// components/reader/BookmarksPanel.tsx
"use client";

import * as React from "react";
import { Button } from "../ui/button";
import { Trash2, Bookmark as BookmarkIcon, Plus } from "lucide-react";
import type { Bookmark as CoreBookmark } from "@/lib/reader/bookmarks";

// Allow an optional snippet without using `any`
export type Bookmark = CoreBookmark & { snippet?: string };

type Props = {
  bookmarks: Bookmark[];
  onGoTo: (bm: Bookmark) => void;
  onRemove: (bm: Bookmark) => void;
  /** Optional: show a CTA in the empty state */
  onAddBookmark?: () => void;
};

export function BookmarksPanel({ bookmarks, onGoTo, onRemove, onAddBookmark }: Props) {
  const hasAny = !!bookmarks?.length;

  // Newest first, memoized
  const sorted = React.useMemo(
    () => (hasAny ? [...bookmarks].sort((a, b) => b.createdAt - a.createdAt) : []),
    [bookmarks, hasAny]
  );

  return (
    <section className="mt-4">
      <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <BookmarkIcon className="h-4 w-4" aria-hidden />
        Bookmarks
        <span className="text-xs text-muted-foreground font-normal ml-auto">
          {bookmarks.length || 0} • B to add • Del to remove last
        </span>
      </h2>

      {!hasAny ? (
        <EmptyState onAddBookmark={onAddBookmark} />
      ) : (
        <ul className="space-y-2">
          {sorted.map((bm) => (
            <BookmarkItem key={bm.id} bm={bm} onGoTo={onGoTo} onRemove={onRemove} />
          ))}
        </ul>
      )}
    </section>
  );
}

function EmptyState({ onAddBookmark }: { onAddBookmark?: () => void }) {
  return (
    <div className="rounded-lg border border-dashed bg-background/40 p-4 text-sm text-muted-foreground flex items-center justify-between">
      {onAddBookmark ? (
        <Button variant="outline" size="sm" onClick={onAddBookmark} className="w-full">
          <Plus className="h-4 w-4 mr-1" />
          Add bookmark
        </Button>
      ) : null}
    </div>
  );
}

function BookmarkItem({
  bm,
  onGoTo,
  onRemove,
}: {
  bm: Bookmark;
  onGoTo: (bm: Bookmark) => void;
  onRemove: (bm: Bookmark) => void;
}) {
  const createdISO = new Date(bm.createdAt).toISOString(); // SSR/CSR-stable
  const createdShort = createdISO.slice(0, 16).replace("T", " "); // "YYYY-MM-DD HH:MM"

  const chapterBreadcrumb = bm.chapterPath && bm.chapterPath.length
    ? bm.chapterPath.join(" › ")
    : bm.target.type === "href" ? chapterFromHref(bm.target.value) : undefined;

  const pageOrLoc = pageOrLocFromText(bm.label);

  return (
    <li>
      <div className="rounded-lg border bg-background/50 transition-colors hover:bg-accent/40">
        <div className="flex items-start gap-2 p-2">
          {/* Main click target */}
          <button
            type="button"
            onClick={() => onGoTo(bm)}
            title={createdISO}
            className="flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md p-1"
          >
            {chapterBreadcrumb && (
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                {chapterBreadcrumb}
              </div>
            )}

            <div className="font-medium text-sm line-clamp-2">{bm.label}</div>

            <div className="mt-1 text-xs text-muted-foreground">
              {pageOrLoc ?? "Saved"} •{" "}
              <time dateTime={createdISO}>{createdShort}</time>
            </div>

            {bm.snippet ? (
              <div className="mt-2 text-xs italic text-muted-foreground line-clamp-2">
                “{bm.snippet}”
              </div>
            ) : null}
          </button>

          {/* Remove action (separate button; no nesting) */}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(bm)}
            aria-label="Remove bookmark"
            title="Remove bookmark (click to confirm)"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}

/* ---------- helpers ---------- */

function chapterFromHref(href: string | undefined): string | undefined {
  if (!href) return;
  try {
    const base = href.split("#")[0]!;
    const file = base.split("/").pop() || base;
    const name = file.replace(/\.[a-z0-9]+$/i, ""); // strip extension
    // try "chapter-12", "ch12", "Chapter_7", etc.
    const m = name.match(/(?:chap(?:ter)?)\s*[-_\s]?(\d+)/i);
    if (m) return `Chapter ${m[1]}`;
    // fallback: prettify file stem (e.g., "acknowledgements")
    return name.replace(/[-_]+/g, " ").trim();
  } catch {
    return;
  }
}

function pageOrLocFromText(label: string | undefined): string | undefined {
  if (!label) return;
  const m = label.match(/\b(?:Page|Loc)\s*\d+\b/i);
  return m ? m[0] : undefined;
}
