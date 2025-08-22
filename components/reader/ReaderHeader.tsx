'use client';

import { useRouter } from 'next/navigation';
import { useReaderStore } from './store';
import { Button } from '@/components/ui/button';
import { Languages, BookmarkPlus, PanelLeft, Settings2, Type, StickyNote, XCircle } from 'lucide-react';

export default function ReaderHeader() {
  const router = useRouter();

  const toggleSidebar = useReaderStore(s => s.toggleSidebar);
  const addBookmarkAt = useReaderStore(s => s.addBookmarkAt);
  const sectionIndex = useReaderStore(s => s.sectionIndex);
  const sectionFraction = useReaderStore(s => s.sectionFraction);
  const title = useReaderStore(s => s.title);

  return (
    <div className="pointer-events-auto flex items-center justify-between gap-3 px-3 py-2 bg-background/95 backdrop-blur border-b rounded-b-2xl shadow">
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="icon" onClick={() => toggleSidebar(true)} aria-label="Open sidebar">
          <PanelLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => addBookmarkAt(sectionIndex, sectionFraction)}
          aria-label="Create bookmark"
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
        <Button variant="ghost" size="icon" onClick={() => router.push('/')} aria-label="Exit book">
          <XCircle className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
