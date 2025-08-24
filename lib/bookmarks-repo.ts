import { get, set, remove, list } from './idb'

export type Bookmark = {
  id: string
  bookId: string
  label: string
  createdAt: number
  sectionIndex: number
  sectionFraction: number // 0..1
  cfi?: string | null
}

export async function listBookmarks(bookId: string): Promise<Bookmark[]> {
  try {
    const allBookmarks = await list<Bookmark>('bookmarks');
    const filteredBookmarks = allBookmarks.filter(b => b.bookId === bookId);
    return filteredBookmarks.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Failed to list bookmarks:', error);
    return [];
  }
}

export async function addBookmark(b: Bookmark): Promise<void> {
  try {
    await set('bookmarks', b);
  } catch (error) {
    console.error('Failed to add bookmark:', error);
    throw error;
  }
}

export async function removeBookmark(id: string): Promise<void> {
  try {
    await remove('bookmarks', id);
  } catch (error) {
    console.error('Failed to remove bookmark:', error);
    throw error;
  }
}

export async function updateBookmarkLabel(id: string, label: string) {
  try {
    const bookmark = await get<Bookmark>('bookmarks', id);
    if (!bookmark) return;
    
    bookmark.label = label;
    await set('bookmarks', bookmark);
  } catch (error) {
    console.error('Failed to update bookmark label:', error);
    throw error;
  }
}
