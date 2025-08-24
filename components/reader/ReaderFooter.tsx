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

  const pct = (() => {
    if (sectionCount === 0 || sectionCount === undefined) return 0;
    if (isNaN(sectionIndex) || isNaN(sectionFraction)) return 0;
    const value = ((sectionIndex + sectionFraction) / Math.max(1, sectionCount)) * 100;
    return isNaN(value) ? 0 : Math.round(Math.max(0, Math.min(100, value)));
  })();

  // Calculate progress value with proper validation
  // Note: Using TOC length (sectionCount) as denominator may cause percentage "jumps" 
  // if Foliate's pagination splits sections internally. Consider using getSectionFractions() 
  // to build a cumulative array for more precise goToFraction behavior.
  const progressValue = (() => {
    if (sectionCount === 0 || sectionCount === undefined) return 0;
    if (isNaN(sectionIndex) || isNaN(sectionFraction)) return 0;
    const value = (sectionIndex + sectionFraction) / Math.max(1, sectionCount);
    return isNaN(value) ? 0 : Math.max(0, Math.min(1, value));
  })();

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fraction = parseFloat(e.currentTarget.value);
    if (!isNaN(fraction)) {
      // Use the reader:goto event system for consistent navigation
      window.dispatchEvent(new CustomEvent('reader:goto', {
        detail: {
          index: 0, // Start of book
          fraction: fraction
        }
      }));
    }
  };

  return (
    <div className="pointer-events-auto flex items-center justify-between gap-3 px-3 py-2 bg-background/95 backdrop-blur border-t rounded-t-2xl shadow">
      <div className="flex items-center gap-1.5">
        {/* Go to cover */}
        <Button variant="ghost" size="icon" onClick={() => {
          window.dispatchEvent(new CustomEvent('reader:goto', {
            detail: { index: 0, fraction: 0 }
          }));
        }} aria-label="Go to cover">
          <ChevronsLeft className="h-5 w-5" />
        </Button>
        {/* Previous chapter (by section index) */}
        <Button variant="ghost" size="icon" onClick={() => {
          window.dispatchEvent(new CustomEvent('reader:goto', {
            detail: { index: Math.max(0, sectionIndex - 1), fraction: 0 }
          }));
        }} aria-label="Prev chapter">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        {/* Page left (direction-aware) */}
        <Button variant="ghost" size="icon" onClick={() => view?.goLeft?.()} aria-label="Page left">
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 max-w-3xl mx-4">
        <div className="text-xs mb-1 text-center">{pct}%</div>
        {/* Progress slider for jumping to any position */}
        <input
          type="range"
          min="0"
          max="1"
          step="any"
          value={progressValue}
          onChange={handleProgressChange}
          className="w-full h-2.5 bg-muted rounded-lg appearance-none cursor-pointer slider"
          aria-label="Book progress"
        />
      </div>

      <div className="flex items-center gap-1.5">
        {/* Page right (direction-aware) */}
        <Button variant="ghost" size="icon" onClick={() => view?.goRight?.()} aria-label="Page right">
          <ChevronRight className="h-4 w-4" />
        </Button>
        {/* Next chapter (by section index) */}
        <Button variant="ghost" size="icon"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('reader:goto', {
              detail: { index: Math.min(sectionCount - 1, sectionIndex + 1), fraction: 0 }
            }));
          }}
          aria-label="Next chapter">
          <ChevronRight className="h-5 w-5" />
        </Button>
        {/* Go to end */}
        <Button variant="ghost" size="icon" onClick={() => {
          window.dispatchEvent(new CustomEvent('reader:goto', {
            detail: { index: Math.max(0, sectionCount - 1), fraction: 0 }
          }));
        }} aria-label="Go to end">
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
