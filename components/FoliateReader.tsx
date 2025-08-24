'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useReaderStore } from './reader/store';

type FoliateViewEl = HTMLElement & {
  open: (src: string | File | Blob | Record<string, unknown>) => Promise<void>;
  goTo: (target: number | string | Record<string, unknown>) => Promise<void>;
  prev: () => void;
  next: () => void;
  goLeft: () => void;
  goRight: () => void;
  goToFraction: (fraction: number) => Promise<void>;
  getSectionFractions: () => number[];
  addAnnotation: (annotation: Record<string, unknown>) => void;
  book?: {
    metadata?: {
      title?: Record<string, unknown> | string;
      author?: Record<string, unknown> | string | Array<Record<string, unknown> | string>;
    };
    toc?: Array<Record<string, unknown>>;
    getCover?: () => Promise<Blob | null>;
    dir?: string;
    spine?: Array<unknown>;
  };
  renderer: {
    setAttribute: (attr: string, value: string) => void;
    setStyles: (css: string) => void;
    next: () => void;
    paginator?: {
      pageCount?: number;
      pages?: Array<unknown>;
    };
  };
  addEventListener: (event: string, handler: (e: Event) => void) => void;
  removeEventListener: (event: string, handler: (e: Event) => void) => void;
};

// Type for teardown operations
type TeardownView = {
  renderer?: {
    paginator?: { disconnect?: () => void };
    disconnect?: () => void;
  };
  close?: () => void;
  replaceChildren?: () => void;
};



const formatLanguageMap = (x: Record<string, unknown> | string | undefined): string => {
  if (!x) return '';
  if (typeof x === 'string') return x;
  const keys = Object.keys(x);
  return String(x[keys[0]]);
};

const formatContributor = (contributor: Record<string, unknown> | string | Array<Record<string, unknown> | string>): string => {
  if (Array.isArray(contributor)) {
    return contributor.map(c => typeof c === 'string' ? c : formatLanguageMap(c?.name as Record<string, unknown>)).join(', ');
  }
  if (typeof contributor === 'string') return contributor;
  return formatLanguageMap(contributor?.name as Record<string, unknown>);
};

export default function FoliateReader({
  bookId,
  className = '',
}: {
  bookId?: string;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<FoliateViewEl | null>(null);
  const [error, setError] = useState<string | null>(null);
  const coverUrlRef = useRef<string | null>(null);
  
  // Track the last known position in the reader itself
  const lastPosRef = useRef<{ idx: number; frac: number }>({ idx: 0, frac: 0 });

  // Zustand store
  const {
    setView, setSnapshot, setProgress, setCoverUrl, setBookId, loadBookmarks, setLocation
  } = useReaderStore();

  const applyBookSnapshot = useCallback(async (view: FoliateViewEl) => {
    if (!view.book) return;
    const { book } = view;
    const bookTitle = formatLanguageMap(book.metadata?.title) || 'Untitled Book';
    const bookAuthor = book.metadata?.author ? formatContributor(book.metadata.author) : '';
    const bookToc = Array.isArray(book.toc) ? book.toc as Array<Record<string, unknown>> : [];
    setSnapshot({ title: bookTitle, author: bookAuthor, toc: bookToc, sectionCount: bookToc.length || 0 });
    try {
      const blob = await book.getCover?.();
      if (blob) {
        const coverUrl = URL.createObjectURL(blob);
        // Save & expose via store instead
        if (coverUrlRef.current && coverUrlRef.current !== coverUrl) {
          URL.revokeObjectURL(coverUrlRef.current);
        }
        coverUrlRef.current = coverUrl;
        setCoverUrl(coverUrl);
      }
    } catch {}
  }, [setSnapshot, setCoverUrl]);

  // Define event handlers outside useEffect so they can be referenced in cleanup
  const onLoad = useCallback(async (e: Event) => {
    const view = e.target as FoliateViewEl;
    console.log('Book load event triggered'); // Debug log
    // Extract book metadata and TOC after book is fully loaded
    await applyBookSnapshot(view);
    
    // Set RTL direction if the book specifies it
    if (view.book?.dir === 'rtl') {
      view.renderer.setAttribute('direction', 'rtl');
    }
  }, [applyBookSnapshot]);

  // Function to manually update current position from the view
  const updateCurrentPosition = useCallback((view: FoliateViewEl) => {
    if (!viewRef.current) return;
    
    try {
      // Try to get current position from the view's internal state
      // Since Foliate doesn't expose getCurrentLocation, we'll use a different approach
      
      // Method 1: Check if we can get position from the view's current state
      const currentState = (view as FoliateViewEl & { currentLocation?: { sectionIndex: number; sectionFraction?: number }; location?: { sectionIndex: number; sectionFraction?: number } }).currentLocation || (view as FoliateViewEl & { currentLocation?: { sectionIndex: number; sectionFraction?: number }; location?: { sectionIndex: number; sectionFraction?: number } }).location;
      if (currentState && typeof currentState.sectionIndex === 'number') {
        console.log('Got position from view state:', currentState);
        setProgress(currentState.sectionIndex, currentState.sectionFraction || 0);
        setLocation(currentState.sectionIndex, currentState.sectionFraction || 0);
        return;
      }
      
      // Method 2: Try to infer position from the current DOM state
      // Look for elements that might indicate current position
      const currentElement = document.querySelector('[data-section-index]');
      if (currentElement) {
        const sectionIndex = parseInt(currentElement.getAttribute('data-section-index') || '0');
        const sectionFraction = parseFloat(currentElement.getAttribute('data-section-fraction') || '0');
        console.log('Got position from DOM:', { sectionIndex, sectionFraction });
        setProgress(sectionIndex, sectionFraction);
        setLocation(sectionIndex, sectionFraction);
        return;
      }
      
      // Method 3: If all else fails, try to get from the view's renderer
      const renderer = view.renderer;
      if (renderer && (renderer as FoliateViewEl['renderer'] & { currentSection?: number }).currentSection !== undefined) {
        const currentSection = (renderer as FoliateViewEl['renderer'] & { currentSection?: number }).currentSection;
        if (typeof currentSection === 'number') {
          console.log('Got position from renderer:', currentSection);
          setProgress(currentSection, 0);
          setLocation(currentSection, 0);
          return;
        }
      }
      
      // No-op: rely on relocate; don't spam logs
    } catch (error) {
      console.warn('Error updating current position:', error);
    }
  }, [setProgress, setLocation]);

  const onRelocate = useCallback((e: Event) => {
    const view = e.target as FoliateViewEl;
    // Check if component is still mounted
    if (!viewRef.current) return;
    
    // Make relocate event read both key styles (index/fraction or sectionIndex/sectionFraction)
    const d = (e as CustomEvent<{ sectionIndex?: number; sectionFraction?: number; index?: number; fraction?: number }>)?.detail || {};
    const idx = (typeof d.sectionIndex === 'number' ? d.sectionIndex : d.index) ?? 0;
    const frac = (typeof d.sectionFraction === 'number' ? d.sectionFraction : d.fraction) ?? 0;
    
    console.log('relocate idx,frac =', idx, frac);
    
    // Debug: show section fractions to understand the positioning
    if (view.getSectionFractions && typeof view.getSectionFractions === 'function') {
      const fracs = view.getSectionFractions();
      console.log('Section fractions:', fracs);
      if (fracs.length >= 2) {
        const start = fracs[idx] ?? 0;
        const end = fracs[idx + 1] ?? 1;
        const span = Math.max(0, end - start);
        const totalBookFraction = start + frac * span;
        console.log('Calculated total book fraction:', { start, end, span, frac, totalBookFraction });
      }
    }
    
    // Keep an always-fresh copy of the current position
    lastPosRef.current = { idx, frac };
    
    // Update both progress and location in store
    setProgress(idx, frac);
    setLocation(idx, frac);
    
    // Capture page math for position meta
    const fracs = view.getSectionFractions?.() || [];
    const start = fracs[idx] ?? 0;
    const end = fracs[idx + 1] ?? 1;
    const span = Math.max(0, end - start);

    // Try to read total screen pages from the paginator (several implementations exist)
    const paginator = view.renderer?.paginator;
    const totalPages =
      Number(paginator?.pageCount) ??
      Number(paginator?.pages?.length) ??
      0;

    // If unknown, fall back to a stable virtual page count
    const fallbackTotal = 400;

    // Pages in this chapter
    const sectionPages = Math.max(
      1,
      Math.round((totalPages || fallbackTotal) * span)
    );

    // Current page within chapter (1-based)
    const chapterPage = Math.min(sectionPages, Math.max(1, Math.round(frac * sectionPages)));

    // Push this into the store so headers/sidebars can label correctly
    useReaderStore.getState().setPositionMeta?.({
      chapterIndex: idx,
      sectionPages,
      chapterPage,
    });
    
    // Persist progress to IndexedDB if bookId is available
    if (bookId && viewRef.current) {
      import('@/lib/books-repo').then(({ setProgress }) => {
        // Double-check that component is still mounted
        if (!viewRef.current || !view) return;
        
        const sectionFractions = view.getSectionFractions();
        const totalSections = sectionFractions.length;
        const percent = totalSections > 0 ? ((idx + frac) / totalSections) * 100 : 0;
        
        setProgress(bookId, {
          percent: Math.min(100, Math.max(0, percent)),
          lastLocation: {
            cfi: null,
            sectionIndex: idx,
            sectionFraction: frac
          }
        });
      }).catch(console.error);
    }
  }, [bookId, setProgress, setLocation]);

  // Load the custom element definition
  useEffect(() => {
    let cancelled = false;
    // Capture refs at effect creation time to avoid React hooks warning
    const hostElement = hostRef.current;

    const loadFoliateJS = async () => {
      try {
        // Safely check if document exists before creating script
        if (typeof document === 'undefined' || !document) {
          if (!cancelled) {
            setError('Document not available');
          }
          return;
        }

        // Load the foliate-js script
        const script = document.createElement('script');
        script.src = '/foliate-js/view.js';
        script.type = 'module';
        
        script.onload = async () => {
          if (cancelled) return;
          
          try {
            await initializeView();
          } catch (error) {
            if (!cancelled) {
              console.error('Failed to initialize view:', error);
              setError('Failed to initialize reader');
            }
          }
        };
        
        script.onerror = () => {
          if (!cancelled) {
            setError('Failed to load reader script');
          }
        };
        
        if (document.head) {
          document.head.appendChild(script);
        } else {
          if (!cancelled) {
            setError('Document head not available');
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load foliate-js:', error);
          setError('Failed to initialize reader');
        }
      }
    };

    const initializeView = async () => {
      try {
        // Safely check if document exists
        if (typeof document === 'undefined' || !document) {
          if (!cancelled) {
            setError('Document not available for view creation');
          }
          return;
        }

        // Create and configure the foliate-view element
        const view = document.createElement('foliate-view') as FoliateViewEl;
        
        // Set initial attributes
        view.setAttribute('flow', 'paginated');
        view.setAttribute('gap', '3%');
        view.setAttribute('margin', '56px');
        // Let the container and CSS control sizing for true full-bleed
        view.removeAttribute('max-inline-size');
        view.removeAttribute('max-block-size');
        view.setAttribute('animated', '');

        // Style the view
        view.style.display = 'block';
        view.style.height = '100%';
        view.style.width = '100%';

        // Set up event listeners
        console.log('Setting up event listeners on view');
        view.addEventListener('load', onLoad);
        view.addEventListener('relocate', onRelocate);
        
        // Add navigation event listeners to manually track position
        view.addEventListener('keydown', (e) => {
          console.log('Navigation keydown:', e.key);
          // Update position after navigation
          setTimeout(() => updateCurrentPosition(view), 100);
        });
        
        // Listen for mouse clicks that might indicate navigation
        view.addEventListener('click', () => {
          console.log('View clicked - updating position');
          setTimeout(() => updateCurrentPosition(view), 100);
        });
        
        // Hook into the view's navigation methods to track position changes
        const originalGoTo = view.goTo;
        const originalGoToFraction = view.goToFraction;
        
        view.goTo = async function(target: number | string | Record<string, unknown>) {
          console.log('goTo called with:', target);
          const result = await originalGoTo.call(this, target);
          // Update position after navigation
          setTimeout(() => updateCurrentPosition(view), 100);
          return result;
        };
        
        if (view.goToFraction) {
          view.goToFraction = async function(fraction: number) {
            console.log('goToFraction called with:', fraction);
            const result = await originalGoToFraction.call(this, fraction);
            // Update position after navigation
            setTimeout(() => updateCurrentPosition(view), 100);
            return result;
          };
        }
        
        // Set up periodic position checking as a fallback
        const positionInterval = setInterval(() => {
          if (viewRef.current === view) {
            updateCurrentPosition(view);
          } else {
            clearInterval(positionInterval);
          }
        }, 2000); // Check every 2 seconds
        
        // Store the interval ID for cleanup
        (view as FoliateViewEl & { positionInterval?: NodeJS.Timeout }).positionInterval = positionInterval;
        
        console.log('Event listeners set up');

        // Add to DOM safely
        if (hostRef.current && !cancelled) {
          hostRef.current.appendChild(view);
          viewRef.current = view;
          setView(view);
          
          // Expose it so non-React code (store/actions) can read it synchronously
          (window as { __readerLastPos?: React.MutableRefObject<{ idx: number; frac: number }> }).__readerLastPos = lastPosRef;
        } else {
          if (!cancelled) {
            setError('Host element not available');
          }
          return;
        }

        // Open book if bookId is provided
        if (bookId) {
          try {
            // Set bookId and load bookmarks when book opens
            setBookId(bookId);
            loadBookmarks(bookId);
            
            // Import the books repository
            const { getBookBlob } = await import('@/lib/books-repo');
            const bookBlob = await getBookBlob(bookId);
            
            if (bookBlob) {
              await view.open(bookBlob);
              
              // Wait a bit for the book to be fully loaded
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Extract book metadata and TOC after opening
              await applyBookSnapshot(view);
              
              // Set RTL direction if the book specifies it
              if (view.book?.dir === 'rtl') {
                view.renderer.setAttribute('direction', 'rtl');
              }
              
              // ❌ Do NOT force goTo(0) here; it fires on each section render and resets navigation.
              
              // Initialize position tracking - let the book fire relocate naturally
              // This ensures we don't override the actual position with (0, 0)
            } else {
              setError('Book not found');
            }
          } catch (error) {
            console.error('Failed to load book:', error);
            setError('Failed to load book');
          }
        }
      } catch (error) {
        console.error('Failed to initialize view:', error);
        setError('Failed to create reader view');
      }
    };

    loadFoliateJS();

    return () => {
      cancelled = true;
      
      // Cleanup view element - use captured refs
      const currentView = viewRef.current;
      const currentHost = hostElement;
      
      if (currentView && currentHost) {
        try {
          // remove any listeners you added to `view` first
          try { currentView?.removeEventListener('relocate', onRelocate); } catch {}
          try { currentView?.removeEventListener('load', onLoad); } catch {}
          
          // then fully disconnect/destroy
          try { (currentView as unknown as TeardownView)?.renderer?.paginator?.disconnect?.(); } catch {}
          try { (currentView as unknown as TeardownView)?.renderer?.disconnect?.(); } catch {}
          try { (currentView as unknown as TeardownView)?.close?.(); } catch {}
          try { currentView?.replaceChildren?.(); } catch {}
          
          // Clean up position tracking interval
          try { 
            if ((currentView as FoliateViewEl & { positionInterval?: NodeJS.Timeout }).positionInterval) {
              clearInterval((currentView as FoliateViewEl & { positionInterval?: NodeJS.Timeout }).positionInterval);
            }
          } catch {}
          
          // Remove from DOM if still attached
          if (currentHost.contains(currentView)) {
            currentHost.removeChild(currentView);
          }
        } catch (error) {
          console.warn('Error during view cleanup:', error);
        }
        
        viewRef.current = null;
      }
      
      // Cleanup cover URL
      if (coverUrlRef.current) {
        try {
          URL.revokeObjectURL(coverUrlRef.current);
        } catch (error) {
          console.warn('Error revoking cover URL:', error);
        }
        coverUrlRef.current = null;
      }
      
      // Reset store state
      try {
        setCoverUrl(null);
        // Call the store's teardown to ensure proper cleanup
        useReaderStore.getState().teardownView?.();
      } catch (error) {
        console.warn('Error resetting store state:', error);
      }
    };
  }, [applyBookSnapshot, bookId, setView, setSnapshot, setProgress, setCoverUrl, setBookId, loadBookmarks, onLoad, onRelocate, setLocation, updateCurrentPosition]);

  // Support programmatic navigation from store via reader:goto event
  useEffect(() => {
    const onGoto = (ev: Event) => {
      const d = (ev as CustomEvent<{ index?: number; fraction?: number; sectionIndex?: number; sectionFraction?: number }>).detail || {};
      // Accept both shapes & coerce to numbers
      let idx = Number(d.index ?? d.sectionIndex);
      let frac = Number(d.fraction ?? d.sectionFraction ?? 0);
      if (!Number.isFinite(idx)) return;           // still nothing → ignore
      if (!Number.isFinite(frac)) frac = 0;

      const view = useReaderStore.getState().view as FoliateViewEl | null;
      if (!view) return;

      const fracs = view.getSectionFractions?.() || [];
      // Clamp index & fraction
      if (fracs.length >= 2) {
        idx = Math.max(0, Math.min(fracs.length - 2, idx));
      } else {
        const spineLen = (view.book?.spine?.length as number) ?? 1;
        idx = Math.max(0, Math.min(Math.max(1, spineLen) - 1, idx));
      }
      frac = Math.max(0, Math.min(1, frac));

      const toBookFraction = () => {
        if (fracs.length >= 2) {
          const start = fracs[idx] ?? 0;
          const end   = fracs[idx + 1] ?? 1;
          const span  = Math.max(0, end - start);
          return start + frac * span;
        }
        const total = Math.max(1, (view.book?.spine?.length as number) ?? 1);
        return (idx + frac) / total;
      };

      const jump = () => {
        const pct = toBookFraction();
        if (typeof view.goToFraction === 'function') {
          view.goToFraction(Math.max(0, Math.min(1, pct)));
        } else if (typeof view.goTo === 'function') {
          view.goTo(idx);
        }
      };

      // Fractions sometimes aren't ready immediately after open/reflow.
      if (fracs.length < 2) {
        // Retry a few times before falling back
        let tries = 0;
        const id = setInterval(() => {
          const f = view.getSectionFractions?.() || [];
          if (f.length >= 2 || ++tries > 10) {
            clearInterval(id);
            jump();
          }
        }, 60);
      } else {
        jump();
      }
    };

    console.log('Setting up reader:goto event listener');
    window.addEventListener('reader:goto', onGoto as EventListener);
    return () => {
      console.log('Removing reader:goto event listener');
      window.removeEventListener('reader:goto', onGoto as EventListener);
    };
  }, []); // Empty dependency array - will be set up once and use current store state

  

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!viewRef.current) return;
    
    switch (e.key) {
      case 'ArrowLeft':
      case 'h':
        viewRef.current.goLeft();
        break;
      case 'ArrowRight':
      case 'l':
        viewRef.current.goRight();
        break;
    }
  };

  useEffect(() => {
    // Safely check if document exists
    if (typeof document !== 'undefined' && document) {
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        // Safely remove event listener with null check
        if (typeof document !== 'undefined' && document && document.removeEventListener) {
          document.removeEventListener('keydown', handleKeyDown);
        }
      };
    }
  }, []);

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Reader Error
          </h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full min-w-0 min-h-0 ${className}`}>
      {/* Reading Canvas */}
      <div ref={hostRef} className="absolute inset-0" />
    </div>
  );
}
