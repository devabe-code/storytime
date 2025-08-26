// components/reader/BookmarksPanel.tsx

import { type Bookmark } from "@/lib/reader/bookmarks";

export function BookmarksPanel({ bookmarks, onGoTo, onRemove }: { bookmarks: Bookmark[], onGoTo: (bm: Bookmark) => void, onRemove: (bm: Bookmark) => void }) {  
    if (bookmarks.length === 0) return null;
    return (
        <div className="mt-6">
          <div className="text-sm font-semibold mb-2">Bookmarks</div>
          <ul className="space-y-2">
            {bookmarks.map((bm) => (
              <li key={bm.id} className="flex items-center justify-between">
                <button
                  className="text-left text-sm hover:underline"
                  onClick={() => onGoTo(bm)}
                  title={new Date(bm.createdAt).toLocaleString()}
                >
                  {bm.label}
                </button>
                <button
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(bm)}
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      );
}