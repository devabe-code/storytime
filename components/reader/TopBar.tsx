"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Settings, List, ChevronLeft, ChevronRight, Upload, PanelLeftOpen, PanelLeftClose, Bookmark } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { TocList, TOCItem } from "./TocList";
import { toast } from "sonner";
import { clearLastBook } from "@/lib/persist";

import { useSidebar } from "@/components/ui/sidebar";

export function TopBar({
  sidebarOpen,
  setSidebarOpen,
  onPrev,
  onNext,
  flow,
  setFlow,
  justify,
  setJustify,
  hyphenate,
  setHyphenate,
  spacing,
  setSpacing,
  onChooseFile,
  coverUrl,
  title,
  author,
  toc,
  onSelectHref,
  onBookmark,
}: {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onPrev: () => void;
  onNext: () => void;
  flow: "paginated" | "scrolled";
  setFlow: (v: "paginated" | "scrolled") => void;
  justify: boolean;
  setJustify: (v: boolean) => void;
  hyphenate: boolean;
  setHyphenate: (v: boolean) => void;
  spacing: number;
  setSpacing: (v: number) => void;
  onChooseFile: () => void;
  onBookmark: () => void;
  coverUrl?: string;
  title: string;
  author: string;
  toc: TOCItem[];
  onSelectHref: (href?: string) => void;
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

      {/* Settings */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Settings"><Settings className="h-5 w-5"/></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Layout</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={flow} onValueChange={(v: string) => setFlow(v as "paginated" | "scrolled")}>
              <DropdownMenuRadioItem value="paginated">Paginated</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="scrolled">Scrolled</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Typography</DropdownMenuLabel>
            <DropdownMenuItem onClick={()=> setJustify(!justify)}>
              {justify ? "✓ " : "○ "} Justify paragraphs
            </DropdownMenuItem>
            <DropdownMenuItem onClick={()=> setHyphenate(!hyphenate)}>
              {hyphenate ? "✓ " : "○ "} Hyphenation
            </DropdownMenuItem>
            <div className="px-2 py-3">
              <div className="text-xs text-muted-foreground mb-1">Line height</div>
              <Slider value={[spacing]} min={1.2} max={2} step={0.05} onValueChange={(v)=> setSpacing(v[0])} />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Storage</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={async () => {
                await clearLastBook();
                toast.success("Saved book cleared");
              }}
            >
              Clear saved book
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="sm" onClick={onChooseFile}><Upload className="mr-2 h-4 w-4"/>Open</Button>
      </div>
    </div>
  );
}


