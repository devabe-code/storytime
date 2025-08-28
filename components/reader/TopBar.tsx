"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { List, ChevronLeft, ChevronRight, Upload, PanelLeftOpen, PanelLeftClose, Bookmark } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TocList, TOCItem } from "./TocList";
import { ThemeToggle } from "@/components/ThemeToggle";

import { useSidebar } from "@/components/ui/sidebar";

export function TopBar({
  sidebarOpen,
  setSidebarOpen,
  onPrev,
  onNext,
  onChooseFile,
  coverUrl,
  title,
  author,
  toc,
  onSelectHref,
  onBookmark,
  onOpenSettings,
  onFontSmaller,
  onFontLarger,
  fontPercent,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onPrev: () => void;
  onNext: () => void;
  onChooseFile: () => void;
  onBookmark: () => void;
  onOpenSettings: () => void;
  coverUrl?: string;
  title: string;
  author: string;
  toc: TOCItem[];
  onSelectHref: (href?: string) => void;
  onFontSmaller: () => void;
  onFontLarger: () => void;
  fontPercent: number;
}) {
  const { open: desktopOpen, setOpen: setDesktopOpen } = useSidebar();
  return (
    <div className="absolute top-0 left-0 right-0 z-10 h-12 px-2 flex items-center justify-between bg-background/60 backdrop-blur border-b">
      <div className="flex items-center gap-2">
        {/* Desktop sidebar toggle */}
        <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={()=> setDesktopOpen(!desktopOpen)} aria-label="Toggle sidebar">
          {desktopOpen ? <PanelLeftClose className="h-5 w-5"/> : <PanelLeftOpen className="h-5 w-5"/>}
        </Button>
        {/* Mobile sidebar trigger */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden"><List className="h-5 w-5"/></Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="p-4">
              <SheetTitle>Contents</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="size-12 rounded bg-muted overflow-hidden">
                  {coverUrl ? (<img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />) : (<div className="h-full w-full" />)}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{title}</div>
                  <div className="text-sm text-muted-foreground truncate">{author}</div>
                </div>
              </div>
              <ScrollArea className="h-[70dvh] pr-3">
                {toc?.length ? <TocList items={toc} onSelect={(href)=> { onSelectHref(href); setSidebarOpen(false); }} /> : (
                  <div className="text-sm text-muted-foreground">No table of contents</div>
                )}
              </ScrollArea>
            </div>
          </SheetContent>
        </Sheet>

        <Button variant="ghost" size="icon" onClick={onPrev} title="Previous">
          <ChevronLeft className="h-5 w-5"/>
        </Button>
        <Button variant="ghost" size="icon" onClick={onNext} title="Next">
          <ChevronRight className="h-5 w-5"/>
        </Button>
        <Button variant="ghost" size="icon" onClick={onBookmark} title="Bookmark"><Bookmark className="h-5 w-5"/></Button>
      </div>

      { /* Book Title and Author */}
      <div className="flex items-center gap-2">
        <div className="text-sm font-bold">{title}</div>
        <span>:</span>
        <div className="text-sm text-muted-foreground">{author}</div>
      </div>

      {/* Settings */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Button variant="outline" onClick={onOpenSettings}>Settings</Button>
        <Button variant="outline" size="sm" onClick={onChooseFile}><Upload className="mr-2 h-4 w-4"/>Open</Button>
      </div>
    </div>
  );
}


