"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

// ————————————————————————————————————————————————————————————
// Small utilities to mirror the compact “image settings” modal style
// ————————————————————————————————————————————————————————————

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 border-t pt-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {children}
      </h3>
    </div>
  );
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <Label className="text-sm font-normal text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function Stepper({
  value,
  onChange,
  step = 1,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  className = "",
}: {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-md"
        onClick={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number((e.target as HTMLInputElement).value || 0))}
        className="h-8 w-20 text-right"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-md"
        onClick={() => onChange(Math.min(max, Math.round((value + step) * 100) / 100))}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function SliderRow({
  value,
  onChange,
  min,
  max,
  step,
  showValue,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
  showValue?: string | number;
}) {
  return (
    <div className="flex items-center gap-3 min-w-[240px] w-[360px]">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        className="w-full"
        onValueChange={(v) => onChange(v[0] ?? value)}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(Math.min(max, Math.round((value + step) * 100) / 100))}
      >
        <Plus className="h-4 w-4" />
      </Button>
      {showValue !== undefined && (
        <div className="shrink-0 rounded-md border px-2 py-1 text-xs text-muted-foreground">
          {showValue}
        </div>
      )}
    </div>
  );
}

// ————————————————————————————————————————————————————————————
// Component
// ————————————————————————————————————————————————————————————

export type CustomFont = { family: string; url: string; format?: string } | null;

export function SettingsDialog({
  open,
  onOpenChange,
  // Font settings
  overrideFont,
  setOverrideFont,
  fontFamily,
  setFontFamily,
  availableFamilies,
  fontPercent,
  setFontPercent,
  fontWeight,
  setFontWeight,
  lineHeight,
  setLineHeight,
  letterSpacing,
  setLetterSpacing,
  hyphenate,
  setHyphenate,
  justify,
  setJustify,
  customFont,
  onAddCustomFont,
  // Layout settings
  overrideLayout,
  setOverrideLayout,
  paragraphMargin,
  setParagraphMargin,
  paragraphLineSpacing,
  setParagraphLineSpacing,
  paragraphWordSpacing,
  setParagraphWordSpacing,
  paragraphLetterSpacing,
  setParagraphLetterSpacing,
  textIndent,
  setTextIndent,
  pageMarginTop,
  setPageMarginTop,
  pageMarginBottom,
  setPageMarginBottom,
  pageMarginLeft,
  setPageMarginLeft,
  pageMarginRight,
  setPageMarginRight,
  columnGapPct,
  setColumnGapPct,
  maxColumns,
  setMaxColumns,
  maxInlineSize,
  setMaxInlineSize,
  maxBlockSize,
  setMaxBlockSize,
  // Controls
  showTopBar,
  setShowTopBar,
  showBottomBar,
  setShowBottomBar,
  showRemainingTime,
  setShowRemainingTime,
  showRemainingPages,
  setShowRemainingPages,
  showReadingProgress,
  setShowReadingProgress,
  progressStyle,
  setProgressStyle,
  applyInScrollMode,
  setApplyInScrollMode,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  overrideFont: boolean;
  setOverrideFont: (v: boolean) => void;
  fontFamily: string;
  setFontFamily: (v: string) => void;
  availableFamilies: string[];
  fontPercent: number;
  setFontPercent: (v: number) => void;
  fontWeight: number;
  setFontWeight: (v: number) => void;
  lineHeight: number;
  setLineHeight: (v: number) => void;
  letterSpacing: number;
  setLetterSpacing: (v: number) => void;
  hyphenate: boolean;
  setHyphenate: (v: boolean) => void;
  justify: boolean;
  setJustify: (v: boolean) => void;
  customFont: CustomFont;
  onAddCustomFont: (family: string, file: File) => void;
  overrideLayout: boolean;
  setOverrideLayout: (v: boolean) => void;
  paragraphMargin: number;
  setParagraphMargin: (v: number) => void;
  paragraphLineSpacing: number;
  setParagraphLineSpacing: (v: number) => void;
  paragraphWordSpacing: number;
  setParagraphWordSpacing: (v: number) => void;
  paragraphLetterSpacing: number;
  setParagraphLetterSpacing: (v: number) => void;
  textIndent: number;
  setTextIndent: (v: number) => void;
  pageMarginTop: number;
  setPageMarginTop: (v: number) => void;
  pageMarginBottom: number;
  setPageMarginBottom: (v: number) => void;
  pageMarginLeft: number;
  setPageMarginLeft: (v: number) => void;
  pageMarginRight: number;
  setPageMarginRight: (v: number) => void;
  columnGapPct: number;
  setColumnGapPct: (v: number) => void;
  maxColumns: number;
  setMaxColumns: (v: number) => void;
  maxInlineSize: number;
  setMaxInlineSize: (v: number) => void;
  maxBlockSize: number;
  setMaxBlockSize: (v: number) => void;
  showTopBar: boolean;
  setShowTopBar: (v: boolean) => void;
  showBottomBar: boolean;
  setShowBottomBar: (v: boolean) => void;
  showRemainingTime: boolean;
  setShowRemainingTime: (v: boolean) => void;
  showRemainingPages: boolean;
  setShowRemainingPages: (v: boolean) => void;
  showReadingProgress: boolean;
  setShowReadingProgress: (v: boolean) => void;
  progressStyle: "percent" | "page";
  setProgressStyle: (v: "percent" | "page") => void;
  applyInScrollMode: boolean;
  setApplyInScrollMode: (v: boolean) => void;
}) {
  const [customFamily, setCustomFamily] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const triggerUpload = () => fileInputRef.current?.click();
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && customFamily.trim()) onAddCustomFont(customFamily.trim(), f);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs sm:max-w-4xl overflow-hidden rounded-xl shadow-xl">
        {/* Tabs header */}
        <DialogHeader>
          <DialogTitle>Reader Settings</DialogTitle>
        </DialogHeader>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/60 px-6 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/50">
          <Tabs defaultValue="font" className="w-full">
            <TabsList
              className="flex h-9 w-full gap-1 rounded-md border bg-muted/50 p-1 text-sm"
            >
              <TabsTrigger value="font" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Font
              </TabsTrigger>
              <TabsTrigger value="layout" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Layout
              </TabsTrigger>
              <TabsTrigger value="theme" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Color
              </TabsTrigger>
              <TabsTrigger value="behavior" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Behavior
              </TabsTrigger>
              <TabsTrigger value="language" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Language
              </TabsTrigger>
              <TabsTrigger value="custom" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                Custom
              </TabsTrigger>
            </TabsList>

            {/* Content area */}
            <div className="max-h-[60vh] overflow-y-auto px-6 pb-6 pt-4">
              {/* FONT */}
              <TabsContent value="font" className="m-0 space-y-2">
                <Row label="Override Book Font">
                  <Switch id="override-font" checked={overrideFont} onCheckedChange={setOverrideFont} />
                </Row>

                <SectionTitle>Typeface</SectionTitle>
                <Row label="Font Family">
                  <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger className="w-[260px]"><SelectValue placeholder="Select a font" /></SelectTrigger>
                    <SelectContent>
                      {availableFamilies.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                      {customFont?.family ? (
                        <SelectItem value={customFont.family}>
                          {customFont.family} (custom)
                        </SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                </Row>
                <Row label="Font Size">
                  <SliderRow
                    value={fontPercent}
                    onChange={(n) => setFontPercent(n)}
                    min={80}
                    max={200}
                    step={5}
                    showValue={`${fontPercent}%`}
                  />
                </Row>
                <Row label="Font Weight">
                  <SliderRow
                    value={fontWeight}
                    onChange={(n) => setFontWeight(n)}
                    min={100}
                    max={900}
                    step={50}
                    showValue={fontWeight}
                  />
                </Row>
                <Row label="Line Height">
                  <SliderRow
                    value={lineHeight}
                    onChange={(n) => setLineHeight(n)}
                    min={1.0}
                    max={2.0}
                    step={0.05}
                    showValue={lineHeight.toFixed(2)}
                  />
                </Row>
                <Row label="Letter Spacing">
                  <SliderRow
                    value={letterSpacing}
                    onChange={(n) => setLetterSpacing(n)}
                    min={-0.5}
                    max={2.0}
                    step={0.05}
                    showValue={`${letterSpacing.toFixed(2)} px`}
                  />
                </Row>

                <Row label="Full Justification">
                  <Switch id="justify" checked={justify} onCheckedChange={setJustify} />
                </Row>
                <Row label="Hyphenation">
                  <Switch id="hyphenate" checked={hyphenate} onCheckedChange={setHyphenate} />
                </Row>

                <SectionTitle>Font Face (custom)</SectionTitle>
                <div className="py-2.5">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Custom family name"
                      value={customFamily}
                      onChange={(e) => setCustomFamily(e.target.value)}
                      className="h-9 w-[220px]"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="font/*"
                      onChange={onFileChange}
                      className="hidden"
                    />
                    <Button variant="secondary" className="h-9" onClick={triggerUpload}>
                      Upload font file
                    </Button>
                    {customFont?.family && (
                      <span className="text-xs text-muted-foreground">Added: {customFont.family}</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Upload .ttf or .otf and then select it above.
                  </p>
                </div>
              </TabsContent>

              {/* LAYOUT */}
              <TabsContent value="layout" className="m-0 space-y-2">
                <Row label="Override Book Layout">
                  <Switch id="override-layout" checked={overrideLayout} onCheckedChange={setOverrideLayout} />
                </Row>

                <SectionTitle>Paragraph</SectionTitle>
                <Row label={`Letter Spacing`}>
                  <SliderRow
                    value={paragraphLetterSpacing}
                    onChange={setParagraphLetterSpacing}
                    min={-0.5}
                    max={2}
                    step={0.05}
                    showValue={`${paragraphLetterSpacing.toFixed(2)} px`}
                  />
                </Row>
                <Row label={`Word Spacing`}>
                  <SliderRow
                    value={paragraphWordSpacing}
                    onChange={setParagraphWordSpacing}
                    min={0}
                    max={4}
                    step={0.1}
                    showValue={`${paragraphWordSpacing.toFixed(2)} px`}
                  />
                </Row>
                <Row label={`Line Spacing`}>
                  <SliderRow
                    value={paragraphLineSpacing}
                    onChange={setParagraphLineSpacing}
                    min={1.0}
                    max={2.0}
                    step={0.05}
                    showValue={paragraphLineSpacing.toFixed(2)}
                  />
                </Row>
                <Row label={`Paragraph Margin`}>
                  <SliderRow
                    value={paragraphMargin}
                    onChange={setParagraphMargin}
                    min={0}
                    max={2}
                    step={0.05}
                    showValue={`${paragraphMargin.toFixed(2)} em`}
                  />
                </Row>
                <Row label={`Text Indent`}>
                  <SliderRow
                    value={textIndent}
                    onChange={setTextIndent}
                    min={0}
                    max={4}
                    step={0.1}
                    showValue={`${textIndent.toFixed(2)} em`}
                  />
                </Row>

                <SectionTitle>Page</SectionTitle>
                <Row label="Top Margin (px)">
                  <Stepper value={pageMarginTop} onChange={setPageMarginTop} step={8} min={0} />
                </Row>
                <Row label="Bottom Margin (px)">
                  <Stepper value={pageMarginBottom} onChange={setPageMarginBottom} step={8} min={0} />
                </Row>
                <Row label="Left Margin (px)">
                  <Stepper value={pageMarginLeft} onChange={setPageMarginLeft} step={8} min={0} />
                </Row>
                <Row label="Right Margin (px)">
                  <Stepper value={pageMarginRight} onChange={setPageMarginRight} step={8} min={0} />
                </Row>
                <Row label={`Column Gap`}>
                  <SliderRow
                    value={columnGapPct}
                    onChange={setColumnGapPct}
                    min={0}
                    max={20}
                    step={1}
                    showValue={`${columnGapPct}%`}
                  />
                </Row>
                <Row label={`Maximum Number of Columns`}>
                  <SliderRow value={maxColumns} onChange={setMaxColumns} min={1} max={3} step={1} showValue={maxColumns} />
                </Row>
                <Row label="Max Column Width (px)">
                  <Input type="number" value={maxInlineSize} onChange={(e) => setMaxInlineSize(Number((e.target as HTMLInputElement).value || 0))} className="h-8 w-24" />
                </Row>
                <Row label="Max Column Height (px)">
                  <Input type="number" value={maxBlockSize} onChange={(e) => setMaxBlockSize(Number((e.target as HTMLInputElement).value || 0))} className="h-8 w-24" />
                </Row>

                <SectionTitle>Controls</SectionTitle>
                <Row label="Show Top Bar">
                  <Switch checked={showTopBar} onCheckedChange={setShowTopBar} />
                </Row>
                <Row label="Show Bottom Bar">
                  <Switch checked={showBottomBar} onCheckedChange={setShowBottomBar} />
                </Row>
                <Row label="Show Remaining Time">
                  <Switch checked={showRemainingTime} onCheckedChange={setShowRemainingTime} />
                </Row>
                <Row label="Show Remaining Pages">
                  <Switch checked={showRemainingPages} onCheckedChange={setShowRemainingPages} />
                </Row>
                <Row label="Show Reading Progress">
                  <Switch checked={showReadingProgress} onCheckedChange={setShowReadingProgress} />
                </Row>
                <Row label="Progress Style">
                  <Select value={progressStyle} onValueChange={(v) => setProgressStyle((v as any) || "percent")}>
                    <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentage</SelectItem>
                      <SelectItem value="page">Page Number</SelectItem>
                    </SelectContent>
                  </Select>
                </Row>
                <Row label="Apply in Scroll Mode">
                  <Switch checked={applyInScrollMode} onCheckedChange={setApplyInScrollMode} />
                </Row>
              </TabsContent>

              {/* PLACEHOLDERS */}
              <TabsContent value="theme" className="m-0 text-sm text-muted-foreground">
                Theme settings coming soon.
              </TabsContent>
              <TabsContent value="behavior" className="m-0 text-sm text-muted-foreground">
                Behavior settings coming soon.
              </TabsContent>
              <TabsContent value="language" className="m-0 text-sm text-muted-foreground">
                Language settings coming soon.
              </TabsContent>
              <TabsContent value="custom" className="m-0 text-sm text-muted-foreground">
                Custom settings coming soon.
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
