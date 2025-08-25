"use client";

type ProgressMap = Record<string, number>;

const LIB_KEY = "storytime.library.v1";
const PROG_KEY = "storytime.progress.v1";

export type SavedBook = {
  name: string;
  type: string;
  bytes: string; // base64 encoded string
};

export type LibraryItem = {
  id: string; // for samples: url; for uploads: generated id
  title: string;
  author?: string;
  cover?: string; // data URL if available
  url?: string; // http url for samples
  source: "sample" | "upload";
  fingerprint?: string; // used to dedupe uploads (name:size)
  fileData?: SavedBook; // stored file data for uploads
};

export function getLibrary(): LibraryItem[] {
  try {
    const raw = localStorage.getItem(LIB_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLibrary(items: LibraryItem[]) {
  try {
    localStorage.setItem(LIB_KEY, JSON.stringify(items));
  } catch {}
}

export function removeFromLibrary(id: string) {
  const items = getLibrary();
  const next = items.filter((it: LibraryItem) => it.id !== id);
  saveLibrary(next);
  return next;
}

export function hasUploadWithFingerprint(fp: string): boolean {
  const items = getLibrary();
  return items.some((it: LibraryItem) => it.fingerprint === fp);
}

export function getProgressMap(): ProgressMap {
  try {
    const raw = localStorage.getItem(PROG_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {} as ProgressMap;
  }
}

export function setProgress(id: string, fraction: number) {
  const map = getProgressMap();
  map[id] = fraction;
  try {
    localStorage.setItem(PROG_KEY, JSON.stringify(map));
  } catch {}
}


