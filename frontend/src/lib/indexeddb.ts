/**
 * Browser IndexedDB storage for WebSnap Pro screenshots.
 * Stores image Blobs in the user's browser memory/storage to minimize server disk usage.
 */

const DB_NAME = 'websnap_db';
const DB_VERSION = 1;
const STORE_NAME = 'screenshots';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('scanId', 'scanId', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

export interface StoredScreenshot {
  id: string; // scanId:pageId:type
  scanId: string;
  pageId: string;
  type: 'full' | 'thumb';
  blob: Blob;
  filename: string;
  updatedAt: number;
}

/**
 * Saves a screenshot Blob to browser IndexedDB.
 */
export async function saveScreenshotBlob(
  scanId: string,
  pageId: string,
  type: 'full' | 'thumb',
  blob: Blob,
  filename: string
): Promise<void> {
  try {
    const db = await getDB();
    const id = `${scanId}:${pageId}:${type}`;
    const record: StoredScreenshot = {
      id,
      scanId,
      pageId,
      type,
      blob,
      filename,
      updatedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to save screenshot to browser IndexedDB:', err);
  }
}

/**
 * Retrieves a screenshot Blob from browser IndexedDB.
 */
export async function getScreenshotBlob(
  scanId: string,
  pageId: string,
  type: 'full' | 'thumb'
): Promise<Blob | null> {
  try {
    const db = await getDB();
    const id = `${scanId}:${pageId}:${type}`;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const record = request.result as StoredScreenshot | undefined;
        resolve(record ? record.blob : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to get screenshot from browser IndexedDB:', err);
    return null;
  }
}

/**
 * Retrieves an Object URL (blob:http://...) for a screenshot in browser memory.
 */
export async function getScreenshotObjectUrl(
  scanId: string,
  pageId: string,
  type: 'full' | 'thumb'
): Promise<string | null> {
  const blob = await getScreenshotBlob(scanId, pageId, type);
  if (!blob) return null;
  return URL.createObjectURL(blob);
}

/**
 * Gets all saved screenshot Blobs for a scanId.
 */
export async function getAllScanBlobs(scanId: string): Promise<StoredScreenshot[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('scanId');
      const request = index.getAll(scanId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to get scan blobs from browser IndexedDB:', err);
    return [];
  }
}

/**
 * Deletes all cached Blobs for a given scanId from browser storage.
 */
export async function clearScanStorage(scanId: string): Promise<void> {
  try {
    const db = await getDB();
    const blobs = await getAllScanBlobs(scanId);

    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    for (const b of blobs) {
      store.delete(b.id);
    }
  } catch (err) {
    console.warn('Failed to clear scan storage in IndexedDB:', err);
  }
}
