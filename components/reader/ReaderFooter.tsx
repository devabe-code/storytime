'use client';

import { useReaderStore } from './store';
import { Button } from '@/components/ui/button';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Undo2, Redo2 } from 'lucide-react';

export default function ReaderFooter() {
  const view = useReaderStore(s => s.view);
  const sectionIndex = useReaderStore(s => s.sectionIndex);
  const sectionFraction = useReaderStore(s => s.sectionFraction);
  const sectionCount = useReaderStore(s => s.sectionCount);
  const navBack = useReaderStore(s => s.navBack);
  const navForward = useReaderStore(s => s.navForward);

  const pct = Math.round(
    sectionCount === 0 ? 0 : ((sectionIndex + sectionFraction) / Math.max(1, sectionCount)) * 100
  );

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fraction = parseFloat(e.currentTarget.value);
    view?.goToFraction?.(fraction);
  };

  return (
    <div className="pointer-events-auto flex items-center justify-between gap-3 px-3 py-2 bg-background/95 backdrop-blur border-t rounded-t-2xl shadow">
      <div className="flex items-center gap-1.5">
        {/* Go to cover */}
        <Button variant="ghost" size="icon" onClick={() => view?.goTo({ index: 0 })} aria-label="Go to cover">
          <ChevronsLeft className="h-5 w-5" />
        </Button>
        {/* Previous chapter (by section index) */}
        <Button variant="ghost" size="icon" onClick={() => view?.goTo({ index: Math.max(0, sectionIndex - 1) })} aria-label="Prev chapter">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        {/* Page left (direction-aware) */}
        <Button variant="ghost" size="icon" onClick={() => view?.goLeft?.()} aria-label="Page left">
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 max-w-3xl mx-4">
        <div className="text-xs mb-1 text-center">{pct}%</div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Page right (direction-aware) */}
        <Button variant="ghost" size="icon" onClick={() => view?.goRight?.()} aria-label="Page right">
          <ChevronRight className="h-4 w-4" />
        </Button>
        {/* Next chapter (by section index) */}
        <Button variant="ghost" size="icon"
          onClick={() => view?.goTo({ index: Math.min(sectionCount - 1, sectionIndex + 1) })}
          aria-label="Next chapter">
          <ChevronRight className="h-5 w-5" />
        </Button>
        {/* Go to end */}
        <Button variant="ghost" size="icon" onClick={() => view?.goTo({ index: Math.max(0, sectionCount - 1) })} aria-label="Go to end">
          <ChevronsRight className="h-5 w-5" />
        </Button>
        {/* History navigation */}
        <Button variant="ghost" size="icon" onClick={navBack} aria-label="Nav back">
          <Undo2 className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={navForward} aria-label="Nav forward">
          <Redo2 className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
