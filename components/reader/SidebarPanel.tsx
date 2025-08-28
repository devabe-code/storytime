"use client";

import * as React from "react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TocList, TOCItem } from "./TocList";
import { BookmarksPanel } from "./BookmarksPanel";
import { Bookmark } from "@/lib/reader/bookmarks";
// import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Book, Bookmark as BookmarkIcon } from "lucide-react";

export function SidebarPanel({
  title,
  author,
  coverUrl,
  toc,
  onSelectHref,
  bookmarks,
  onGoTo,
  onRemove,
  onAddBookmark,
}: {
  title: string;
  author: string;
  coverUrl?: string;
  toc: TOCItem[];
  onSelectHref: (href?: string) => void;
  bookmarks: Bookmark[];
  onGoTo: (bm: Bookmark) => void;
  onRemove: (bm: Bookmark) => void;
  onAddBookmark?: () => void;
}) {
  const [activeTab, setActiveTab] = React.useState("toc");

  // Keyboard shortcuts for tab switching
  React.useEffect(() => {
    const handleKeydown = (ev: KeyboardEvent) => {
      // Only handle when no input elements are focused
      if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) {
        return;
      }

      // T for TOC, M for bookmarks
      if (ev.key === "t" && !ev.ctrlKey && !ev.metaKey) {
        ev.preventDefault();
        setActiveTab("toc");
      } else if (ev.key === "m" && !ev.ctrlKey && !ev.metaKey) {
        ev.preventDefault();
        setActiveTab("bookmarks");
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, []);
  return (
    <div className="flex flex-col w-full h-full min-h-0">
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded bg-muted overflow-hidden">
            {coverUrl ? (
              <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-semibold">{title}</div>
            <div className="text-sm text-muted-foreground">{author}</div>
          </div>
        </div>
        <Separator />
      </div>
      {/* Segmented control with animated slider (outside scroll area to avoid width issues) */}
      <div className="px-3 pb-2">
        <div className="relative w-full">
          <div className="relative h-9 w-full rounded-lg bg-muted overflow-hidden">
            <div
              className={
                "absolute top-1 bottom-1 left-1 right-1 rounded-md bg-background shadow transition-transform duration-300 will-change-transform " +
                (activeTab === "bookmarks" ? " translate-x-[calc(100%-0.5rem)]" : " translate-x-0")
              }
              style={{ width: "calc(50% - 0.25rem)" }}
            />
            <div className="absolute inset-0 grid grid-cols-2">
              <button
                type="button"
                onClick={() => setActiveTab("toc")}
                className={
                  "z-10 inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors " +
                  (activeTab === "toc" ? " text-foreground" : " text-muted-foreground")
                }
                aria-pressed={activeTab === "toc"}
                title="Table of Contents"
              >
                <Book className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("bookmarks")}
                className={
                  "z-10 inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors " +
                  (activeTab === "bookmarks" ? " text-foreground" : " text-muted-foreground")
                }
                aria-pressed={activeTab === "bookmarks"}
                title="Bookmarks"
              >
                <BookmarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0 p-3 overflow-x-hidden">
      <div className="min-w-0 w-full break-words">
        {activeTab === "toc" && (
          toc?.length ? (
              <TocList items={toc} onSelect={onSelectHref} />
          ) : (
            <div className="text-sm text-muted-foreground">No table of contents</div>)
        )}
          {activeTab === "bookmarks" && (
          <BookmarksPanel bookmarks={bookmarks} onGoTo={onGoTo} onRemove={onRemove} onAddBookmark={onAddBookmark} />
        )}
      </div>
      </ScrollArea>
    </div>
  );
}


