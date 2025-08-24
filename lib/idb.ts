/**
 * Tiny IndexedDB wrapper for Storytime Library
 * Handles database operations with proper error handling and type safety
 */

const DB_NAME = 'storytime';
const DB_VERSION = 2;

export interface IDBStore {
  name: string;
  keyPath: string;
  indexes?: Array<{
    name: string;
    keyPath: string;
    options?: IDBIndexParameters;
  }>;
}

const STORES: IDBStore[] = [
  {
    name: 'books',
    keyPath: 'id',
    indexes: [
      { name: 'title', keyPath: 'title' },
      { name: 'author', keyPath: 'author' },
      { name: 'addedAt', keyPath: 'addedAt' },
      { name: 'lastOpenedAt', keyPath: 'lastOpenedAt' },
      { name: 'favorite', keyPath: 'favorite' },
      { name: 'hash', keyPath: 'hash' }
    ]
  },
  {
    name: 'blobs',
    keyPath: 'bookId',
    indexes: [
      { name: 'size', keyPath: 'size' }
    ]
  },
  {
    name: 'progress',
    keyPath: 'bookId',
    indexes: [
      { name: 'percent', keyPath: 'percent' },
      { name: 'updatedAt', keyPath: 'updatedAt' }
    ]
  },
  {
    name: 'collections',
    keyPath: 'id',
    indexes: [
      { name: 'name', keyPath: 'name' }
    ]
  },
  {
    name: 'bookmarks',
    keyPath: 'id',
    indexes: [
      { name: 'bookId', keyPath: 'bookId' },
      { name: 'createdAt', keyPath: 'createdAt' }
    ]
  }
];

let db: IDBDatabase | null = null;

export async function openDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      
      console.log(`Upgrading database from version ${oldVersion} to ${DB_VERSION}`);
      
      // Create stores and indexes
      STORES.forEach(store => {
        if (!database.objectStoreNames.contains(store.name)) {
          console.log(`Creating store: ${store.name}`);
          const objectStore = database.createObjectStore(store.name, { keyPath: store.keyPath });
          
          // Create indexes
          store.indexes?.forEach(index => {
            console.log(`Creating index: ${index.name} on ${store.name}`);
            objectStore.createIndex(index.name, index.keyPath, index.options);
          });
        }
      });
    };
  });
}

export async function get<T>(storeName: string, key: string): Promise<T | undefined> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function set<T>(storeName: string, value: T): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(value);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function putBlob(storeName: string, key: string, blob: Blob): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put({ bookId: key, blob, size: blob.size });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getBlob(storeName: string, key: string): Promise<Blob | undefined> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result;
      resolve(result?.blob);
    };
  });
}

export async function list<T>(storeName: string, indexName?: string, query?: IDBValidKey | IDBKeyRange): Promise<T[]> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const source = indexName ? store.index(indexName) : store;
    const request = query ? source.getAll(query) : source.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function remove(storeName: string, key: string): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function clear(storeName: string): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
