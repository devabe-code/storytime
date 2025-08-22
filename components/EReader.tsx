'use client';

import { useEffect, useRef, useState } from 'react';

type FoliateViewEl = HTMLElement & {
  open: (src: string | File | Blob | { /* any book interface */ }) => Promise<void>;
  goTo: (dest: any) => Promise<void>;
  prev: () => void;
  next: () => void;
};

export default function EReader({
  initialSrc,
}: {
  initialSrc?: string; // e.g., "/books/example.epub" in /public/books
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<FoliateViewEl | null>(null);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState<{ index: number; fraction: number } | null>(null);

  // Load the custom element definition as a browser-side module
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Important: import the module by URL so it doesn't get bundled by Next
      await import(/* @vite-ignore */ '@/public/foliate-js/view.js');
      if (cancelled) return;

      // Create and attach <foliate-view/>
      const view = document.createElement('foliate-view') as FoliateViewEl;

      // Optional: set paginator attributes (see “Tuning pagination” below)
      view.setAttribute('flow', 'paginated');         // or 'scrolled'
      view.setAttribute('gap', '6%');                 // % of page size
      view.setAttribute('margin', '56px');            // px; header+footer
      view.setAttribute('max-inline-size', '720px');  // px; column width
      view.setAttribute('max-block-size', '1000px');  // px; page height
      view.setAttribute('animated', '');              // enable slide animation

      // Size the host + element
      view.style.display = 'block';
      view.style.height = '100%';
      view.style.width = '100%';

      // Listen for location/progress changes
      view.addEventListener('relocate', (e: any) => {
        const { index, fraction } = e.detail ?? {};
        setProgress({ index, fraction });
      });

      // Allow overlays (e.g., highlights) later if you use overlayer.js
      // view.addEventListener('create-overlayer', (e: any) => {
      //   const { attach } = e.detail;
      //   // attach(myOverlay)
      // });

      hostRef.current!.appendChild(view);
      viewRef.current = view;
      setReady(true);

      // Open initial book if provided
      if (initialSrc) {
        // Tip: use a public URL or a Blob/File. Avoid SSR routes here.
        await view.open(initialSrc);
      }
    })();

    return () => {
      cancelled = true;
      if (viewRef.current) {
        viewRef.current.remove(); // detach custom element
        viewRef.current = null;
      }
    };
  }, [initialSrc]);

  const onOpenFile = async (file: File) => {
    if (!viewRef.current) return;
    await viewRef.current.open(file); // File/Blob is supported
  };

  return (
    <div className="grid grid-cols-[280px_1fr] h-[100dvh]">
      {/* Sidebar: simple controls */}
      <aside className="border-r p-3 flex flex-col gap-3 overflow-auto">
        <label className="text-sm font-medium">Open a book</label>
        <input
          type="file"
          accept=".epub,.mobi,.azw3,.fb2,.cbz"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) onOpenFile(f);
          }}
        />
        <button
          disabled={!ready}
          className="rounded border px-3 py-1"
          onClick={() => viewRef.current?.prev()}
        >
          ◀ Prev
        </button>
        <button
          disabled={!ready}
          className="rounded border px-3 py-1"
          onClick={() => viewRef.current?.next()}
        >
          Next ▶
        </button>

        <div className="text-xs opacity-70">
          {progress
            ? `Section ${progress.index + 1} • ${(progress.fraction * 100).toFixed(1)}%`
            : '—'}
        </div>
      </aside>

      {/* Reading area */}
      <main className="relative">
        <div ref={hostRef} className="absolute inset-0" />
      </main>
    </div>
  );
}
