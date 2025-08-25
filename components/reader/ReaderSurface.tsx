"use client";

import * as React from "react";

export function ReaderSurface({ containerRef, onDrop, onDragOver }: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
}) {
  return (
    <div className="absolute inset-0 pt-12 pb-16">
      <div ref={containerRef} className="h-full w-full" onDrop={onDrop} onDragOver={onDragOver}>
        {/* <foliate-view> will be inserted here */}
      </div>
    </div>
  );
}


