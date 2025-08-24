/**
 * Reader page that accepts bookId from URL
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import AppShell from '@/components/AppShell';

function ReaderContent() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get('bookId');

  if (!bookId) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Book Not Found
          </h1>
          <p className="text-muted-foreground mb-4">
            No book ID provided. Please select a book from your library.
          </p>
          <a
            href="/library"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Go to Library
          </a>
        </div>
      </div>
    );
  }

  return <AppShell bookId={bookId} />;
}

export default function ReaderPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Loading Reader...
          </h1>
        </div>
      </div>
    }>
      <ReaderContent />
    </Suspense>
  );
}
