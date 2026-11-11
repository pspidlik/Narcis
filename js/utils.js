// Drobné pomocné funkce sdílené více soubory

// Text od uživatele nikdy nevkládáme do HTML "syrový"
export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

// Krátké náhodné ID pro řádky a sloupce
export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Datum ve tvaru 2026-10-26 podle místního času (toISOString by bral UTC)
export const isoDate = (d) => d.toLocaleDateString('sv-SE');

export function today() {
  return isoDate(new Date());
}

// "2026-10-26" -> Date (místní čas)
function parseIso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// "2026-10-26" + 3 -> "2026-10-29"
export function addDays(iso, n) {
  const d = parseIso(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

// Počet dní mezi dvěma daty (Math.round kvůli přechodu na letní čas)
export function daysBetween(fromIso, toIso) {
  return Math.round((parseIso(toIso) - parseIso(fromIso)) / 86400000);
}

// Pondělí týdne, ve kterém je dané datum
export function weekStart(iso = today()) {
  const day = (parseIso(iso).getDay() + 6) % 7; // pondělí = 0
  return addDays(iso, -day);
}

// 0 -> "dnes", 1 -> "včera", 6 -> "před 6 dny"
export function daysAgo(n) {
  if (n === null || n === undefined) return 'ještě nikdy';
  if (n <= 0) return 'dnes';
  if (n === 1) return 'včera';
  return `před ${n} dny`;
}

// "2026-10-26" -> { day: "Dnes" | "Včera" | "Pondělí", date: "26. 10. 2026" }
export function dayLabel(iso) {
  if (!iso) return { day: 'Bez data', date: '' };
  const dt = parseIso(iso);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  let day = dt.toLocaleDateString('cs-CZ', { weekday: 'long' });
  if (iso === today()) day = 'Dnes';
  else if (iso === isoDate(yesterday)) day = 'Včera';
  return { day: day[0].toUpperCase() + day.slice(1), date: `${dt.getDate()}. ${dt.getMonth() + 1}. ${dt.getFullYear()}` };
}

// "2026-10-23" -> "pá 23. 10."
export function shortDate(iso) {
  if (!iso) return 'bez data';
  const dt = parseIso(iso);
  return `${dt.toLocaleDateString('cs-CZ', { weekday: 'short' })} ${dt.getDate()}. ${dt.getMonth() + 1}.`;
}

// 5230.4 -> "5 230"
export function formatKg(n) {
  return Math.round(n).toLocaleString('cs-CZ');
}

// plural(3, 'cvik', 'cviky', 'cviků') -> "cviky"
export function plural(n, one, few, many) {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

// Pro hledání a porovnání: bez diakritiky a velkých písmen ("Šatník" -> "satnik")
export function fold(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
