const DB_NAME = 'paceboard'
const STORE   = 'requests'
const VERSION = 1
const TTL_MS  = 60 * 60 * 1000 // 1 hour

let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(STORE)
    }
    req.onsuccess  = e => resolve(e.target.result)
    req.onerror    = e => reject(e.target.error)
  })
  return dbPromise
}

export async function getCachedRequest(url) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(url)
      req.onsuccess = e => {
        const entry = e.target.result
        if (!entry || Date.now() - entry.ts > TTL_MS) return resolve(null)
        resolve(entry.data)
      }
      req.onerror = e => reject(e.target.error)
    })
  } catch {
    return null
  }
}

export async function setCachedRequest(url, data) {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE, 'readwrite')
      const req = tx.objectStore(STORE).put({ data, ts: Date.now() }, url)
      req.onsuccess = () => resolve()
      req.onerror   = e => reject(e.target.error)
    })
  } catch {
    // silently skip — caching is best-effort
  }
}

export async function clearCache() {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE, 'readwrite')
      const req = tx.objectStore(STORE).clear()
      req.onsuccess = () => resolve()
      req.onerror   = e => reject(e.target.error)
    })
  } catch {
    // ignore
  }
}
