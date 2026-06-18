const DB_NAME = 'pushuppros-dev'
const DB_VERSION = 1
const STORE = 'lab-handoff'
const KEY = 'latest'

export type PushupLabHandoff = {
  blob: Blob
  fileName: string
  reps: number
  variant: 'solo' | 'default'
  durationSec: number
  exportedAt: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
  })
}

export async function savePushupLabHandoff(handoff: PushupLabHandoff): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'))
      tx.oncomplete = () => resolve()
      tx.objectStore(STORE).put(handoff, KEY)
    })
  } finally {
    db.close()
  }
}

export async function loadPushupLabHandoff(): Promise<PushupLabHandoff | null> {
  const db = await openDb()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB read failed'))
      const req = tx.objectStore(STORE).get(KEY)
      req.onsuccess = () => resolve((req.result as PushupLabHandoff | undefined) ?? null)
      req.onerror = () => reject(req.error ?? new Error('IndexedDB get failed'))
    })
  } finally {
    db.close()
  }
}

export async function clearPushupLabHandoff(): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB delete failed'))
      tx.oncomplete = () => resolve()
      tx.objectStore(STORE).delete(KEY)
    })
  } finally {
    db.close()
  }
}
