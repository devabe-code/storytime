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
import { SettingsDialog } from "@/components/reader/SettingsDialog";

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

const readerCSS = ({
  spacing,
  justify,
  hyphenate,
  fontPercent,
  overrideFont,
  fontFamily,
  fontWeight,
  letterSpacing,
  customFontCSS,
}: {
  spacing: number;
  justify: boolean;
  hyphenate: boolean;
  fontPercent: number;
  overrideFont: boolean;
  fontFamily: string;
  fontWeight: number;
  letterSpacing: number;
  customFontCSS?: string | null;
}) => `
  @namespace epub "http://www.idpf.org/2007/ops";
  ${customFontCSS ?? ""}
  html { color-scheme: light dark; font-size: ${fontPercent}%; }
  ${overrideFont ? `
  html, body, body *:not(i):not(em):not(svg):not([style*="font-family"]) {
    font-family: ${JSON.stringify(fontFamily)}, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Noto Sans", "Liberation Sans", sans-serif !important;
  }
  body, p, li, blockquote, dd, h1, h2, h3, h4, h5, h6 {
    font-weight: ${fontWeight};
    letter-spacing: ${letterSpacing}px;
  }
  ` : ""}
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

// Helpers (robust + CSS/footnote safe)
// What we consider "readable" text containers:
const READABLE_SEL =
  "p, blockquote, li, h1, h2, h3, h4, h5, h6, article, section, main, .textLayer > div"; 
// `.textLayer > div` helps with PDF.js text layers

const EXCLUDE_SEL =
  "script, style, nav, header, footer, aside, figure, figcaption, [hidden], [aria-hidden='true'], [role~='doc-footnote'], [role~='doc-endnote'], [epub\\:type~='footnote'], [epub\\:type~='endnote']";

function nearestReadableBlock(rng: Range): Element | null {
  let node: Node | null = rng.commonAncestorContainer;
  if (node?.nodeType === Node.TEXT_NODE) node = node.parentElement;
  let el = node as Element | null;
  while (el && el !== el.ownerDocument.documentElement) {
    if (el.matches?.(READABLE_SEL) && !el.matches(EXCLUDE_SEL) && hasReadableText(el)) {
      return el;
    }
    el = el.parentElement;
  }
  // If ancestor isn't readable, look *inside* the range for the first readable element
  const doc = rng.commonAncestorContainer.ownerDocument!;
  const candidates = doc.querySelectorAll(READABLE_SEL);
  for (const c of candidates as any as Element[]) {
    if (c.matches(EXCLUDE_SEL)) continue;
    if (!hasReadableText(c)) continue;
    if (rangeIntersectsElement(rng, c)) return c;
  }
  return null;
}

function firstVisibleReadableBlock(doc: Document): Element | null {
  const win = doc.defaultView!;
  const vw = win.innerWidth, vh = win.innerHeight;
  const candidates = Array.from(doc.querySelectorAll(READABLE_SEL)) as Element[];

  // On-screen, not hidden, with enough text, closest to the top
  let best: { el: Element; top: number } | null = null;
  for (const el of candidates) {
    if (el.matches(EXCLUDE_SEL)) continue;
    if (!isVisible(el)) continue;
    if (!hasReadableText(el)) continue;

    const r = el.getBoundingClientRect();
    const onScreen = r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
    if (!onScreen) continue;

    if (!best || r.top < best.top) best = { el, top: r.top };
  }
  return best?.el ?? null;
}

function extractReadableText(doc: Document, rootEl: Element): string {
  // Walk only text nodes under allowed elements, skip hidden/assistive-only pieces
  const walker = doc.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
    acceptNode(node: Node) {
      const t = node.nodeValue ?? "";
      if (!t.trim()) return NodeFilter.FILTER_REJECT;
      const el = (node as Text).parentElement;
      if (!el) return NodeFilter.FILTER_REJECT;
      if (el.closest(EXCLUDE_SEL)) return NodeFilter.FILTER_REJECT;
      if (!isVisible(el)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let out = "";
  let n: Node | null;
  while ((n = walker.nextNode())) {
    out += (n.nodeValue || "") + " ";
    if (out.length > 600) break; // cap work
  }
  return normalizeWs(out).trim();
}

function isVisible(el: Element): boolean {
  const st = (el.ownerDocument?.defaultView as any).getComputedStyle(el);
  if (!st) return true;
  if (st.display === "none" || st.visibility === "hidden") return false;
  // avoid picking gigantic wrappers like <body>
  const r = el.getBoundingClientRect();
  return r.width > 1 && r.height > 1;
}

function hasReadableText(el: Element): boolean {
  // quick check without full walk
  const txt = normalizeWs(el.textContent || "");
  // must contain some letters (not just numbers/punct/TOC dots)
  return /[A-Za-z\u00C0-\u024F]/.test(txt) && txt.length >= 30;
}

function rangeIntersectsElement(r: Range, el: Element): boolean {
  const elRange = el.ownerDocument!.createRange();
  try {
    elRange.selectNodeContents(el);
    return r.compareBoundaryPoints(Range.END_TO_START, elRange) < 0 &&
           r.compareBoundaryPoints(Range.START_TO_END, elRange) > 0;
  } catch {
    return false;
  } finally {
    elRange.detach?.();
  }
}

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, " ");
}

function firstSentence(s: string): string {
  // Prefer Intl.Segmenter if available
  // @ts-ignore
  const Seg = (Intl as any)?.Segmenter;
  if (Seg) {
    const seg = new Seg(undefined, { granularity: "sentence" });
    const it = seg.segment(s)[Symbol.iterator]();
    const first = it.next().value?.segment?.trim();
    return first || s;
  }
  // Simple fallback: up to first sentence-ish delimiter
  const m = s.match(/^[^.!?。！？]*[.!?。！？]/);
  return (m?.[0] || s).trim();
}

function clipSnippet(s: string, max = 140): string {
  const t = normalizeWs(s).trim();
  return t.length > max ? t.slice(0, max - 1) + "…" : t;
}

// Compute a hierarchical chapter path from the TOC for a given href
function getChapterPathFromToc(tocItems: TOCItem[] | undefined, href: string): string[] | undefined {
  if (!tocItems || !href) return undefined;
  const norm = (s: string) => {
    try {
      const base = s.split("#")[0] || s;
      return decodeURIComponent(base);
    } catch {
      return s.split("#")[0] || s;
    }
  };
  const target = norm(href);

  const path: string[] = [];
  let best: string[] | undefined;

  const walk = (items: TOCItem[], trail: string[]) => {
    for (const it of items) {
      const label = it.label || "";
      const nextTrail = label ? [...trail, label] : trail;
      const itemHref = it.href ? norm(it.href) : undefined;

      if (itemHref && (target === itemHref || target.endsWith(itemHref) || itemHref.endsWith(target))) {
        // exact or suffix match
        if (!best || nextTrail.length > best.length) {
          best = nextTrail;
        }
      }
      if (it.subitems?.length) walk(it.subitems, nextTrail);
    }
  };

  walk(tocItems, path);
  return best && best.length ? best : undefined;
}

export default function ReaderRoutePage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastDocRef = useRef<Document | null>(null);
  
  // Track the active document + visible range
  const lastVisibleRangeRef = useRef<Range | null>(null);

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
  const [fontPercent, setFontPercent] = useState(100);
  const [overrideFont, setOverrideFont] = useState(false);
  const [fontFamily, setFontFamily] = useState<string>("Georgia");
  const [fontWeight, setFontWeight] = useState<number>(400);
  const [letterSpacing, setLetterSpacing] = useState<number>(0);
  const [customFont, setCustomFont] = useState<{ family: string; url: string; format?: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Layout settings
  const [overrideLayout, setOverrideLayout] = useState(false);
  const [paragraphMargin, setParagraphMargin] = useState(0.5); // em
  const [paragraphLineSpacing, setParagraphLineSpacing] = useState(1.4);
  const [paragraphWordSpacing, setParagraphWordSpacing] = useState(0);
  const [paragraphLetterSpacing, setParagraphLetterSpacing] = useState(0);
  const [textIndent, setTextIndent] = useState(0);
  const [pageMarginTop, setPageMarginTop] = useState(48);
  const [pageMarginBottom, setPageMarginBottom] = useState(48);
  const [pageMarginLeft, setPageMarginLeft] = useState(48);
  const [pageMarginRight, setPageMarginRight] = useState(48);
  const [columnGapPct, setColumnGapPct] = useState(7); // aligns with paginator default
  const [maxColumns, setMaxColumns] = useState(2);
  const [maxInlineSize, setMaxInlineSize] = useState(720);
  const [maxBlockSize, setMaxBlockSize] = useState(1440);
  const [showTopBar, setShowTopBar] = useState(true);
  const [showBottomBar, setShowBottomBar] = useState(true);
  const [showRemainingTime, setShowRemainingTime] = useState(false);
  const [showRemainingPages, setShowRemainingPages] = useState(false);
  const [showReadingProgress, setShowReadingProgress] = useState(true);
  const [progressStyle, setProgressStyle] = useState<"percent" | "page">("percent");
  const [applyInScrollMode, setApplyInScrollMode] = useState(true);
  const [bookId, setBookId] = useState<string>("");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  const bookIdRef = useRef<string>("");
  const lastRelocateRef = useRef<any | null>(null);

  useEffect(() => { bookIdRef.current = bookId; }, [bookId]);

  useEffect(() => { ensureView(); }, []);
  useEffect(() => { if (view?.renderer?.setAttribute) view.renderer.setAttribute("flow", flow); }, [view, flow]);
  // Build @font-face CSS when a custom font is present
  const customFontCSS = React.useMemo(() => {
    if (!customFont) return null;
    const fmt = customFont.format || undefined;
    const formatDecl = fmt ? ` format("${fmt}")` : "";
    return `@font-face { font-family: ${JSON.stringify(customFont.family)}; src: url(${JSON.stringify(customFont.url)})${formatDecl}; font-display: swap; }`;
  }, [customFont]);

  useEffect(() => {
    if (!view) return;
    view.renderer?.setStyles?.(readerCSS({ spacing, justify, hyphenate, fontPercent, overrideFont, fontFamily: customFont?.family ?? fontFamily, fontWeight, letterSpacing, customFontCSS }));
    // Layout overrides via foliate-paginator attributes and CSS variables
    if (overrideLayout || (flow === "scrolled" && applyInScrollMode)) {
      const r = view.renderer as any;
      r?.setAttribute?.("gap", `${columnGapPct}%`);
      r?.setAttribute?.("margin", `${Math.max(pageMarginTop, pageMarginBottom)}px`);
      r?.setAttribute?.("max-inline-size", `${maxInlineSize}px`);
      r?.setAttribute?.("max-block-size", `${maxBlockSize}px`);
      r?.setAttribute?.("max-column-count", `${maxColumns}`);
      // Paragraph-level CSS
      const family = customFont?.family ?? fontFamily;
      const layoutCss = `
        ${overrideFont ? `html, body, body *:not(i):not(em):not(svg):not([style*="font-family"]) { font-family: ${JSON.stringify(family)}, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Noto Sans", "Liberation Sans", sans-serif !important; }` : ``}
        p, li, blockquote, dd {
          margin-block: ${paragraphMargin}em;
          line-height: ${paragraphLineSpacing};
          word-spacing: ${paragraphWordSpacing}px;
          letter-spacing: ${paragraphLetterSpacing}px;
          text-indent: ${textIndent}em;
        }
        @page { margin: ${pageMarginTop}px ${pageMarginRight}px ${pageMarginBottom}px ${pageMarginLeft}px; }
      `;
      (view.renderer as any)?.setStyles?.([customFontCSS ?? "", layoutCss]);
    }
  }, [view, spacing, justify, hyphenate, fontPercent, overrideFont, fontFamily, letterSpacing, customFontCSS, customFont, paragraphMargin, paragraphLineSpacing, paragraphWordSpacing, paragraphLetterSpacing, textIndent, pageMarginTop, pageMarginBottom, pageMarginLeft, pageMarginRight, columnGapPct, maxColumns, maxInlineSize, maxBlockSize, flow, applyInScrollMode]);





  // Global 'b' shortcut so it works even when focus is outside the book document
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "b" || ev.ctrlKey || ev.metaKey) return;
      // ignore when typing in inputs/textareas or contenteditable
      const t = ev.target as Element | null;
      if (t && (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || (t as any).isContentEditable)) return;
      ev.preventDefault();
      handleAddBookmark();
      console.log("b");
    };
    document.addEventListener("keydown", onKey, { capture: true });
    return () => document.removeEventListener("keydown", onKey, { capture: true } as any);
  }, []);

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
  
    const snippet = getBookmarkSnippet() || undefined;

    // Try to compute a nested chapter path using current TOC and href
    const hrefForPath = d.href || (d.tocItem?.href) || (target.type === "href" ? (target as any).value : undefined);
    const chapterPath = hrefForPath ? getChapterPathFromToc(toc, hrefForPath) : undefined;

    const bm: Bookmark = {
      id: crypto.randomUUID(),
      bookId,
      createdAt: Date.now(),
      label,
      target,
      snippet,
      chapterPath,
    };
  
    addBookmark(bm);
    setBookmarks(getBookmarks(bookId));
    toast.success("Bookmark saved");

  }

  // Gets first paragraph from view
  function getBookmarkSnippet(): string | null {
    const doc = lastDocRef.current;
    if (!doc) return null;

    // 1) User selection (best)
    const sel = doc.getSelection?.() ?? doc.defaultView?.getSelection?.();
    if (sel && sel.rangeCount) {
      const t = sel.toString().trim();
      if (t) return clipSnippet(t);
    }

    // 2) From the visible range (best fallback)
    const rng = lastVisibleRangeRef.current;
    if (rng) {
      const el = nearestReadableBlock(rng);
      const text = el ? extractReadableText(doc, el) : "";
      if (text) return firstSentence(clipSnippet(text));
    }

    // 3) First visible readable block on screen
    const el = firstVisibleReadableBlock(doc);
    if (el) {
      const text = extractReadableText(doc, el);
      if (text) return firstSentence(clipSnippet(text));
    }

    return null;
  }



  const handleRelocate = useCallback((e: CustomEvent) => {
    const d = e.detail || {};
    
    // keep the latest visible range (emitted by paginator/fxl relocate)
    if (d.range) {
      lastVisibleRangeRef.current = d.range;
    }
    
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
    
    // keep the latest loaded section/page doc
    if (customEvent.detail?.doc) {
      lastDocRef.current = customEvent.detail.doc;
    }
    
    const keyHandler = (ev: KeyboardEvent) => {
      if (ev.key === "ArrowLeft" || ev.key === "h") (el as FoliateViewElement)?.goLeft?.();
      if (ev.key === "ArrowRight" || ev.key === "l") (el as FoliateViewElement)?.goRight?.();
      
      // Bookmark shortcuts
      if (ev.key === "b" && !ev.ctrlKey && !ev.metaKey) {
        ev.preventDefault();
        handleAddBookmark();
      }
    };
    doc.addEventListener("keydown", keyHandler, { capture: true });
    lastDocRef.current = doc;
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
      el.addEventListener("load", handleLoad as EventListener);

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
      el?.renderer?.setStyles?.(readerCSS({ spacing, justify, hyphenate, fontPercent, overrideFont, fontFamily: customFont?.family ?? fontFamily, fontWeight, letterSpacing, customFontCSS }));

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

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (view) {
        try { view.removeEventListener('relocate', handleRelocate as any) } catch {}
        try { view.removeEventListener('load', handleLoad as any) } catch {}
        // removing the element will trigger disconnectedCallback -> renderer.destroy()
        try { view.remove() } catch {}
      }
    };
  }, [view, handleRelocate, handleLoad]);

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
    // Add confirmation dialog to prevent accidental deletion
    if (confirm(`Are you sure you want to remove the bookmark "${bm.label}"?`)) {
      removeBookmark(bookId, bm.id);
      setBookmarks(getBookmarks(bookId));
      toast.success("Bookmark removed");
    }
  }, [bookId]);

  const onOpenSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  // Global keyboard shortcuts for bookmark management
  useEffect(() => {
    const handleGlobalKeydown = (ev: KeyboardEvent) => {
      // Only handle when no input elements are focused
      if (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Delete/Backspace to remove last bookmark
      if ((ev.key === "Delete" || ev.key === "Backspace") && !ev.ctrlKey && !ev.metaKey) {
        if (bookmarks.length > 0) {
          ev.preventDefault();
          const lastBookmark = bookmarks[0]; // bookmarks are already sorted by newest first
          onRemove(lastBookmark);
        }
      }
    };

    document.addEventListener("keydown", handleGlobalKeydown);
    return () => document.removeEventListener("keydown", handleGlobalKeydown);
  }, [bookmarks, onRemove]);

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
            onAddBookmark={handleAddBookmark}
          />
        </Sidebar>

        <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" />

        <main className="flex-1 relative bg-background">
          <TopBar
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            onPrev={() => view?.goLeft?.()}
            onNext={() => view?.goRight?.()}
            onChooseFile={onChooseFile}
            coverUrl={coverUrl}
            title={title}
            author={author}
            toc={toc}
            onSelectHref={onSelectHref}
            onBookmark={handleAddBookmark}
            onOpenSettings={onOpenSettings}
            onFontSmaller={() => setFontPercent(p => Math.max(80, Math.round((p - 10) / 5) * 5))}
            onFontLarger={() => setFontPercent(p => Math.min(200, Math.round((p + 10) / 5) * 5))}
            fontPercent={fontPercent}
          />

          {showTopBar && null /* top bar already rendered */}
          <ReaderSurface containerRef={containerRef} onDrop={onDrop} onDragOver={onDragOver} />

          {showBottomBar && (
            <BottomProgress fraction={fraction} locLabel={progressStyle === "percent" ? locLabel : (lastRelocateRef.current?.pageItem?.label ? `Page ${lastRelocateRef.current.pageItem.label}` : locLabel)} onChange={(v)=> view?.goToFraction?.(v)} />
          )}

          <SettingsDialog
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            overrideFont={overrideFont}
            setOverrideFont={setOverrideFont}
            fontFamily={customFont?.family ?? fontFamily}
            setFontFamily={(v) => setFontFamily(v)}
            availableFamilies={["Georgia", "Times New Roman", "Merriweather", "Inter", "Roboto", "Arial", "Helvetica", "Serif", "Sans-Serif"]}
            fontPercent={fontPercent}
            setFontPercent={(v) => setFontPercent(Math.max(50, Math.min(300, Math.round(v))))}
            fontWeight={fontWeight}
            setFontWeight={(v) => setFontWeight(Math.max(100, Math.min(900, Math.round(v / 50) * 50)))}
            lineHeight={spacing}
            setLineHeight={setSpacing}
            letterSpacing={letterSpacing}
            setLetterSpacing={setLetterSpacing}
            hyphenate={hyphenate}
            setHyphenate={setHyphenate}
            justify={justify}
            setJustify={setJustify}
            customFont={customFont}
            onAddCustomFont={async (family, file) => {
              try {
                const url = URL.createObjectURL(file);
                setCustomFont({ family, url, format: undefined });
                setFontFamily(family);
                setOverrideFont(true);
                toast.success("Custom font added");
              } catch (e) {
                console.error(e);
                toast.error("Failed to add custom font");
              }
            }}
            overrideLayout={overrideLayout}
            setOverrideLayout={setOverrideLayout}
            paragraphMargin={paragraphMargin}
            setParagraphMargin={setParagraphMargin}
            paragraphLineSpacing={paragraphLineSpacing}
            setParagraphLineSpacing={setParagraphLineSpacing}
            paragraphWordSpacing={paragraphWordSpacing}
            setParagraphWordSpacing={setParagraphWordSpacing}
            paragraphLetterSpacing={paragraphLetterSpacing}
            setParagraphLetterSpacing={setParagraphLetterSpacing}
            textIndent={textIndent}
            setTextIndent={setTextIndent}
            pageMarginTop={pageMarginTop}
            setPageMarginTop={setPageMarginTop}
            pageMarginBottom={pageMarginBottom}
            setPageMarginBottom={setPageMarginBottom}
            pageMarginLeft={pageMarginLeft}
            setPageMarginLeft={setPageMarginLeft}
            pageMarginRight={pageMarginRight}
            setPageMarginRight={setPageMarginRight}
            columnGapPct={columnGapPct}
            setColumnGapPct={setColumnGapPct}
            maxColumns={maxColumns}
            setMaxColumns={setMaxColumns}
            maxInlineSize={maxInlineSize}
            setMaxInlineSize={setMaxInlineSize}
            maxBlockSize={maxBlockSize}
            setMaxBlockSize={setMaxBlockSize}
            showTopBar={showTopBar}
            setShowTopBar={setShowTopBar}
            showBottomBar={showBottomBar}
            setShowBottomBar={setShowBottomBar}
            showRemainingTime={showRemainingTime}
            setShowRemainingTime={setShowRemainingTime}
            showRemainingPages={showRemainingPages}
            setShowRemainingPages={setShowRemainingPages}
            showReadingProgress={showReadingProgress}
            setShowReadingProgress={setShowReadingProgress}
            progressStyle={progressStyle}
            setProgressStyle={setProgressStyle}
            applyInScrollMode={applyInScrollMode}
            setApplyInScrollMode={setApplyInScrollMode}
          />
        </main>

        <Toaster richColors position="bottom-right" /> 
      </SidebarInset>
    </SidebarProvider>
  );
}




