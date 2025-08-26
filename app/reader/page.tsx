"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast, Toaster } from "sonner";

import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SidebarPanel } from "@/components/reader/SidebarPanel";
import { TopBar } from "@/components/reader/TopBar";
import { ReaderSurface } from "@/components/reader/ReaderSurface";
import { BottomProgress } from "@/components/reader/BottomProgress";
import { setProgress } from "@/lib/library";
import { saveLastBook, loadLastBook } from "@/lib/persist";
import { addBookmark, getBookmarks, removeBookmark, type Bookmark } from "@/lib/reader/bookmarks";

// Register the <foliate-view> web component on the client only
const ensureView = () => import("@/lib/reader/view").catch(() => {});



interface TOCItem { label: string; href?: string; subitems?: TOCItem[] }

// Event detail types
interface RelocateEventDetail {
  fraction?: number;
  location?: { current?: number };
  pageItem?: { label?: string };
}

interface LoadEventDetail {
  doc?: Document;
}

// Foliate view element interface
interface FoliateViewElement extends HTMLElement {
  open: (src: File) => Promise<void>;
  book?: {
    metadata?: {
      title?: string | Record<string, string>;
      author?: string | Record<string, string> | Array<{ name?: string | Record<string, string> }>;
    };
    getCover?: () => Promise<Blob | null>;
    toc?: TOCItem[];
  };
  goLeft?: () => void;
  goRight?: () => void;
  goTo?: (href: string) => void;
  goToFraction?: (fraction: number) => void;
  renderer?: {
    setStyles?: (css: string) => void;
    setAttribute?: (name: string, value: string) => void;
  };
}

const readerCSS = ({ spacing, justify, hyphenate }: { spacing: number; justify: boolean; hyphenate: boolean }) => `
  @namespace epub "http://www.idpf.org/2007/ops";
  html { color-scheme: light dark; }
  @media (prefers-color-scheme: dark) { a:link { color: lightblue; } }
  p, li, blockquote, dd {
    line-height: ${spacing};
    text-align: ${justify ? "justify" : "start"};
    -webkit-hyphens: ${hyphenate ? "auto" : "manual"};
    hyphens: ${hyphenate ? "auto" : "manual"};
    -webkit-hyphenate-limit-before: 3;
    -webkit-hyphenate-limit-after: 2;
    -webkit-hyphenate-limit-lines: 2;
    hanging-punctuation: allow-end last;
    widows: 2;
  }
  [align="left"] { text-align: left; }
  [align="right"] { text-align: right; }
  [align="center"] { text-align: center; }
  [align="justify"] { text-align: justify; }
  pre { white-space: pre-wrap !important; }
  aside[epub|type~="endnote"],
  aside[epub|type~="footnote"],
  aside[epub|type~="note"],
  aside[epub|type~="rearnote"] { display: none; }
`;

export default function ReaderRoutePage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // add these refs near your other refs/state
  const hasRunStartupRef = useRef(false);
  const isOpeningRef = useRef(false);
  const openedKeyRef = useRef<string | null>(null);

  // Helper to compute a stable key for the source
  const sourceKey = useCallback((src: File | string): string => {
    if (typeof src === "string") return `url:${src}`;
    return `upload:${src.name}:${src.size}:${src.type || ""}`;
  }, []);

  const [view, setView] = useState<FoliateViewElement | null>(null);
  const [toc, setToc] = useState<TOCItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [title, setTitle] = useState("Untitled Book");
  const [author, setAuthor] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | undefined>();
  const [fraction, setFraction] = useState(0);
  const [locLabel, setLocLabel] = useState("Loc 0");
  const [flow, setFlow] = useState<"paginated" | "scrolled">("paginated");
  const [justify, setJustify] = useState(true);
  const [hyphenate, setHyphenate] = useState(true);
  const [spacing, setSpacing] = useState(1.4);
  const [bookId, setBookId] = useState<string>("");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const bookIdRef = useRef<string>("");
  const lastRelocateRef = useRef<any | null>(null);

  useEffect(() => { bookIdRef.current = bookId; }, [bookId]);

  useEffect(() => { ensureView(); }, []);
  useEffect(() => { if (view?.renderer?.setAttribute) view.renderer.setAttribute("flow", flow); }, [view, flow]);
  useEffect(() => { if (view) view.renderer?.setStyles?.(readerCSS({ spacing, justify, hyphenate })); }, [view, spacing, justify, hyphenate]);

  useEffect(() => {
    if (!bookId) return;
    setBookmarks(getBookmarks(bookId));
  }, [bookId]);

  function handleAddBookmark() {
    if (!bookId) return;
  
    // try to produce the best possible target from lastRelocate
    const d = lastRelocateRef.current || {};
    let target:
      | { type: "cfi"; value: string }
      | { type: "href"; value: string }
      | { type: "page"; value: number }
      | { type: "fraction"; value: number };
  
    if (d.cfi) {
      target = { type: "cfi", value: d.cfi };
    } else if (d.href) {
      target = { type: "href", value: d.href };
    } else if (d.pageItem?.index != null) {
      target = { type: "page", value: d.pageItem.index };
    } else {
      // safe fallback: jump by fraction
      target = { type: "fraction", value: d.fraction ?? fraction };
    }
  
    const label =
      d?.pageItem?.label ||
      d?.tocItem?.label || // current chapter if available
      locLabel ||          // what you already show (Page/Loc)
      "Bookmark";
  
    const bm: Bookmark = {
      id: crypto.randomUUID(),
      bookId,
      createdAt: Date.now(),
      label,
      target,
    };
  
    addBookmark(bm);
    setBookmarks(getBookmarks(bookId));
    toast.success("Bookmark saved");
    console.log(bookmarks);
    console.log(bm);
    console.log(bookId);
    console.log(getBookmarks(bookId));
    console.log(locLabel);

  }

  const handleRelocate = useCallback((e: CustomEvent) => {
    const d = e.detail || {};
    lastRelocateRef.current = d;               // save it for bookmarks
    setFraction(d.fraction ?? 0);
  
    // nice label for the progress bar; reuse for bookmarks too
    const label = d?.pageItem?.label
      ? `Page ${d.pageItem.label}`
      : d?.location?.current
      ? `Loc ${d.location.current}`
      : "";
    setLocLabel(label);
  
    // keep saving reading progress like you already do
    const id = bookIdRef.current;
    if (id) setProgress(id, d.fraction ?? 0);
  }, []);

  const handleLoad = useCallback(async (e: Event) => {
    const customEvent = e as CustomEvent<LoadEventDetail>;
    const el = (customEvent?.currentTarget || customEvent?.target) as HTMLElement;
    const doc: Document | undefined = customEvent?.detail?.doc;
    if (!doc) return;
    const keyHandler = (ev: KeyboardEvent) => {
      if (ev.key === "ArrowLeft" || ev.key === "h") (el as FoliateViewElement)?.goLeft?.();
      if (ev.key === "ArrowRight" || ev.key === "l") (el as FoliateViewElement)?.goRight?.();
    };
    doc.addEventListener("keydown", keyHandler);
  }, []);

  const openSource = useCallback(async (input: File | string) => {
    // Normalize blob: string -> last saved file if needed
    if (typeof input === "string" && input.startsWith("blob:")) {
      const last = await loadLastBook().catch(() => undefined);
      if (!last) {
        toast.error("This uploaded book is not available after refresh. Please re-upload it.");
        return;
      }
      input = last;
    }

    // Compute a stable key for the would-be source
    let src: File | string = input;
    let key = sourceKey(src);

    // If already opening this exact source, ignore
    if (isOpeningRef.current && openedKeyRef.current === key) return;
    // If this source is already open, ignore
    if (openedKeyRef.current === key && view) return;

    isOpeningRef.current = true;
    try {
      await ensureView();

      // If it's a URL, fetch -> File and persist
      if (typeof src === "string") {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const blob = await res.blob();
        const name = decodeURIComponent(new URL(src, location.href).pathname.split("/").pop() || "book");
        const file = new File([blob], name, { type: blob.type || "application/octet-stream" });
        await saveLastBook(file).catch(() => {});
        src = file;
        key = sourceKey(src);
      } else {
        await saveLastBook(src).catch(() => {});
      }

      // Create fresh element and mount
      const el = document.createElement("foliate-view") as FoliateViewElement;
      el.setAttribute("autohide-cursor", "");
      containerRef.current?.replaceChildren(el);
      setView(el);

      el.addEventListener("relocate", handleRelocate as EventListener);
      el.addEventListener("load", handleLoad);

      await el.open(src as File);

      // Optional: nudge to cover
      try { el?.goRight?.(); } catch {}

      const book = el.book;
      if (!book) throw new Error("Failed to load book");

      const t = book.metadata?.title;
      setTitle(typeof t === "string" ? t : (t?.[Object.keys(t ?? {})[0]] ?? "Untitled Book"));
      const a = book.metadata?.author;

      const getNameFromAuthor = (authorItem: string | Record<string, string> | { name?: string | Record<string, string> } | undefined) => {
        if (!authorItem) return undefined;
        if (typeof authorItem === "string") return authorItem;
        const name = (authorItem as { name?: string | Record<string, string> }).name;
        if (!name) return undefined;
        if (typeof name === "string") return name;
        const firstKey = Object.keys(name ?? {})[0];
        return firstKey ? (name as Record<string, string>)[firstKey] : undefined;
      };

      const fmtAuthor = Array.isArray(a)
        ? a.map((x) => getNameFromAuthor(x)).filter(Boolean).join(", ")
        : getNameFromAuthor(a);
      setAuthor(fmtAuthor || "");

      if (typeof book.getCover === "function") {
        const blob = await book.getCover();
        if (blob) setCoverUrl(URL.createObjectURL(blob));
      }

      setToc(book.toc ?? []);
      setBookId(typeof input === "string" ? input : `upload:${src.name}:${src.size}`);

      if (el?.renderer?.setAttribute) el.renderer.setAttribute("flow", flow);
      el?.renderer?.setStyles?.(readerCSS({ spacing, justify, hyphenate }));

      // Toast exactly once per new key
      if (openedKeyRef.current !== key) {
        openedKeyRef.current = key;
        toast.success("Book loaded");
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to open book");
    } finally {
      isOpeningRef.current = false;
    }
  }, [flow, spacing, justify, hyphenate, handleLoad, handleRelocate, view, sourceKey]);

  const onChooseFile = useCallback(() => fileInputRef.current?.click(), []);
  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      history.replaceState(null, "", location.pathname); // remove stale ?url
      openSource(f);
    }
  }, [openSource]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const item = Array.from(e.dataTransfer.items || []).find(i => i.kind === "file");
    const file = item ? (item as DataTransferItem).getAsFile?.() : null;
    if (file) {
      history.replaceState(null, "", location.pathname); // remove stale ?url
      openSource(file);
    }
  }, [openSource]);
  const onDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);

  useEffect(() => {
    if (hasRunStartupRef.current) return;
    hasRunStartupRef.current = true;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const url = params.get("url");
      const fromLibrary = params.get("fromLibrary");

      if (url?.startsWith("blob:")) {
        const last = await loadLastBook().catch(() => undefined);
        if (last) await openSource(last);
        history.replaceState(null, "", location.pathname);
        return;
      }

      if (fromLibrary === "true") {
        try {
          const last = await loadLastBook().catch(() => undefined);
          if (last) {
            await openSource(last);
            history.replaceState(null, "", location.pathname);
          } else {
            toast.error("Failed to open book from library");
            history.replaceState(null, "", location.pathname);
          }
        } catch (e) {
          console.error("Failed to open book from library:", e);
          toast.error("Failed to open book from library");
          history.replaceState(null, "", location.pathname);
        }
        return;
      }

      if (url) {
        await openSource(url);
        return;
      }

      const last = await loadLastBook().catch(() => undefined);
      if (last) {
        await openSource(last);
        return;
      }
      // else: idle
    })();
  }, [openSource]);

  const onSelectHref = useCallback((href?: string) => {
    if (!href) return;
    view?.goTo?.(href);
    setSidebarOpen(false);
  }, [view]);

  const onGoTo = useCallback((bm: Bookmark) => {
    view?.goTo?.(bm.target.value as string);
  }, [view]);

  const onRemove = useCallback((bm: Bookmark) => {
    removeBookmark(bm.id, bookId);
    setBookmarks(getBookmarks(bookId));
  }, [bookId]);

    return (
    <SidebarProvider defaultOpen={true}>
      <SidebarInset>
        <Sidebar>
          <SidebarPanel
            title={title}
            author={author}
            coverUrl={coverUrl}
            toc={toc}
            onSelectHref={onSelectHref}
            bookmarks={bookmarks}
            onGoTo={onGoTo}
            onRemove={onRemove}
          />
        </Sidebar>

        <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" />

        <main className="flex-1 relative bg-background">
          <TopBar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            onPrev={() => view?.goLeft?.()}
            onNext={() => view?.goRight?.()}
            flow={flow}
            setFlow={(v: "paginated" | "scrolled") => setFlow(v)}
            justify={justify}
            setJustify={(v:boolean)=> setJustify(v)}
            hyphenate={hyphenate}
            setHyphenate={(v:boolean)=> setHyphenate(v)}
            spacing={spacing}
            setSpacing={(v:number)=> setSpacing(v)}
            onChooseFile={onChooseFile}
            coverUrl={coverUrl}
            title={title}
            author={author}
            toc={toc}
            onSelectHref={onSelectHref}
            onBookmark={handleAddBookmark}
          />

          <ReaderSurface containerRef={containerRef} onDrop={onDrop} onDragOver={onDragOver} />

          <BottomProgress fraction={fraction} locLabel={locLabel} onChange={(v)=> view?.goToFraction?.(v)} />
        </main>

        <Toaster richColors position="bottom-right" /> 
      </SidebarInset>
    </SidebarProvider>
  );
}




