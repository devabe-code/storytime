'use client'

import * as React from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
} from '@/components/ui/sidebar'
import { useReaderStore } from './reader/store'
import FoliateTocSidebar from './reader/FoliateTocSidebar'

export default function AppSidebar() {
  const title = useReaderStore(s => s.title)

  return (
    <Sidebar collapsible="offcanvas" side="left" className="border-r">
      <SidebarHeader className="px-3 py-2">
        <div className="text-sm font-medium truncate">{title ?? 'Library'}</div>
      </SidebarHeader>

      <SidebarContent className="p-0">
        <SidebarGroup className="p-0">
          {/* Your existing TOC panel */}
          <FoliateTocSidebar />
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 py-2 text-xs text-muted-foreground">
        Storytime
      </SidebarFooter>
    </Sidebar>
  )
}
