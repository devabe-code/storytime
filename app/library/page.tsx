/**
 * Main library page with book shelves
 */

'use client';

import { useEffect } from 'react';
import LibraryShell from '@/components/library/LibraryShell';
import BookShelf from '@/components/library/BookShelf';
import { useLibraryStore, useFilteredBooks } from '@/components/library/store';

export default function LibraryPage() {
  const { 
    viewState, 
    continueBooks, 
    recentlyAddedBooks, 
    favoriteBooks,
    loadBooks 
  } = useLibraryStore();
  
  const filteredBooks = useFilteredBooks();

  // Load books on mount
  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const renderContent = () => {
    switch (viewState.activeSection) {
      case 'home':
        return (
          <div className="space-y-8 p-6">
            {/* Continue Reading */}
            <BookShelf
              title="Continue Reading"
              books={continueBooks}
              variant="row"
              emptyHint="Open a book to see it here."
              maxItems={6}
            />

            {/* Recently Added */}
            <BookShelf
              title="Recently Added"
              books={recentlyAddedBooks}
              variant="row"
              emptyHint="Upload some books to get started."
              maxItems={6}
            />

            {/* All Books */}
            <BookShelf
              title="All Books"
              books={filteredBooks}
              variant={viewState.viewMode}
              emptyHint="Your library is empty. Upload some EPUB files to get started."
            />
          </div>
        );

      case 'all':
        return (
          <div className="p-6">
            <BookShelf
              title="All Books"
              books={filteredBooks}
              variant={viewState.viewMode}
              emptyHint="Your library is empty. Upload some EPUB files to get started."
            />
          </div>
        );

      case 'favorites':
        return (
          <div className="p-6">
            <BookShelf
              title="Favorites"
              books={favoriteBooks}
              variant={viewState.viewMode}
              emptyHint="Mark books as favorites to see them here."
            />
          </div>
        );

      case 'recent':
        return (
          <div className="p-6">
            <BookShelf
              title="Recently Added"
              books={recentlyAddedBooks}
              variant={viewState.viewMode}
              emptyHint="Upload some books to get started."
            />
          </div>
        );

      case 'collections':
        return (
          <div className="p-6">
            <div className="text-center py-16">
              <h2 className="text-xl font-semibold mb-4">Collections</h2>
              <p className="text-muted-foreground">
                Collections feature coming soon. You&apos;ll be able to organize your books into custom categories.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <LibraryShell>
      {renderContent()}
    </LibraryShell>
  );
}
