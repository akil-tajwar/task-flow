import { openDB, type IDBPDatabase } from 'idb';
import type { CreateSaleInput } from '@/hooks/use-sales';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface PendingSale {
  localId?:        number;
  payload:         CreateSaleInput;
  status:          'pending' | 'syncing' | 'synced' | 'failed';
  error?:          string | null;
  createdAt:       string;
  syncedAt?:       string | null;
  serverId?:       string | null;
  localDisplayId:  string;
}

export interface CachedProduct {
  id:        string;
  name:      string;
  sku:       string;
  basePrice: string;
  isActive:  boolean;
}

export interface CachedCustomer {
  id:     string;
  name:   string;
  phone?: string | null;
  email?: string | null;
}

// ─── DB init ──────────────────────────────────────────────────────────────────

let _db: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!_db) {
    _db = openDB('pos-offline', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('customers')) {
          db.createObjectStore('customers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pendingSales')) {
          const s = db.createObjectStore('pendingSales', { keyPath: 'localId', autoIncrement: true });
          s.createIndex('status', 'status');
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
      },
    });
  }
  return _db;
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function cacheProducts(products: CachedProduct[]) {
  const db = await getDB();
  const tx = db.transaction('products', 'readwrite');
  await Promise.all([...products.map((p) => tx.store.put(p)), tx.done]);
}

export async function getCachedProducts(): Promise<CachedProduct[]> {
  const db = await getDB();
  return db.getAll('products');
}

// ─── Customers ────────────────────────────────────────────────────────────────

export async function cacheCustomers(customers: CachedCustomer[]) {
  const db = await getDB();
  const tx = db.transaction('customers', 'readwrite');
  await Promise.all([...customers.map((c) => tx.store.put(c)), tx.done]);
}

export async function getCachedCustomers(): Promise<CachedCustomer[]> {
  const db = await getDB();
  return db.getAll('customers');
}

// ─── Meta (stores, accounts, lastSync) ───────────────────────────────────────

export async function setMeta(key: string, value: unknown) {
  const db = await getDB();
  await db.put('meta', { key, value });
}

export async function getMeta<T>(key: string): Promise<T | null> {
  const db = await getDB();
  const row = await db.get('meta', key);
  return row ? (row.value as T) : null;
}

// ─── Pending sales ────────────────────────────────────────────────────────────

export async function queueSale(payload: CreateSaleInput): Promise<PendingSale> {
  const db = await getDB();
  const total = await db.count('pendingSales');
  const sale: PendingSale = {
    payload,
    status:         'pending',
    createdAt:      new Date().toISOString(),
    localDisplayId: `OFFLINE-${String(total + 1).padStart(3, '0')}`,
  };
  const localId = (await db.add('pendingSales', sale)) as number;
  return { ...sale, localId };
}

export async function getPendingSales(): Promise<PendingSale[]> {
  const db = await getDB();
  return db.getAllFromIndex('pendingSales', 'status', 'pending');
}

export async function getAllSalesQueue(): Promise<PendingSale[]> {
  const db = await getDB();
  return db.getAll('pendingSales');
}

export async function updateSaleInQueue(
  localId: number,
  patch: Partial<Pick<PendingSale, 'status' | 'error' | 'syncedAt' | 'serverId'>>
) {
  const db = await getDB();
  const existing = await db.get('pendingSales', localId);
  if (existing) await db.put('pendingSales', { ...existing, ...patch });
}

export async function retrySale(localId: number) {
  await updateSaleInQueue(localId, { status: 'pending', error: null });
}

export async function clearSyncedSales() {
  const db   = await getDB();
  const all  = await db.getAll('pendingSales');
  const tx   = db.transaction('pendingSales', 'readwrite');
  await Promise.all([
    ...all.filter((s) => s.status === 'synced').map((s) => tx.store.delete(s.localId!)),
    tx.done,
  ]);
}
