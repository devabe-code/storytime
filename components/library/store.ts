/**
 * Library store for Storytime
 * Manages UI state, filters, and book data
 */

import { create } from 'zustand';
import { BookWithProgressAndCover, LibraryFilters, LibraryViewState } from '@/types/library';
import { listBooks, listContinue, listRecentlyAdded, listFavorites, refreshCoverURLs } from '@/lib/books-repo';
import { debugActiveURLs } from '@/lib/object-url';

interface LibraryState {
  // Books data
  books: BookWithProgressAndCover[];
  continueBooks: BookWithProgressAndCover[];
  recentlyAddedBooks: BookWithProgressAndCover[];
  favoriteBooks: BookWithProgressAndCover[];
  
  // UI state
  viewState: LibraryViewState;
  filters: LibraryFilters;
  
  // Loading states
  isLoading: boolean;
  isUploading: boolean;
  
  // Actions
  loadBooks: () => Promise<void>;
  setViewMode: (mode: 'grid' | 'compact') => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveSection: (section: 'home' | 'all' | 'favorites' | 'recent' | 'collections') => void;
  setSearch: (search: string) => void;
  setSortBy: (sortBy: LibraryFilters['sortBy']) => void;
  setFavorites: (favorites: boolean) => void;
  setHasProgress: (hasProgress: boolean) => void;
  setCollections: (collections: string[]) => void;
  resetFilters: () => void;
  setUploading: (uploading: boolean) => void;
  cleanup: () => void;
}

const defaultFilters: LibraryFilters = {
  search: '',
  sortBy: 'recentlyAdded',
  favorites: false,
  hasProgress: false,
  collections: []
};

const defaultViewState: LibraryViewState = {
  viewMode: 'grid',
  sidebarOpen: true,
  activeSection: 'home'
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  // Initial state
  books: [],
  continueBooks: [],
  recentlyAddedBooks: [],
  favoriteBooks: [],
  viewState: defaultViewState,
  filters: defaultFilters,
  isLoading: false,
  isUploading: false,

  // Actions
  loadBooks: async () => {
    set({ isLoading: true });
    
    try {
      // First refresh cover URLs to ensure they're available
      await refreshCoverURLs();
      
      const [books, continueBooks, recentlyAddedBooks, favoriteBooks] = await Promise.all([
        listBooks(),
        listContinue(),
        listRecentlyAdded(10),
        listFavorites()
      ]);
      
      set({
        books,
        continueBooks,
        recentlyAddedBooks,
        favoriteBooks,
        isLoading: false
      });
      
      // Debug: log all active URLs
      debugActiveURLs();
    } catch (error) {
      console.error('Failed to load books:', error);
      set({ isLoading: false });
    }
  },

  setViewMode: (mode) => {
    set(state => ({
      viewState: { ...state.viewState, viewMode: mode }
    }));
    
    // Save to localStorage
    localStorage.setItem('storytime-view-mode', mode);
  },

  setSidebarOpen: (open) => {
    set(state => ({
      viewState: { ...state.viewState, sidebarOpen: open }
    }));
    
    // Dispatch resize event for reader pagination
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 150);
  },

  setActiveSection: (section) => {
    set(state => ({
      viewState: { ...state.viewState, activeSection: section }
    }));
  },

  setSearch: (search) => {
    set(state => ({
      filters: { ...state.filters, search }
    }));
  },

  setSortBy: (sortBy) => {
    set(state => ({
      filters: { ...state.filters, sortBy }
    }));
  },

  setFavorites: (favorites) => {
    set(state => ({
      filters: { ...state.filters, favorites }
    }));
  },

  setHasProgress: (hasProgress) => {
    set(state => ({
      filters: { ...state.filters, hasProgress }
    }));
  },

  setCollections: (collections) => {
    set(state => ({
      filters: { ...state.filters, collections }
    }));
  },

  resetFilters: () => {
    set({ filters: defaultFilters });
  },

  setUploading: (uploading) => {
    set({ isUploading: uploading });
  },

  cleanup: () => {
    // This will be called when the library component unmounts
    // Object URLs are managed globally, so no specific cleanup needed here
    // but we could add any other cleanup logic in the future
  }
}));

// Initialize view mode from localStorage
if (typeof window !== 'undefined') {
  const savedViewMode = localStorage.getItem('storytime-view-mode') as 'grid' | 'compact';
  if (savedViewMode) {
    useLibraryStore.getState().setViewMode(savedViewMode);
  }
}

// Computed selectors
export const useFilteredBooks = () => {
  const { books, filters } = useLibraryStore();
  
  return books.filter(book => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        book.title.toLowerCase().includes(searchLower) ||
        (book.author?.toLowerCase().includes(searchLower)) ||
        book.filename.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }
    
    // Favorites filter
    if (filters.favorites && !book.favorite) return false;
    
    // Has progress filter
    if (filters.hasProgress && !book.progress) return false;
    
    // Collections filter
    if (filters.collections.length > 0) {
      const hasMatchingCollection = filters.collections.some(collectionId =>
        book.collections.includes(collectionId)
      );
      if (!hasMatchingCollection) return false;
    }
    
    return true;
  }).sort((a, b) => {
    // Sort by selected criteria
    switch (filters.sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'author':
        return (a.author || '').localeCompare(b.author || '');
      case 'lastOpened':
        return (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0);
      case 'progress':
        return (b.progress?.percent || 0) - (a.progress?.percent || 0);
      case 'recentlyAdded':
      default:
        return b.addedAt - a.addedAt;
    }
  });
};

export const useBookCounts = () => {
  const { books, continueBooks, recentlyAddedBooks, favoriteBooks } = useLibraryStore();
  
  return {
    total: books.length,
    continue: continueBooks.length,
    recent: recentlyAddedBooks.length,
    favorites: favoriteBooks.length
  };
};
