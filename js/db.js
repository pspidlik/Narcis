// Lokální databáze v zařízení (IndexedDB). Žádný server, nic neodchází z telefonu.
// Všechny záznamy jsou v jednom "šuplíku" (store) entries a liší se klíčem sekce,
// např. section = "gym/pumpa".

const DB_NAME = 'narcis';
const DB_VERSION = 1; // zvyš, když budeš měnit strukturu (nový store, index…)

let dbPromise;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    // Spustí se jen při prvním otevření nebo po zvýšení DB_VERSION
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('entries')) {
        const store = db.createObjectStore('entries', { keyPath: 'id', autoIncrement: true });
        store.createIndex('section', 'section');
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

// Pomocník: převede IndexedDB požadavek na Promise, ať jde psát await
function run(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction('entries', mode);
        const req = fn(tx.objectStore('entries'));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error);
      })
  );
}

export function addEntry(section, data) {
  return run('readwrite', (store) => store.add({ ...data, section, createdAt: Date.now() }));
}

export function listEntries(section) {
  return run('readonly', (store) => store.index('section').getAll(section)).then((rows) =>
    rows.sort((a, b) => b.createdAt - a.createdAt)
  );
}

export function updateEntry(entry) {
  return run('readwrite', (store) => store.put(entry));
}

export function deleteEntry(id) {
  return run('readwrite', (store) => store.delete(id));
}

// Požádá prohlížeč, ať data nemaže, když dochází místo (hlavně iOS)
export async function requestPersistence() {
  if (navigator.storage && navigator.storage.persist) {
    try { await navigator.storage.persist(); } catch { /* nevadí */ }
  }
}
