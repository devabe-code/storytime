/**
 * Type definitions for Storytime Library
 */

export interface Book {
  id: string;                    // UUID v4
  hash: string;                  // SHA-256 of file bytes for dedupe
  title: string;
  author: string | null;
  filename: string;
  filesize: number;
  addedAt: number;              // timestamp
  lastOpenedAt: number | null;  // timestamp
  favorite: boolean;
  coverBlobId: string | null;
  collections: string[];
}

export interface Progress {
  bookId: string;
  percent: number;
  lastLocation: {
    cfi: string | null;
    sectionIndex: number | null;
    sectionFraction: number | null;
  };
  updatedAt: number;            // timestamp
}

export interface Collection {
  id: string;
  name: string;
  createdAt: number;            // timestamp
  bookIds: string[];
}

export interface BookWithProgress extends Book {
  progress?: Progress;
}

export interface BookWithCover extends Book {
  coverUrl?: string;
}

export interface BookWithProgressAndCover extends Book, BookWithProgress, BookWithCover {}

export interface UploadProgress {
  file: File;
  status: 'pending' | 'processing' | 'extracting' | 'saving' | 'complete' | 'error';
  progress: number;
  error?: string;
}

export interface LibraryFilters {
  search: string;
  sortBy: 'recentlyAdded' | 'title' | 'author' | 'lastOpened' | 'progress';
  favorites: boolean;
  hasProgress: boolean;
  collections: string[];
}

export interface LibraryViewState {
  viewMode: 'grid' | 'compact';
  sidebarOpen: boolean;
  activeSection: 'home' | 'all' | 'favorites' | 'recent' | 'collections';
}

export interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  count?: number;
}

export interface BookShelfProps {
  title: string;
  books: BookWithProgressAndCover[];
  variant: 'row' | 'grid' | 'compact';
  emptyHint?: string;
  maxItems?: number;
}

export interface BookCardProps {
  book: BookWithProgressAndCover;
  variant?: 'default' | 'compact';
  onOpen: (bookId: string) => void;
  onFavorite: (bookId: string, favorite: boolean) => void;
  onRemove: (bookId: string) => void;
  onAddToCollection: (bookId: string, collectionId: string) => void;
}

export interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

export interface CollectionPillsProps {
  collections: Collection[];
  selectedCollections: string[];
  onCollectionToggle: (collectionId: string) => void;
  onCollectionSelect: (collectionId: string) => void;
}

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: string;
}
