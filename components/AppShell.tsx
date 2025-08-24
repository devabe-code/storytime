'use client'

import * as React from 'react'
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import AppSidebar from './app-sidebar'
import ReaderHeader from './reader/ReaderHeader'
import ReaderFooter from './reader/ReaderFooter'
import FoliateReader from './FoliateReader'

/**
 * Wrap the reader in the shadcn/ui Sidebar shell.
 * The reader area is flex-1 and min-w-0 so it expands to full width when the sidebar collapses.
 * We also listen for sidebar state changes to force a layout resize on the viewer.
 */
export default function AppShell({ bookId }: { bookId?: string }) {
  return (
    <SidebarProvider defaultOpen /* open by default on desktop */>
      <AppSidebar />
      <SidebarInset className="flex h-dvh min-h-0 w-full">
        <TopBar />
        <main className="flex-1 min-w-0 min-h-0 relative">
          {/* The reader will occupy the entire area when the sidebar is closed */}
                           <FoliateReader bookId={bookId} className="absolute inset-0" />
        </main>
        <ReaderFooter />
      </SidebarInset>
    </SidebarProvider>
  )
}

function TopBar() {
  const { open } = useSidebar()

  // Broadcast a resize when the sidebar opens/closes so the reader repaginates.
  // Use a small debounce to prevent flickering if pagination shows slivers of next page.
  React.useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 150)
    return () => clearTimeout(t)
  }, [open])

  return (
    <div className="flex items-center gap-2 border-b px-3 h-12 shrink-0">
      <SidebarTrigger className="-ml-1" />
      <ReaderHeader />
    </div>
  )
}
