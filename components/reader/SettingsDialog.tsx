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
import { AnimatePresence, motion } from "framer-motion";

// ————————————————————————————————————————————————————————————
// Small utilities to mirror the compact “image settings” modal style
// ————————————————————————————————————————————————————————————

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <motion.div 
      className="mt-6 border-t pt-3"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {children}
      </h3>
    </motion.div>
  );
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.div 
      className="flex items-center justify-between py-2.5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <Label className="text-sm font-normal text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">{children}</div>
    </motion.div>
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
  // Theme settings
  backgroundColor,
  setBackgroundColor,
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
  backgroundColor: string;
  setBackgroundColor: (v: string) => void;
}) {
  const [customFamily, setCustomFamily] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("font");
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
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
        {/* Tabs header */}
        <DialogHeader>
          <DialogTitle>Reader Settings</DialogTitle>
        </DialogHeader>
          
          {/* Persistent Live Preview */}
          <div className="px-6 py-4 border-b bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">Live Preview</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-400"></span>
                  {overrideFont ? "Font Override" : "Default Font"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-400"></span>
                  {overrideLayout ? "Layout Override" : "Default Layout"}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Text Preview */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Text Appearance</div>
                <div 
                  className="rounded-lg border-2 border-border p-3 min-h-[80px] relative overflow-hidden"
                  style={{ backgroundColor: backgroundColor }}
                >
                  <div 
                    className="text-sm leading-relaxed"
                    style={{ 
                      color: (() => {
                        const hex = backgroundColor.replace('#', '');
                        const r = parseInt(hex.substr(0, 2), 16);
                        const g = parseInt(hex.substr(2, 2), 16);
                        const b = parseInt(hex.substr(4, 2), 16);
                        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                        return brightness < 128 ? '#ffffff' : '#000000';
                      })(),
                      fontFamily: overrideFont ? (customFont?.family ?? fontFamily) : 'inherit',
                      fontSize: `${fontPercent}%`,
                      fontWeight: overrideFont ? fontWeight : 'inherit',
                      lineHeight: lineHeight,
                      letterSpacing: `${letterSpacing}px`,
                      textAlign: justify ? 'justify' : 'left'
                    }}
                  >
                    <p className="mb-1">
                      This preview shows how your text will appear with the current settings.
                    </p>
                    <p className="text-xs opacity-80">
                      Font: {overrideFont ? (customFont?.family ?? fontFamily) : 'Book Default'} • Size: {fontPercent}% • Line Height: {lineHeight.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Layout Preview */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Page Layout</div>
                <div 
                  className="rounded-lg border-2 border-border p-3 min-h-[80px] relative overflow-hidden"
                  style={{ backgroundColor: backgroundColor }}
                >
                  <div 
                    className="text-xs leading-relaxed"
                    style={{ 
                      color: (() => {
                        const hex = backgroundColor.replace('#', '');
                        const r = parseInt(hex.substr(0, 2), 16);
                        const g = parseInt(hex.substr(2, 2), 16);
                        const b = parseInt(hex.substr(4, 2), 16);
                        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                        return brightness < 128 ? '#ffffff' : '#000000';
                      })()
                    }}
                  >
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Margins: {pageMarginTop}px top, {pageMarginBottom}px bottom</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Columns: {maxColumns} max</span>
                        <span>Gap: {columnGapPct}%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Width: {maxInlineSize}px</span>
                        <span>Height: {maxBlockSize}px</span>
                      </div>
                      <div className="text-xs opacity-80 mt-2">
                        {overrideLayout ? 'Custom layout applied' : 'Book default layout'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Current Settings Summary */}
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-background/80 text-foreground/80">
                  Background: {backgroundColor}
                </span>
                <span className="px-2 py-1 rounded bg-background/80 text-foreground/80">
                  Text: {(() => {
                    const hex = backgroundColor.replace('#', '');
                    const r = parseInt(hex.substr(0, 2), 16);
                    const g = parseInt(hex.substr(2, 2), 16);
                    const b = parseInt(hex.substr(4, 2), 16);
                    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                    return brightness < 128 ? 'White' : 'Black';
                  })()}
                </span>
                {overrideFont && (
                  <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    Font: {customFont?.family ?? fontFamily}
                  </span>
                )}
                {overrideLayout && (
                  <span className="px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Layout: Custom
                  </span>
                )}
              </div>
            </div>
          </div>
          
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/60 px-6 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/50">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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

              {/* Content area with smooth height animations */}
            <div className="max-h-[60vh] overflow-y-auto px-6 pb-6 pt-4">
                <AnimatePresence mode="wait">
                  {activeTab === "font" && (
                    <motion.div
                      key="font"
                      initial={{ opacity: 0, y: 20, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -20, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="space-y-2"
                    >
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
                    </motion.div>
                  )}

                  {activeTab === "layout" && (
                    <motion.div
                      key="layout"
                      initial={{ opacity: 0, y: 20, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -20, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="space-y-2"
                    >
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
                    </motion.div>
                  )}

                  {activeTab === "theme" && (
                    <motion.div
                      key="theme"
                      initial={{ opacity: 0, y: 20, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -20, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="space-y-2"
                    >
                      {/* Warning when overrides are active */}
                      {(overrideFont || overrideLayout) && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950"
                        >
                          <div className="flex items-start gap-2">
                            <div className="text-amber-600 dark:text-amber-400">⚠️</div>
                            <div className="text-sm">
                              <p className="font-medium text-amber-800 dark:text-amber-200">
                                {overrideFont && overrideLayout 
                                  ? "Font and Layout overrides are active" 
                                  : overrideFont 
                                    ? "Font override is active" 
                                    : "Layout override is active"
                                }
                              </p>
                              <p className="text-amber-700 dark:text-amber-300 mt-1">
                                Background color changes will still work, but some book-specific styling may override certain visual elements.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                      
                      <SectionTitle>Page Background</SectionTitle>
                      
                      {/* Override Status */}
                      {(overrideFont || overrideLayout) && (
                        <div className="mb-4 flex flex-wrap gap-2">
                          {overrideFont && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            >
                              <span className="h-2 w-2 rounded-full bg-blue-400"></span>
                              Font Override Active
                            </motion.span>
                          )}
                          {overrideLayout && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.1 }}
                              className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200"
                            >
                              <span className="h-2 w-2 rounded-full bg-green-400"></span>
                              Layout Override Active
                            </motion.span>
                          )}
                        </div>
                      )}
                      
                      <Row label="Background Color">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <label htmlFor="color-picker" className="sr-only">Choose background color</label>
                            <input
                              id="color-picker"
                              type="color"
                              value={backgroundColor}
                              onChange={(e) => setBackgroundColor(e.target.value)}
                              className="h-8 w-16 rounded border cursor-pointer"
                              aria-label="Choose background color"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <label htmlFor="hex-input" className="sr-only">Enter hex color code</label>
                            <Input
                              id="hex-input"
                              type="text"
                              value={backgroundColor}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Only update if it's a valid hex color or empty (to allow typing)
                                if (value === "" || /^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                                  setBackgroundColor(value);
                                }
                              }}
                              onBlur={(e) => {
                                const value = e.target.value;
                                // If the input is not a complete hex color, reset to current value
                                if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
                                  setBackgroundColor(backgroundColor);
                                }
                              }}
                              placeholder="#ffffff"
                              className="h-8 w-24"
                              aria-label="Enter hex color code"
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBackgroundColor("#ffffff")}
                            className="h-8"
                            aria-label="Reset to default white background"
                          >
                            Reset
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
                              setBackgroundColor(randomColor);
                            }}
                            className="h-8"
                            aria-label="Generate random background color"
                          >
                            Random
                          </Button>
                        </div>
                      </Row>
                      
                      <SectionTitle>Preview</SectionTitle>
                      <div className="py-2.5">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-sm text-muted-foreground">Background:</div>
                          <div 
                            className="h-12 w-24 rounded border-2 border-border flex items-center justify-center text-xs font-mono"
                            style={{ backgroundColor: backgroundColor }}
                          >
                            {backgroundColor}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm text-muted-foreground">Text Color:</div>
                          <div 
                            className="h-8 w-20 rounded border-2 border-border flex items-center justify-center text-xs font-mono"
                            style={{ 
                              backgroundColor: backgroundColor,
                              color: (() => {
                                const hex = backgroundColor.replace('#', '');
                                const r = parseInt(hex.substr(0, 2), 16);
                                const g = parseInt(hex.substr(2, 2), 16);
                                const b = parseInt(hex.substr(4, 2), 16);
                                const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                                return brightness < 128 ? '#ffffff' : '#000000';
                              })()
                            }}
                          >
                            {(() => {
                              const hex = backgroundColor.replace('#', '');
                              const r = parseInt(hex.substr(0, 2), 16);
                              const g = parseInt(hex.substr(2, 2), 16);
                              const b = parseInt(hex.substr(4, 2), 16);
                              const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                              return brightness < 128 ? '#ffffff' : '#000000';
                            })()}
                          </div>
                        </div>
                      </div>
                      <SectionTitle>Quick Themes</SectionTitle>
                      <div className="flex gap-2 py-2.5">
                        <motion.div 
                          className="flex-1"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBackgroundColor("#ffffff")}
                            className="w-full"
                          >
                            Light Theme
                          </Button>
                        </motion.div>
                        <motion.div 
                          className="flex-1"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBackgroundColor("#1a1a1a")}
                            className="w-full"
                          >
                            Dark Theme
                          </Button>
                        </motion.div>
                      </div>
                      
                      <SectionTitle>Preset Colors</SectionTitle>
                      <div className="grid grid-cols-6 gap-2 py-2.5">
                        {[
                          "#ffffff", // White
                          "#f8f9fa", // Light Gray
                          "#e9ecef", // Gray
                          "#fefefe", // Off White
                          "#fafafa", // Very Light Gray
                          "#f5f5f5", // Light Gray
                          "#e6f3ff", // Light Sky Blue
                          "#f0fff0", // Honeydew
                          "#fff8dc", // Cornsilk
                          "#fffaf0", // Floral White
                          "#fdf5e6", // Old Lace
                          "#f5f5dc", // Beige
                        ].map((color, index) => (
                          <motion.button
                            key={color}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ 
                              duration: 0.2, 
                              delay: index * 0.02,
                              ease: "easeOut"
                            }}
                            whileHover={{ scale: 1.1, rotate: 2 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            className={`h-8 w-8 rounded border-2 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                              backgroundColor === color 
                                ? "border-primary ring-2 ring-primary ring-offset-1" 
                                : "border-border"
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setBackgroundColor(color)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setBackgroundColor(color);
                              }
                            }}
                            title={`${color} - Click to select`}
                            aria-label={`Select ${color} as background color`}
                            tabIndex={0}
                          />
                        ))}
                      </div>
                      
                      <SectionTitle>Dark Theme</SectionTitle>
                      <div className="grid grid-cols-6 gap-2 py-2.5">
                        {[
                          "#1a1a1a", // Dark Gray
                          "#2d2d2d", // Charcoal
                          "#3a3a3a", // Medium Dark Gray
                          "#1e1e1e", // Very Dark Gray
                          "#2b2b2b", // Dark Charcoal
                          "#333333", // Dark Gray
                          "#1f1f1f", // Almost Black
                          "#2a2a2a", // Dark Gray
                          "#404040", // Medium Gray
                          "#1c1c1c", // Very Dark
                          "#2f2f2f", // Dark
                          "#262626", // Dark
                        ].map((color, index) => (
                          <motion.button
                            key={color}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ 
                              duration: 0.2, 
                              delay: index * 0.02,
                              ease: "easeOut"
                            }}
                            whileHover={{ scale: 1.1, rotate: 2 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            className={`h-8 w-8 rounded border-2 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                              backgroundColor === color 
                                ? "border-primary ring-2 ring-primary ring-offset-1" 
                                : "border-border"
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setBackgroundColor(color)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setBackgroundColor(color);
                              }
                            }}
                            title={`${color} - Click to select`}
                            aria-label={`Select ${color} as background color`}
                            tabIndex={0}
                          />
                        ))}
                      </div>
                      
                      <SectionTitle>Warm Colors</SectionTitle>
                      <div className="grid grid-cols-6 gap-2 py-2.5">
                        {[
                          "#fff5f5", // Very Light Red
                          "#fff0f0", // Light Red
                          "#fef2f2", // Light Red
                          "#fef7f7", // Very Light Red
                          "#fff8f8", // Very Light Red
                          "#fef9f9", // Very Light Red
                          "#fff9f0", // Light Orange
                          "#fff7ed", // Light Orange
                          "#fff4e6", // Light Orange
                          "#fff2e6", // Light Orange
                          "#fff8f0", // Very Light Orange
                          "#fff6f0", // Light Orange
                        ].map((color, index) => (
                          <motion.button
                            key={color}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ 
                              duration: 0.2, 
                              delay: index * 0.02,
                              ease: "easeOut"
                            }}
                            whileHover={{ scale: 1.1, rotate: 2 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            className={`h-8 w-8 rounded border-2 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                              backgroundColor === color 
                                ? "border-primary ring-2 ring-primary ring-offset-1" 
                                : "border-border"
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setBackgroundColor(color)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setBackgroundColor(color);
                              }
                            }}
                            title={`${color} - Click to select`}
                            aria-label={`Select ${color} as background color`}
                            tabIndex={0}
                          />
                        ))}
                      </div>
                      
                      <SectionTitle>Cool Colors</SectionTitle>
                      <div className="grid grid-cols-6 gap-2 py-2.5">
                        {[
                          "#f0f9ff", // Very Light Blue
                          "#f0f8ff", // Alice Blue
                          "#f0f7ff", // Light Blue
                          "#f0f6ff", // Light Blue
                          "#f0f5ff", // Light Blue
                          "#f0f4ff", // Light Blue
                          "#d4f1f4", // Light Cyan
                          "#f0fffa", // Light Cyan
                          "#f0fffd", // Very Light Cyan
                          "#f0fffe", // Very Light Cyan
                          "#f0ffff", // Azure
                          "#b3e5fc", // Light Blue
                        ].map((color, index) => (
                          <motion.button
                            key={color}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ 
                              duration: 0.2, 
                              delay: index * 0.02,
                              ease: "easeOut"
                            }}
                            whileHover={{ scale: 1.1, rotate: 2 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            className={`h-8 w-8 rounded border-2 transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                              backgroundColor === color 
                                ? "border-primary ring-2 ring-primary ring-offset-1" 
                                : "border-border"
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setBackgroundColor(color)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setBackgroundColor(color);
                              }
                            }}
                            title={`${color} - Click to select`}
                            aria-label={`Select ${color} as background color`}
                            tabIndex={0}
                          />
                        ))}
                      </div>
                      
                      <div className="py-2.5">
                        <p className="text-xs text-muted-foreground">
                          Choose a background color for the book pages. Use the color picker, enter a hex color code, or select from preset colors.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "behavior" && (
                    <motion.div
                      key="behavior"
                      initial={{ opacity: 0, y: 20, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -20, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="text-sm text-muted-foreground"
                    >
                Behavior settings coming soon.
                    </motion.div>
                  )}

                  {activeTab === "language" && (
                    <motion.div
                      key="language"
                      initial={{ opacity: 0, y: 20, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -20, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="text-sm text-muted-foreground"
                    >
                Language settings coming soon.
                    </motion.div>
                  )}

                  {activeTab === "custom" && (
                    <motion.div
                      key="custom"
                      initial={{ opacity: 0, y: 20, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -20, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="text-sm text-muted-foreground"
                    >
                Custom settings coming soon.
                    </motion.div>
                  )}
                </AnimatePresence>
            </div>
          </Tabs>
        </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
