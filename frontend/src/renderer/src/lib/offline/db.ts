import type {
  CachedCalculator,
  CachedMember,
  CachedOpenLoan,
  LocalAttendanceRecord,
  LocalBorrowRecord,
  OutboxItem,
} from "./types"

const DB_NAME = "lco-desk-offline"
const DB_VERSION = 1

type StoreName =
  | "meta"
  | "members"
  | "calculators"
  | "openLoans"
  | "outbox"
  | "localAttendance"
  | "localBorrows"

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta")
      }
      if (!db.objectStoreNames.contains("members")) {
        db.createObjectStore("members", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("calculators")) {
        db.createObjectStore("calculators", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("openLoans")) {
        db.createObjectStore("openLoans", { keyPath: "memberId" })
      }
      if (!db.objectStoreNames.contains("outbox")) {
        db.createObjectStore("outbox", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("localAttendance")) {
        db.createObjectStore("localAttendance", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("localBorrows")) {
        db.createObjectStore("localBorrows", { keyPath: "id" })
      }
    }
  })
}

function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode)
        const store = tx.objectStore(storeName)
        let request: IDBRequest<T> | void
        try {
          request = run(store)
        } catch (error) {
          reject(error)
          return
        }
        tx.oncomplete = () => resolve(request ? request.result : undefined)
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"))
        if (request) {
          request.onerror = () =>
            reject(request.error ?? new Error("IndexedDB request failed"))
        }
      })
  )
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await withStore("meta", "readwrite", (store) => {
    store.put(value, key)
  })
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await withStore("meta", "readonly", (store) =>
    store.get(key)
  )) as T | undefined
}

export async function replaceMembers(members: CachedMember[]): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("members", "readwrite")
    const store = tx.objectStore("members")
    store.clear()
    for (const member of members) store.put(member)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error("Failed to replace members"))
  })
}

export async function replaceCalculators(
  calculators: CachedCalculator[]
): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("calculators", "readwrite")
    const store = tx.objectStore("calculators")
    store.clear()
    for (const calculator of calculators) store.put(calculator)
    tx.oncomplete = () => resolve()
    tx.onerror = () =>
      reject(tx.error ?? new Error("Failed to replace calculators"))
  })
}

export async function replaceOpenLoans(loans: CachedOpenLoan[]): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("openLoans", "readwrite")
    const store = tx.objectStore("openLoans")
    store.clear()
    for (const loan of loans) store.put(loan)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error("Failed to replace open loans"))
  })
}

export async function getAllMembers(): Promise<CachedMember[]> {
  return ((await withStore("members", "readonly", (store) =>
    store.getAll()
  )) ?? []) as CachedMember[]
}

export async function getMember(id: string): Promise<CachedMember | undefined> {
  return (await withStore("members", "readonly", (store) =>
    store.get(id)
  )) as CachedMember | undefined
}

export async function getCalculator(
  id: string
): Promise<CachedCalculator | undefined> {
  return (await withStore("calculators", "readonly", (store) =>
    store.get(id)
  )) as CachedCalculator | undefined
}

export async function getAllOpenLoans(): Promise<CachedOpenLoan[]> {
  return ((await withStore("openLoans", "readonly", (store) =>
    store.getAll()
  )) ?? []) as CachedOpenLoan[]
}

export async function getOpenLoan(
  memberId: string
): Promise<CachedOpenLoan | undefined> {
  return (await withStore("openLoans", "readonly", (store) =>
    store.get(memberId)
  )) as CachedOpenLoan | undefined
}

export async function putOpenLoan(loan: CachedOpenLoan): Promise<void> {
  await withStore("openLoans", "readwrite", (store) => {
    store.put(loan)
  })
}

export async function deleteOpenLoan(memberId: string): Promise<void> {
  await withStore("openLoans", "readwrite", (store) => {
    store.delete(memberId)
  })
}

export async function putOutboxItem(item: OutboxItem): Promise<void> {
  await withStore("outbox", "readwrite", (store) => {
    store.put(item)
  })
}

export async function getOutboxItems(): Promise<OutboxItem[]> {
  const items = ((await withStore("outbox", "readonly", (store) =>
    store.getAll()
  )) ?? []) as OutboxItem[]
  return items.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
}

export async function deleteOutboxItem(id: string): Promise<void> {
  await withStore("outbox", "readwrite", (store) => {
    store.delete(id)
  })
}

export async function putLocalAttendance(
  record: LocalAttendanceRecord
): Promise<void> {
  await withStore("localAttendance", "readwrite", (store) => {
    store.put(record)
  })
}

export async function getLocalAttendance(): Promise<LocalAttendanceRecord[]> {
  const rows = ((await withStore("localAttendance", "readonly", (store) =>
    store.getAll()
  )) ?? []) as LocalAttendanceRecord[]
  return rows.sort(
    (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
  )
}

export async function deleteLocalAttendance(id: string): Promise<void> {
  await withStore("localAttendance", "readwrite", (store) => {
    store.delete(id)
  })
}

export async function clearLocalAttendance(): Promise<void> {
  await withStore("localAttendance", "readwrite", (store) => {
    store.clear()
  })
}

export async function putLocalBorrow(record: LocalBorrowRecord): Promise<void> {
  await withStore("localBorrows", "readwrite", (store) => {
    store.put(record)
  })
}

export async function getLocalBorrows(): Promise<LocalBorrowRecord[]> {
  const rows = ((await withStore("localBorrows", "readonly", (store) =>
    store.getAll()
  )) ?? []) as LocalBorrowRecord[]
  return rows.sort(
    (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
  )
}

export async function deleteLocalBorrow(id: string): Promise<void> {
  await withStore("localBorrows", "readwrite", (store) => {
    store.delete(id)
  })
}

export async function clearLocalBorrows(): Promise<void> {
  await withStore("localBorrows", "readwrite", (store) => {
    store.clear()
  })
}
