/**
 * Book shelf component for displaying books in rows or grids
 */

import { BookShelfProps } from '@/types/library';
import BookCard from './BookCard';
import EmptyState from './EmptyState';
import { useLibraryStore } from './store';
import { toggleFavorite, removeBook } from '@/lib/books-repo';
import { useRouter } from 'next/navigation';

export default function BookShelf({ 
  title, 
  books, 
  variant, 
  emptyHint = "No books found",
  maxItems 
}: BookShelfProps) {
  const router = useRouter();
  // (no local sidebar calls needed here)

  const displayBooks = maxItems ? books.slice(0, maxItems) : books;

  const handleOpen = (bookId: string) => {
    router.push(`/reader?bookId=${bookId}`);
  };

  const handleFavorite = async (bookId: string, favorite: boolean) => {
    await toggleFavorite(bookId);
    // Refresh the library data
    useLibraryStore.getState().loadBooks();
  };

  const handleRemove = async (bookId: string) => {
    if (confirm('Are you sure you want to remove this book? This action cannot be undone.')) {
      await removeBook(bookId);
      // Refresh the library data
      useLibraryStore.getState().loadBooks();
    }
  };

  const handleAddToCollection = (bookId: string, collectionId: string) => {
    // TODO: Implement collection management
    console.log('Add to collection:', bookId, collectionId);
  };

  if (books.length === 0) {
    return (
      <div className="py-8">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <EmptyState
          title="No books yet"
          description={emptyHint}
          action={{
            label: "Upload your first book",
            onClick: () => {
              // Ask the shell to open the dialog without coupling to its state
              window.dispatchEvent(new CustomEvent('library:open-upload'));
            }
          }}
          icon="Upload"
        />
      </div>
    );
  }

  if (variant === 'row') {
    return (
      <div className="py-6">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
          {displayBooks.map((book) => (
            <div key={book.id} className="flex-shrink-0 snap-start">
              <BookCard
                book={book}
                variant="compact"
                onOpen={handleOpen}
                onFavorite={handleFavorite}
                onRemove={handleRemove}
                onAddToCollection={handleAddToCollection}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="py-6">
        <h2 className="text-xl font-semibold mb-4">{title}</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
          {displayBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              variant="compact"
              onOpen={handleOpen}
              onFavorite={handleFavorite}
              onRemove={handleRemove}
              onAddToCollection={handleAddToCollection}
            />
          ))}
        </div>
      </div>
    );
  }

  // Grid variant (default)
  return (
    <div className="py-6">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {displayBooks.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            onOpen={handleOpen}
            onFavorite={handleFavorite}
            onRemove={handleRemove}
            onAddToCollection={handleAddToCollection}
          />
        ))}
      </div>
    </div>
  );
}
