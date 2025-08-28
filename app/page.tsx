"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";

import { getLibrary, saveLibrary, getProgressMap, removeFromLibrary, hasUploadWithFingerprint, setProgress, type LibraryItem } from "../lib/library";
import Image from "next/image";

interface BookMetadata {
  getCover?: () => Promise<Blob | null>;
}

// Fallback UUID v4 generator for environments without crypto.randomUUID
function generateUuidV4(): string {
  const cryptoObj = (globalThis as { crypto?: Crypto; msCrypto?: Crypto }).crypto || (globalThis as { crypto?: Crypto; msCrypto?: Crypto }).msCrypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  const bytes = new Uint8Array(16);
  if (cryptoObj?.getRandomValues) cryptoObj.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const SAMPLES: LibraryItem[] = [
  { id: "/samples/great_gatsby.epub", title: "The Great Gatsby", author: "F. Scott Fitzgerald", source: "sample", url: "/samples/great_gatsby.epub" },
  { id: "/samples/moby_dick.epub", title: "Moby-Dick", author: "Herman Melville", source: "sample", url: "/samples/moby_dick.epub" },
  { id: "/samples/alice_in_wonderland.epub", title: "Alice in Wonderland", author: "Lewis Carroll", source: "sample", url: "/samples/alice_in_wonderland.epub" },
  { id: "/samples/scarlet_letter.epub", title: "The Scarlet Letter", author: "Nathaniel Hawthorne", source: "sample", url: "/samples/scarlet_letter.epub" },
  { id: "/samples/wizard_of_oz.epub", title: "The Wizard of Oz", author: "L. Frank Baum", source: "sample", url: "/samples/wizard_of_oz.epub" },
  { id: "/samples/holy_bible.epub", title: "The Holy Bible", author: "Various", source: "sample", url: "/samples/holy_bible.epub" },
];

function BookCard({ item, progress, onRemove }: { item: LibraryItem; progress?: number; onRemove?: (id: string) => void }) {
  const router = useRouter();
  const pct = progress ? Math.round(progress * 100) : 0;
  console.log(item.cover);
  return (
    <div className="group relative rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="aspect-[3/4] bg-muted overflow-hidden">
        {item.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <Image src={item.cover} alt="cover" className="h-full w-full object-cover" width={100} height={100} />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">No cover</div>
        )}
        {onRemove ? (
          <Button
            type="button"
            variant="default"
            onClick={() => onRemove(item.id)}
            className="absolute top-2 right-2 inline-flex items-center justify-center h-7 w-7 rounded-md"
            aria-label="Remove from library"
          >
            ×
          </Button>
        ) : null}
      </div>
      <div className="p-3 space-y-1">
        <div className="font-medium truncate" title={item.title}>{item.title}</div>
        {item.author ? (<div className="text-xs text-muted-foreground truncate" title={item.author}>{item.author}</div>) : null}
      </div>
      <div className="p-3 pt-0 flex items-center justify-between">
        <Button size="sm" onClick={() => {
          if (item.url) {
            // For sample books with http URLs, pass the URL
            router.push(`/reader?url=${encodeURIComponent(item.url)}`);
          } else if (item.fileData) {
            // For uploaded books, store in IndexedDB and navigate
            try {
              // Convert base64 back to File and store in IndexedDB
              const binaryString = atob(item.fileData.bytes);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const file = new File([bytes], item.fileData.name, { type: item.fileData.type });
              
              // Store in IndexedDB using the existing persist system
              import("@/lib/persist").then(({ saveLastBook }) => {
                saveLastBook(file).then(() => {
                  router.push('/reader?fromLibrary=true');
                }).catch((error) => {
                  console.error('Failed to store book in IndexedDB:', error);
                  toast.error('Failed to open book. Please try again.');
                });
              });
            } catch (error) {
              console.error('Failed to process book data:', error);
              toast.error('Failed to open book. Please try again.');
            }
          } else {
            toast.info("Please re-upload this book to continue.");
          }
        }}>{progress ? "Continue" : "Open"}</Button>
        {progress ? <div className="text-xs text-muted-foreground">{pct}%</div> : null}
      </div>
    </div>
  );
}

function Section({ title, items = [], progressMap = {}, onRemove }: { title: string; items?: LibraryItem[]; progressMap?: Record<string, number>; onRemove?: (id: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="px-1 font-semibold text-lg">{title}</div>
      {items.length === 0 ? (
        <div className="px-1 text-sm text-muted-foreground">No items yet.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((it) => (
            <BookCard key={it.id ?? it.url} item={it} progress={progressMap[it.id] ?? progressMap[it.url ?? ""]} onRemove={onRemove} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LibraryPage() {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const hiddenHostRef = React.useRef<HTMLDivElement>(null);
  const [library, setLibrary] = React.useState<LibraryItem[]>([]);
  const [sampleCovers, setSampleCovers] = React.useState<Record<string, string>>({});
  const [progressMap, setProgressMap] = React.useState<Record<string, number>>({});
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    const saved = getLibrary();
    setLibrary(saved);
    setProgressMap(getProgressMap());
  }, []);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Extract cover image by using the foliate-view web component offscreen and returning a data URL
  const extractCover = async (src: File | string): Promise<string | undefined> => {
    try {
      await import("@/lib/reader/view").catch(() => {});
      const host = hiddenHostRef.current || document.body;
      const el = document.createElement("foliate-view") as HTMLElement & { open: (src: File | string) => Promise<void>; book?: BookMetadata };
      el.style.position = "absolute";
      el.style.width = "1px";
      el.style.height = "1px";
      el.style.overflow = "hidden";
      el.setAttribute("aria-hidden", "true");
      host.appendChild(el);
      try {
        await el.open(src);
        const book = el.book as BookMetadata;
        if (book && typeof book.getCover === "function") {
          const blob = await book.getCover();
          if (blob) {
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onerror = () => reject(new Error("cover read error"));
              reader.onload = () => resolve(String(reader.result));
              reader.readAsDataURL(blob);
            });
            return dataUrl;
          }
        }
      } finally {
        el.remove();
      }
    } catch {
      // ignore cover errors
    }
    return undefined;
  };

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    const file = e.target.files?.[0];
    if (!file) return;
    const fingerprint = `${file.name}:${file.size}`;
    if (hasUploadWithFingerprint(fingerprint)) {
      toast.info("That book is already in your library");
      inputEl.value = "";
      return;
    }
    const id = `upload:${generateUuidV4()}`;
    
    // Store the file data instead of creating a blob URL
    const storeFileData = async () => {
      try {
        const bytes = await file.arrayBuffer();
        // Convert ArrayBuffer to base64 string for JSON serialization
        const uint8Array = new Uint8Array(bytes);
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64String = btoa(binary);
        const fileData = { 
          name: file.name || "book.epub", 
          type: file.type || "application/epub+zip", 
          bytes: base64String
        };
        
        const itemBase: LibraryItem = { 
          id, 
          title: file.name.replace(/\.[^.]+$/, ""), 
          author: "", 
          source: "upload", 
          fingerprint,
          fileData
        };
        
        // Get cover asynchronously
        extractCover(file).then((cover) => {
          const item: LibraryItem = { ...itemBase, cover };
          const next = [item, ...library];
          setLibrary(next);
          saveLibrary(next);
        }).catch(() => {
          const item: LibraryItem = { ...itemBase };
          const next = [item, ...library];
          setLibrary(next);
          saveLibrary(next);
        }).finally(() => {
          toast.success("Added to library");
          inputEl.value = "";
        });
      } catch (error) {
        console.error("Failed to store file data:", error);
        toast.error("Failed to add book to library");
        inputEl.value = "";
      }
    };
    
    storeFileData();
  };

  const onRemove = (id: string) => {
    const next = removeFromLibrary(id);
    setLibrary(next);
    toast.success("Removed from library");
  };

  const onRemoveFromContinue = (id: string) => {
    // Clear progress for both possible keys (id and url-based key)
    setProgress(id, 0);
    setProgressMap((prev) => ({ ...prev, [id]: 0 }));
    const libItem = library.find((it) => it.id === id);
    const altKey = libItem?.url ?? "";
    if (altKey) {
      setProgress(altKey, 0);
      setProgressMap((prev) => ({ ...prev, [altKey]: 0 }));
    }
    toast.success("Removed from Continue Reading");
  };

  const continueItems = React.useMemo(() => {
    if (!isMounted) return [] as LibraryItem[];
    return library
      .concat(SAMPLES)
      .filter((it) => {
        const key = it.id || it.url || "";
        const p = progressMap[key] ?? progressMap[it.url ?? ""];
        return typeof p === "number" && p > 0 && p < 0.999;
      })
      .slice(0, 12)
      .map((it) => {
        const cover = it.cover ?? sampleCovers[it.id] ?? sampleCovers[it.url ?? ""];
        return cover ? { ...it, cover } : it;
      });
  }, [isMounted, library, progressMap, sampleCovers]);

  // Prefetch sample covers lazily
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const updates: Record<string, string> = {};
      await Promise.all(
        SAMPLES.map(async (s) => {
          if (cancelled || sampleCovers[s.id]) return;
          const cover = await extractCover(s.url!);
          if (cover) updates[s.id] = cover;
        })
      );
    
      if (!cancelled && Object.keys(updates).length) {
        setSampleCovers((prev) => ({ ...prev, ...updates }));
      }
    })();
    return () => { cancelled = true; };
  }, [sampleCovers]);

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="font-semibold">Storytime</div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>Upload</Button>
            <Input type="file" ref={fileRef} onChange={onUpload} className="hidden" />
            <Button asChild>
              <Link href="/reader">Open Reader</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 space-y-10">
        <Section title="Continue Reading" items={continueItems} progressMap={progressMap} onRemove={onRemoveFromContinue} />
        <Section title="My Library" items={library} progressMap={progressMap} onRemove={onRemove} />
        <Section title="Sample Books" items={SAMPLES.map((s)=> ({...s, cover: sampleCovers[s.id]}))} progressMap={progressMap} />
      </main>
      {/* Hidden host for cover extraction */}
      <div ref={hiddenHostRef} className="sr-only" aria-hidden="true" />
    </div>
  );
}

