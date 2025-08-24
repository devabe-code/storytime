'use client';

import { useRouter } from 'next/navigation';
import { useReaderStore } from './store';
import { Button } from '@/components/ui/button';
import { Languages, BookmarkPlus, Settings2, Type, StickyNote, XCircle } from 'lucide-react';
import { useEffect, useCallback } from 'react';

export default function ReaderHeader() {
  const router = useRouter();
  const addBookmarkAtCurrent = useReaderStore(s => s.addBookmarkAtCurrent);
  const title = useReaderStore(s => s.title);
  const teardownView = useReaderStore(s => s.teardownView);

  const saveBookmark = useCallback(() => {
    addBookmarkAtCurrent();
  }, [addBookmarkAtCurrent]);

  // Hotkey: B
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'b' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        saveBookmark();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saveBookmark]);

  return (
    <div className="pointer-events-auto w-full flex items-center justify-between gap-3 px-3 py-2 backdrop-blur">
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={saveBookmark}
          aria-label="Add bookmark"
        >
          <BookmarkPlus className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Change language">
          <Languages className="h-5 w-5" />
        </Button>
      </div>

      <div className="min-w-0 text-center font-medium truncate">{title ?? 'Book'}</div>

      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="icon" aria-label="Change font">
          <Type className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Add notes">
          <StickyNote className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Full settings">
          <Settings2 className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            // make sure foliate's observers are disconnected before unmount
            teardownView();
            // allow the teardown to flush, then navigate
            requestAnimationFrame(() => router.push('/'));
          }}
          aria-label="Exit book"
        >
          <XCircle className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
