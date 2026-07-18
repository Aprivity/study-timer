export const BACKGROUND_IMAGE_KEY = "custom-background";
export const BACKGROUND_DATABASE_NAME = "aprivity-focus";
export const BACKGROUND_IMAGE_STORE_NAME = "background-images";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("当前浏览器不支持 IndexedDB。")); return; }
    const request = indexedDB.open(BACKGROUND_DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(BACKGROUND_IMAGE_STORE_NAME)) request.result.createObjectStore(BACKGROUND_IMAGE_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("无法打开本地图片存储。"));
  });
}

async function withStore<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(BACKGROUND_IMAGE_STORE_NAME, mode);
      const request = operation(transaction.objectStore(BACKGROUND_IMAGE_STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("本地图片操作失败。"));
      transaction.onabort = () => reject(transaction.error ?? new Error("本地图片操作已中止。"));
    });
  } finally { database.close(); }
}

export async function saveBackgroundImage(file: Blob): Promise<void> {
  await withStore("readwrite", (store) => store.put(file, BACKGROUND_IMAGE_KEY));
}

export async function getBackgroundImage(): Promise<Blob | null> {
  const value = await withStore<unknown>("readonly", (store) => store.get(BACKGROUND_IMAGE_KEY));
  return value instanceof Blob ? value : null;
}

export async function deleteBackgroundImage(): Promise<void> {
  await withStore("readwrite", (store) => store.delete(BACKGROUND_IMAGE_KEY));
}
