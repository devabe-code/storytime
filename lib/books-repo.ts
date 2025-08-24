/**
 * Books repository for Storytime Library
 * Handles all book-related operations with IndexedDB
 */

import { get, set, putBlob, getBlob, list, remove } from './idb';
import { ensureObjectURL, revokeObjectURL } from './object-url';
import { extractEPUBMetadataAndCover, generatePlaceholderCover } from './epub-meta';
import { Book, Progress, Collection, BookWithProgressAndCover } from '@/types/library';

/**
 * Generate a UUID with fallback for environments without crypto.randomUUID
 */
function generateUUID(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (error) {
    console.warn('crypto.randomUUID not available:', error);
  }
  
  // Fallback UUID generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Compute SHA-256 hash of file bytes for deduplication
 */
export async function computeHash(file: File): Promise<string> {
  try {
    // Check if Web Crypto API is available
    if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback: use filename + size + lastModified as a pseudo-hash
      // This is not cryptographically secure but provides basic deduplication
      console.warn('Web Crypto API not available, using fallback hash method');
      const fallbackHash = `${file.name}-${file.size}-${file.lastModified}`;
      return btoa(fallbackHash).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    }
  } catch (error) {
    console.warn('Hash computation failed, using fallback method:', error);
    // Ultimate fallback: use filename + size
    const fallbackHash = `${file.name}-${file.size}`;
    return btoa(fallbackHash).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
  }
}

/**
 * Add books to the library with deduplication
 */
export async function addBooks(files: File[]): Promise<{ added: Book[], updated: Book[], errors: string[] }> {
  const added: Book[] = [];
  const updated: Book[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      // Check if file is EPUB
      if (!file.name.toLowerCase().endsWith('.epub')) {
        errors.push(`${file.name}: Not an EPUB file`);
        continue;
      }

      // Compute hash for deduplication
      const hash = await computeHash(file);
      
      // Check for existing book with same hash
      const existingBooks = await list<Book>('books', 'hash', hash);
      if (existingBooks.length > 0) {
        // Update existing book
        const existingBook = existingBooks[0];
        existingBook.lastOpenedAt = Date.now();
        existingBook.addedAt = Date.now();
        await set('books', existingBook);
        updated.push(existingBook);
        continue;
      }

      // Extract metadata and cover
      const { metadata, coverBlob } = await extractEPUBMetadataAndCover(file);
      
      // Generate cover if none found
      let finalCoverBlob = coverBlob;
      if (!finalCoverBlob) {
        finalCoverBlob = await generatePlaceholderCover(metadata.title, metadata.author);
      }

      // Create new book
      const book: Book = {
        id: generateUUID(),
        hash,
        title: metadata.title || file.name.replace(/\.epub$/i, ''),
        author: metadata.author,
        filename: file.name,
        filesize: file.size,
        addedAt: Date.now(),
        lastOpenedAt: null,
        favorite: false,
        coverBlobId: finalCoverBlob ? generateUUID() : null,
        collections: []
      };

      // Store book metadata
      await set('books', book);
      
      // Store book blob
      await putBlob('blobs', book.id, file);
      
      // Store cover blob if exists
      if (finalCoverBlob && book.coverBlobId) {
        await putBlob('blobs', book.coverBlobId, finalCoverBlob);
      }

      added.push(book);
      
    } catch (error) {
      console.error(`Failed to add book ${file.name}:`, error);
      errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { added, updated, errors };
}

/**
 * Get a book by ID with progress
 */
export async function getBook(bookId: string): Promise<BookWithProgressAndCover | null> {
  try {
    const book = await get<Book>('books', bookId);
    if (!book) return null;

    const progress = await get<Progress>('progress', bookId);
    
    // Get cover URL
    let coverUrl: string | undefined;
    if (book.coverBlobId) {
      const coverBlob = await getBlob('blobs', book.coverBlobId);
      if (coverBlob) {
        coverUrl = ensureObjectURL(coverBlob, book.coverBlobId);
      }
    }

    return {
      ...book,
      progress,
      coverUrl
    };
  } catch (error) {
    console.error('Failed to get book:', error);
    return null;
  }
}

/**
 * List all books with progress and covers
 */
export async function listBooks(): Promise<BookWithProgressAndCover[]> {
  try {
    const books = await list<Book>('books');
    const booksWithProgress: BookWithProgressAndCover[] = [];

    for (const book of books) {
      const progress = await get<Progress>('progress', book.id);
      
      // Get cover URL
      let coverUrl: string | undefined;
      if (book.coverBlobId) {
        const coverBlob = await getBlob('blobs', book.coverBlobId);
        if (coverBlob) {
          coverUrl = ensureObjectURL(coverBlob, book.coverBlobId);
          console.log(`Created cover URL for ${book.title}:`, coverUrl);
        } else {
          console.warn(`Cover blob not found for ${book.title} with ID:`, book.coverBlobId);
        }
      } else {
        console.log(`No cover blob ID for ${book.title}`);
      }

      booksWithProgress.push({
        ...book,
        progress,
        coverUrl
      });
    }

    return booksWithProgress;
  } catch (error) {
    console.error('Failed to list books:', error);
    return [];
  }
}

/**
 * List books to continue reading (with progress < 100%)
 */
export async function listContinue(): Promise<BookWithProgressAndCover[]> {
  try {
    const books = await listBooks();
    return books
      .filter(book => book.progress && book.progress.percent < 100)
      .sort((a, b) => (b.progress?.updatedAt || 0) - (a.progress?.updatedAt || 0));
  } catch (error) {
    console.error('Failed to list continue books:', error);
    return [];
  }
}

/**
 * List recently added books
 */
export async function listRecentlyAdded(limit: number = 10): Promise<BookWithProgressAndCover[]> {
  try {
    const books = await listBooks();
    return books
      .sort((a, b) => b.addedAt - a.addedAt)
      .slice(0, limit);
  } catch (error) {
    console.error('Failed to list recently added books:', error);
    return [];
  }
}

/**
 * List favorite books
 */
export async function listFavorites(): Promise<BookWithProgressAndCover[]> {
  try {
    const books = await listBooks();
    return books.filter(book => book.favorite);
  } catch (error) {
    console.error('Failed to list favorite books:', error);
    return [];
  }
}

/**
 * Set reading progress for a book
 */
export async function setProgress(bookId: string, progress: Omit<Progress, 'bookId' | 'updatedAt'>): Promise<void> {
  try {
    const progressRecord: Progress = {
      bookId,
      ...progress,
      updatedAt: Date.now()
    };
    
    await set('progress', progressRecord);
    
    // Update book's lastOpenedAt
    const book = await get<Book>('books', bookId);
    if (book) {
      book.lastOpenedAt = Date.now();
      await set('books', book);
    }
  } catch (error) {
    console.error('Failed to set progress:', error);
  }
}

/**
 * Remove a book and all associated data
 */
export async function removeBook(bookId: string): Promise<void> {
  try {
    const book = await get<Book>('books', bookId);
    if (!book) return;

    // Revoke cover object URL
    if (book.coverBlobId) {
      revokeObjectURL(book.coverBlobId);
    }

    // Remove from all stores
    await remove('books', bookId);
    await remove('blobs', bookId);
    await remove('progress', bookId);
    
    // Remove cover blob if exists
    if (book.coverBlobId) {
      await remove('blobs', book.coverBlobId);
    }
  } catch (error) {
    console.error('Failed to remove book:', error);
  }
}

/**
 * Refresh cover URLs for all books (useful after page reload)
 */
export async function refreshCoverURLs(): Promise<void> {
  try {
    const books = await list<Book>('books');
    
    for (const book of books) {
      if (book.coverBlobId) {
        const coverBlob = await getBlob('blobs', book.coverBlobId);
        if (coverBlob) {
          ensureObjectURL(coverBlob, book.coverBlobId);
        }
      }
    }
  } catch (error) {
    console.error('Failed to refresh cover URLs:', error);
  }
}

/**
 * Update book metadata
 */
export async function updateBookMeta(bookId: string, updates: Partial<Book>): Promise<void> {
  try {
    const book = await get<Book>('books', bookId);
    if (!book) return;

    const updatedBook = { ...book, ...updates };
    await set('books', updatedBook);
  } catch (error) {
    console.error('Failed to update book metadata:', error);
  }
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(bookId: string): Promise<void> {
  try {
    const book = await get<Book>('books', bookId);
    if (!book) return;

    book.favorite = !book.favorite;
    await set('books', book);
  } catch (error) {
    console.error('Failed to toggle favorite:', error);
  }
}

/**
 * Add book to collection
 */
export async function addToCollection(bookId: string, collectionId: string): Promise<void> {
  try {
    const book = await get<Book>('books', bookId);
    if (!book) return;

    if (!book.collections.includes(collectionId)) {
      book.collections.push(collectionId);
      await set('books', book);
    }
  } catch (error) {
    console.error('Failed to add to collection:', error);
  }
}

/**
 * Remove book from collection
 */
export async function removeFromCollection(bookId: string, collectionId: string): Promise<void> {
  try {
    const book = await get<Book>('books', bookId);
    if (!book) return;

    book.collections = book.collections.filter(id => id !== collectionId);
    await set('books', book);
  } catch (error) {
    console.error('Failed to remove from collection:', error);
  }
}

/**
 * Get book blob for reading
 */
export async function getBookBlob(bookId: string): Promise<Blob | null> {
  try {
    return await getBlob('blobs', bookId) || null;
  } catch (error) {
    console.error('Failed to get book blob:', error);
    return null;
  }
}
