"use client";

import * as React from "react";
import { Slider } from "@/components/ui/slider";
import { BookOpen } from "lucide-react";

export function BottomProgress({
  fraction,
  locLabel,
  onChange,
}: {
  fraction: number;
  locLabel: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 h-16 bg-background/60 backdrop-blur border-t">
      <div className="px-4 py-3 flex items-center gap-3">
        <BookOpen className="h-4 w-4 text-muted-foreground"/>
        <div className="text-xs text-muted-foreground w-28 shrink-0">{new Intl.NumberFormat("en", { style: "percent" }).format(fraction)}</div>
        <Slider
          className="flex-1"
          value={[fraction]}
          min={0}
          max={1}
          step={0.0001}
          onValueChange={(v)=> onChange(v[0])}
        />
        <div className="text-xs text-muted-foreground w-24 text-right shrink-0">{locLabel}</div>
      </div>
    </div>
  );
}


