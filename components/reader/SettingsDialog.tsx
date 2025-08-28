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

type CustomFont = { family: string; url: string; format?: string } | null;

export function SettingsDialog({
  open,
  onOpenChange,
  // Font settings state/handlers
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
}) {
  const [customFamily, setCustomFamily] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const triggerUpload = () => fileInputRef.current?.click();
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && customFamily.trim()) onAddCustomFont(customFamily.trim(), f);
    // reset
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Reader Settings</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="font">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="font">Font</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
            <TabsTrigger value="theme">Theme</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="language">Language</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="font" className="space-y-6 pt-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="override-font">Override Book Font</Label>
              <Switch id="override-font" checked={overrideFont} onCheckedChange={setOverrideFont} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Font Family</Label>
                <Select value={fontFamily} onValueChange={setFontFamily}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a font" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableFamilies.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                    {customFont?.family ? (
                      <SelectItem value={customFont.family}>{customFont.family} (custom)</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Font Size ({fontPercent}%)</Label>
                <Slider
                  min={80}
                  max={200}
                  step={5}
                  value={[fontPercent]}
                  onValueChange={(v) => setFontPercent(v[0] ?? fontPercent)}
                />
              </div>

              <div className="space-y-2">
                <Label>Font Weight ({fontWeight})</Label>
                <Slider
                  min={100}
                  max={900}
                  step={50}
                  value={[fontWeight]}
                  onValueChange={(v) => setFontWeight(v[0] ?? fontWeight)}
                />
              </div>

              <div className="space-y-2">
                <Label>Line Height ({lineHeight.toFixed(2)})</Label>
                <Slider
                  min={1.0}
                  max={2.0}
                  step={0.05}
                  value={[lineHeight]}
                  onValueChange={(v) => setLineHeight(v[0] ?? lineHeight)}
                />
              </div>

              <div className="space-y-2">
                <Label>Letter Spacing ({letterSpacing.toFixed(2)}px)</Label>
                <Slider
                  min={-0.5}
                  max={2.0}
                  step={0.05}
                  value={[letterSpacing]}
                  onValueChange={(v) => setLetterSpacing(v[0] ?? letterSpacing)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="justify">Justify Text</Label>
                  <Switch id="justify" checked={justify} onCheckedChange={setJustify} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="hyphenate">Hyphenation</Label>
                  <Switch id="hyphenate" checked={hyphenate} onCheckedChange={setHyphenate} />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Label>Font Face (custom)</Label>
              <div className="flex items-center gap-2">
                <Input placeholder="Custom family name" value={customFamily} onChange={(e) => setCustomFamily(e.target.value)} />
                <input ref={fileInputRef} type="file" accept="font/*" onChange={onFileChange} className="hidden" />
                <Button variant="secondary" onClick={triggerUpload}>Upload font file</Button>
                {customFont?.family && <span className="text-xs text-muted-foreground">Added: {customFont.family}</span>}
              </div>
              <p className="text-xs text-muted-foreground">Upload a font file (e.g. .ttf, .otf) and give it a family name, then select it above.</p>
            </div>
          </TabsContent>

          {/* Placeholders for future sections */}
          <TabsContent value="layout" className="pt-4 text-sm text-muted-foreground">Layout settings coming soon.</TabsContent>
          <TabsContent value="theme" className="pt-4 text-sm text-muted-foreground">Theme settings coming soon.</TabsContent>
          <TabsContent value="general" className="pt-4 text-sm text-muted-foreground">General settings coming soon.</TabsContent>
          <TabsContent value="language" className="pt-4 text-sm text-muted-foreground">Language settings coming soon.</TabsContent>
          <TabsContent value="custom" className="pt-4 text-sm text-muted-foreground">Custom settings coming soon.</TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}


