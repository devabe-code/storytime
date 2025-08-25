"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

export interface TOCItem { label: string; href?: string; subitems?: TOCItem[] }

export function TocList({ items, onSelect, depth = 0 }: { items: TOCItem[]; onSelect: (href?: string) => void; depth?: number }) {
  const [openSet, setOpenSet] = React.useState<Record<string, boolean>>({});

  const toggle = (key: string) => setOpenSet((s) => ({ ...s, [key]: !s[key] }));

  return (
    <ul className="space-y-1">
      {items?.map((it, idx) => {
        const key = `${depth}-${idx}`;
        const hasChildren = !!it.subitems?.length;
        const isOpen = openSet[key] ?? depth < 1; // auto-open root-level
        return (
          <li key={key}>
            <div className="flex items-center gap-1">
              {hasChildren ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 shrink-0"
                  onClick={() => toggle(key)}
                  aria-label={isOpen ? "Collapse" : "Expand"}
                >
                  <ChevronDown className={`size-4 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                </Button>
              ) : (
                <span className="inline-block h-7 w-7" />
              )}
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => onSelect(it.href)}
              >
                {it.label}
              </Button>
            </div>
            {hasChildren && isOpen ? (
              <div className="ml-3 border-l pl-3">
                <TocList items={it.subitems!} onSelect={onSelect} depth={depth + 1} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}


