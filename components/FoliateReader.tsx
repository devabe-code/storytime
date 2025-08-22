'use client';

import { useEffect, useRef, useState } from 'react';
import { useReaderStore } from './reader/store';
import FoliateTocSidebar from './reader/FoliateTocSidebar';
import ReaderHeader from './reader/ReaderHeader';
import ReaderFooter from './reader/ReaderFooter';

type FoliateViewEl = HTMLElement & {
  open: (src: string | File | Blob | Record<string, unknown>) => Promise<void>;
  goTo: (dest: string | Record<string, unknown>) => Promise<void>;
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
  };
  renderer: {
    setAttribute: (attr: string, value: string) => void;
    setStyles: (css: string) => void;
    next: () => void;
  };
  addEventListener: (event: string, handler: (e: Event) => void) => void;
  removeEventListener: (event: string, handler: (e: Event) => void) => void;
};

interface CustomEventDetail {
  index: number;
  fraction: number;
}

interface CustomEventWithDetail extends Event {
  detail: CustomEventDetail;
}

const formatLanguageMap = (x: Record<string, unknown> | string | undefined): string => {
  if (!x) return '';
  if (typeof x === 'string') return x;
  const keys = Object.keys(x);
  return String(x[keys[0]]);
};

const formatOneContributor = (contributor: Record<string, unknown> | string): string => {
  if (typeof contributor === 'string') return contributor;
  return formatLanguageMap(contributor?.name as Record<string, unknown>);
};

const formatContributor = (contributor: Record<string, unknown> | string | Array<Record<string, unknown> | string>): string => {
  if (Array.isArray(contributor)) {
    return contributor.map(formatOneContributor).join(', ');
  }
  return formatOneContributor(contributor);
};

export default function FoliateReader({
  initialSrc,
}: {
  initialSrc?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<FoliateViewEl | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Zustand store
  const {
    setView, setSnapshot, setProgress, setShowChrome, showChrome
  } = useReaderStore();

  // Auto-hide chrome on mouse move
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const onMove = () => {
      setShowChrome(true);
      if (t) clearTimeout(t);
      t = setTimeout(() => setShowChrome(false), 1500);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (t) clearTimeout(t);
    };
  }, [setShowChrome]);

  // Load the custom element definition
  useEffect(() => {
    let cancelled = false;

    const loadFoliateJS = async () => {
      try {
        // Check if foliate-view is already defined
        if (customElements.get('foliate-view')) {
          console.log('Foliate-view already defined');
          return;
        }

        // Load the script dynamically
        const script = document.createElement('script');
        script.src = '/foliate-js/view.js';
        script.type = 'module';
        
        script.onload = async () => {
          if (cancelled) return;
          
          // Wait a bit for the custom element to be registered
          await new Promise(resolve => setTimeout(resolve, 100));
          
          if (customElements.get('foliate-view')) {
            console.log('Foliate-view loaded successfully');
            initializeView();
          } else {
            setError('Failed to load foliate-view element');
          }
        };
        
        script.onerror = () => {
          setError('Failed to load foliate-js modules');
        };
        
        document.head.appendChild(script);
      } catch (error) {
        console.error('Failed to load foliate-js:', error);
        setError('Failed to initialize reader');
      }
    };

    const initializeView = async () => {
      try {
        // Create and configure the foliate-view element
        const view = document.createElement('foliate-view') as FoliateViewEl;
        
        // Set initial attributes
        view.setAttribute('flow', 'paginated');
        view.setAttribute('gap', '6%');
        view.setAttribute('margin', '56px');
        view.setAttribute('max-inline-size', '720px');
        view.setAttribute('max-block-size', '1000px');
        view.setAttribute('animated', '');

        // Style the view
        view.style.display = 'block';
        view.style.height = '100%';
        view.style.width = '100%';

        // Set up event listeners
        view.addEventListener('load', async () => {
          console.log('Book load event triggered'); // Debug log
          // Extract book metadata and TOC after book is fully loaded
          if (view.book) {
            const { book } = view;
            console.log('Book loaded via event:', book); // Debug log
            
            // Set metadata
            const bookTitle = formatLanguageMap(book.metadata?.title) || 'Untitled Book';
            const bookAuthor = book.metadata?.author ? formatContributor(book.metadata.author) : '';
            
            // Set TOC
            let bookToc: Array<Record<string, unknown>> = [];
            if (book.toc) {
              bookToc = book.toc as Array<Record<string, unknown>>;
            }
            
            // Set snapshot first
            setSnapshot({
              title: bookTitle,
              author: bookAuthor,
              toc: bookToc,
              sectionCount: bookToc.length || 0,
            });
            
            // Set cover if available - exactly like original foliate-js
            Promise.resolve(book.getCover?.())?.then(blob => {
              if (blob) {
                const coverUrl = URL.createObjectURL(blob);
                console.log('Cover URL created via load event:', coverUrl); // Debug log
                // Directly set the image src like original foliate-js
                const coverImg = document.getElementById('side-bar-cover') as HTMLImageElement;
                if (coverImg) {
                  coverImg.src = coverUrl;
                  coverImg.style.display = 'block';
                  console.log('Cover image src set directly'); // Debug log
                } else {
                  console.log('Cover image element not found'); // Debug log
                }
              } else {
                console.log('No cover blob received via load event'); // Debug log
              }
            }).catch(error => {
              console.warn('Failed to load book cover via load event:', error);
            });
          }
        });

        view.addEventListener('relocate', (e: Event) => {
          const relocateEvent = e as CustomEventWithDetail;
          const { index, fraction } = relocateEvent.detail;
          setProgress(index, fraction);
        });

        // Add to DOM
        hostRef.current!.appendChild(view);
        viewRef.current = view;
        setView(view);

        // Open initial book if provided
        if (initialSrc) {
          await view.open(initialSrc);
          
          // Wait a bit for the book to be fully loaded
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Extract book metadata and TOC after opening
          if (view.book) {
            const { book } = view;
            console.log('Book loaded:', book); // Debug log
            
            // Set metadata
            const bookTitle = formatLanguageMap(book.metadata?.title) || 'Untitled Book';
            const bookAuthor = book.metadata?.author ? formatContributor(book.metadata.author) : '';
            
            // Set TOC
            let bookToc: Array<Record<string, unknown>> = [];
            if (book.toc) {
              bookToc = book.toc as Array<Record<string, unknown>>;
            }
            
            // Set snapshot first
            setSnapshot({
              title: bookTitle,
              author: bookAuthor,
              toc: bookToc,
              sectionCount: bookToc.length || 0,
            });
            
            // Set cover if available - exactly like original foliate-js
            Promise.resolve(book.getCover?.())?.then(blob => {
              if (blob) {
                const coverUrl = URL.createObjectURL(blob);
                console.log('Cover URL created:', coverUrl); // Debug log
                // Directly set the image src like original foliate-js
                const coverImg = document.getElementById('side-bar-cover') as HTMLImageElement;
                if (coverImg) {
                  coverImg.src = coverUrl;
                  coverImg.style.display = 'block';
                  console.log('Cover image src set directly'); // Debug log
                } else {
                  console.log('Cover image element not found'); // Debug log
                }
              } else {
                console.log('No cover blob received'); // Debug log
              }
            }).catch(error => {
              console.warn('Failed to load book cover:', error);
            });
          } else {
            console.log('No book object available'); // Debug log
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
      if (viewRef.current) {
        viewRef.current.remove();
        viewRef.current = null;
        setView(null);
      }
    };
  }, [initialSrc, setView, setSnapshot, setProgress]);

  const handleOpenFile = async (file: File) => {
    if (!viewRef.current) return;
    try {
      await viewRef.current.open(file);
      
      // Wait a bit for the book to be fully loaded
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Extract book metadata and TOC after opening
      if (viewRef.current.book) {
        const { book } = viewRef.current;
        console.log('Book loaded from file:', book); // Debug log
        
        // Set metadata
        const bookTitle = formatLanguageMap(book.metadata?.title) || 'Untitled Book';
        const bookAuthor = book.metadata?.author ? formatContributor(book.metadata.author) : '';
        
        // Set TOC
        let bookToc: Array<Record<string, unknown>> = [];
        if (book.toc) {
          bookToc = book.toc as Array<Record<string, unknown>>;
        }
        
        // Set snapshot first
        setSnapshot({
          title: bookTitle,
          author: bookAuthor,
          toc: bookToc,
          sectionCount: bookToc.length || 0,
        });
        
        // Set cover if available - exactly like original foliate-js
        Promise.resolve(book.getCover?.())?.then(blob => {
          if (blob) {
            const coverUrl = URL.createObjectURL(blob);
            console.log('Cover URL created from file:', coverUrl); // Debug log
            // Directly set the image src like original foliate-js
            const coverImg = document.getElementById('side-bar-cover') as HTMLImageElement;
            if (coverImg) {
              coverImg.src = coverUrl;
              coverImg.style.display = 'block';
              console.log('Cover image src set directly from file'); // Debug log
            } else {
              console.log('Cover image element not found for file'); // Debug log
            }
          } else {
            console.log('No cover blob received from file'); // Debug log
          }
        }).catch(error => {
          console.warn('Failed to load book cover from file:', error);
        });
      } else {
        console.log('No book object available from file'); // Debug log
      }
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  };

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
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
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
    <div className="grid grid-cols-[320px_1fr] h-[100dvh]">
      {/* TOC Sidebar */}
      <FoliateTocSidebar />
      
      {/* Main Reading Area */}
      <div className="relative bg-background">
        {/* Header Chrome */}
        <div className={`pointer-events-none absolute left-1/2 -translate-x-1/2 top-2 z-20 transition-opacity ${showChrome ? 'opacity-100' : 'opacity-0'}`}>
          <ReaderHeader />
        </div>
        
        {/* Footer Chrome */}
        <div className={`pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-2 z-20 transition-opacity ${showChrome ? 'opacity-100' : 'opacity-0'}`}>
          <ReaderFooter />
        </div>
        
        {/* Reading Canvas */}
        <div className="relative h-full">
          <div ref={hostRef} className="absolute inset-0" />
        </div>
      </div>
    </div>
  );
}
