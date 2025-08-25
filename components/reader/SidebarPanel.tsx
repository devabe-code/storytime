"use client";

import * as React from "react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TocList, TOCItem } from "./TocList";

export function SidebarPanel({
  title,
  author,
  coverUrl,
  toc,
  onSelectHref,
}: {
  title: string;
  author: string;
  coverUrl?: string;
  toc: TOCItem[];
  onSelectHref: (href?: string) => void;
}) {
  return (
    <div className="flex flex-col w-full h-full min-h-0">
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded bg-muted overflow-hidden">
            {coverUrl ? (
              <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-semibold">{title}</div>
            <div className="text-sm text-muted-foreground">{author}</div>
          </div>
        </div>
        <Separator />
      </div>
      <ScrollArea className="flex-1 min-h-0 p-3">
        {toc?.length ? (
          <TocList items={toc} onSelect={onSelectHref} />
        ) : (
          <div className="text-sm text-muted-foreground">No table of contents</div>
        )}
      </ScrollArea>
    </div>
  );
}


