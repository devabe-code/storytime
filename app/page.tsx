import AppShell from '@/components/AppShell';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookOpen, Library, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-8 p-8">
        <div className="space-y-4">
          <div className="w-24 h-24 mx-auto bg-primary rounded-full flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">Storytime</h1>
          <p className="text-xl text-muted-foreground max-w-md">
            Your personal digital library for EPUB books. Read anywhere, anytime.
          </p>
        </div>

        <div className="space-y-4">
          <Link href="/library">
            <Button size="lg" className="w-full sm:w-auto">
              <Library className="w-5 h-5 mr-2" />
              Go to Library
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>

        </div>
      </div>
    </div>
  );
}