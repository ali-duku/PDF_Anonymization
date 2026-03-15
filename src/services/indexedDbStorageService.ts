import type { PersistedViewerState, StoredPdfRecord } from "../types/pdf";
import type { StorageService } from "../types/services";

const DEFAULT_DB_NAME = "anonymizer-db";
const DEFAULT_DB_VERSION = 1;
const STORE_NAME = "app_state";
const PDF_RECORD_KEY = "last-uploaded-pdf";
const VIEWER_STATE_KEY = "viewer-state";

interface ViewerStateEntity {
  id: typeof VIEWER_STATE_KEY;
  value: PersistedViewerState;
}

/**
 * IndexedDB-backed storage service for the latest uploaded PDF and viewer state.
 */
export class IndexedDbStorageService implements StorageService {
  private readonly dbName: string;
  private readonly dbVersion: number;

  constructor(options?: { dbName?: string; dbVersion?: number }) {
    this.dbName = options?.dbName ?? DEFAULT_DB_NAME;
    this.dbVersion = options?.dbVersion ?? DEFAULT_DB_VERSION;
  }

  async loadPdfRecord(): Promise<StoredPdfRecord | null> {
    const result = await this.getByKey<StoredPdfRecord>(PDF_RECORD_KEY);
    return result ?? null;
  }

  async savePdfRecord(record: StoredPdfRecord): Promise<void> {
    await this.putValue(record);
  }

  async replacePdf(file: File, initialState: PersistedViewerState): Promise<StoredPdfRecord> {
    const record: StoredPdfRecord = {
      id: "last-uploaded-pdf",
      fileName: file.name,
      fileType: file.type || "application/pdf",
      fileSize: file.size,
      updatedAt: new Date().toISOString(),
      pdfBlob: file,
      viewerState: initialState
    };

    await this.savePdfRecord(record);
    await this.saveViewerState(initialState);
    return record;
  }

  async loadViewerState(): Promise<PersistedViewerState | null> {
    const entity = await this.getByKey<ViewerStateEntity>(VIEWER_STATE_KEY);
    return entity?.value ?? null;
  }

  async saveViewerState(state: PersistedViewerState): Promise<void> {
    const entity: ViewerStateEntity = {
      id: VIEWER_STATE_KEY,
      value: state
    };
    await this.putValue(entity);

    const existingRecord = await this.loadPdfRecord();
    if (existingRecord) {
      const nextRecord: StoredPdfRecord = {
        ...existingRecord,
        viewerState: state
      };
      await this.savePdfRecord(nextRecord);
    }
  }

  async clearPdfRecord(): Promise<void> {
    const db = await this.openDb();
    await Promise.all([
      this.deleteByKey(db, PDF_RECORD_KEY),
      this.deleteByKey(db, VIEWER_STATE_KEY)
    ]);
  }

  private async openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async getByKey<T>(key: string): Promise<T | undefined> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  private async putValue(value: object): Promise<void> {
    const db = await this.openDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.put(value);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }

  private async deleteByKey(db: IDBDatabase, key: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.delete(key);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }
}

export const storageService = new IndexedDbStorageService();
