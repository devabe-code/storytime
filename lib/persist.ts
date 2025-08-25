// lib/persist.ts
const DB_NAME = "reader-db";
const STORE = "books";
const KEY_LAST = "last";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, value: any) {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet<T = any>(key: string): Promise<T | undefined> {
  const db = await openDB();
  const val = await new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return val;
}

async function idbDel(key: string) {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export type SavedBook = {
  name: string;
  type: string;
  bytes: ArrayBuffer;
};

export async function saveLastBook(file: File) {
  const bytes = await file.arrayBuffer();
  const record: SavedBook = { name: file.name || "book.epub", type: file.type || "application/epub+zip", bytes };
  await idbPut(KEY_LAST, record);
}

export async function loadLastBook(): Promise<File | undefined> {
  const rec = await idbGet<SavedBook>(KEY_LAST);
  if (!rec) return;
  return new File([rec.bytes], rec.name, { type: rec.type });
}

export async function clearLastBook() {
  await idbDel(KEY_LAST);
}
