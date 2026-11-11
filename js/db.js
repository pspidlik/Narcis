// Lokální databáze v zařízení (IndexedDB). Žádný server, nic neodchází z telefonu.
// Dva "šuplíky" (store):
//   entries – jednotlivé záznamy, liší se klíčem sekce, např. section = "gym/pumpa"
//   tables  – celé tabulky (sloupce + řádky) jako jeden záznam, např. id = "gym/tabulka"

const DB_NAME = 'narcis';
const DB_VERSION = 2; // zvyš, když budeš měnit strukturu (nový store, index…)

let dbPromise;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    // Spustí se jen při prvním otevření nebo po zvýšení DB_VERSION.
    // Každý store vytváříme, jen když ještě neexistuje – stará data zůstanou.
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('entries')) {
        const store = db.createObjectStore('entries', { keyPath: 'id', autoIncrement: true });
        store.createIndex('section', 'section');
      }
      if (!db.objectStoreNames.contains('tables')) {
        db.createObjectStore('tables', { keyPath: 'id' });
      }
    };

    req.onsuccess = () => {
      const db = req.result;
      // Když se jinde otevře novější verze appky, zavři starou, ať ji neblokuje
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

// Pomocník: převede IndexedDB požadavek na Promise, ať jde psát await
function run(storeName, mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const req = fn(tx.objectStore(storeName));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error);
      })
  );
}

// ---------- entries ----------

export function addEntry(section, data) {
  return run('entries', 'readwrite', (store) => store.add({ ...data, section, createdAt: Date.now() }));
}

export function listEntries(section) {
  return run('entries', 'readonly', (store) => store.index('section').getAll(section)).then((rows) =>
    rows.sort((a, b) => b.createdAt - a.createdAt)
  );
}

export function updateEntry(entry) {
  return run('entries', 'readwrite', (store) => store.put(entry));
}

export function deleteEntry(id) {
  return run('entries', 'readwrite', (store) => store.delete(id));
}

// ---------- tables ----------

// Vrátí tabulku, nebo undefined, když ještě neexistuje
export function getTable(id) {
  return run('tables', 'readonly', (store) => store.get(id));
}

// Uloží celou tabulku (přepíše předchozí verzi)
export function saveTable(table) {
  return run('tables', 'readwrite', (store) => store.put({ ...table, updatedAt: Date.now() }));
}

// Odložené uložení: při psaní neukládáme po každém písmenu, ale chvilku po posledním.
// Promise se splní, až se opravdu uloží (přepsaná, starší čekání se nesplní nikdy).
const pending = new Map(); // id tabulky -> { timer, run }

export function saveTableSoon(table, delay = 400) {
  const prev = pending.get(table.id);
  if (prev) clearTimeout(prev.timer);
  return new Promise((resolve, reject) => {
    const run = () => {
      pending.delete(table.id);
      saveTable(table).then(resolve, reject);
    };
    pending.set(table.id, { timer: setTimeout(run, delay), run });
  });
}

// Uloží hned všechno, co čeká – při přepnutí stránky nebo zavření appky
export function flushSaves() {
  for (const { timer, run } of [...pending.values()]) {
    clearTimeout(timer);
    run();
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) flushSaves();
});

// Požádá prohlížeč, ať data nemaže, když dochází místo (hlavně iOS)
export async function requestPersistence() {
  if (navigator.storage && navigator.storage.persist) {
    try { await navigator.storage.persist(); } catch { /* nevadí */ }
  }
}
