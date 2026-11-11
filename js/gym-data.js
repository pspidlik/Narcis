// Data gymu: jedna tabulka sérií (řádek = série) a funkce, které z ní skládají tréninky.
// Trénink = všechny série se stejným datem.
//
// Tabulka v IndexedDB:
//   { id, columns: [{ id, name, type, role?, options? }],
//     rows: [{ id, t, cells: { [idSloupce]: hodnota } }],
//     templates: [{ id, name, exercises: ['Bench press', …] }],   plány tréninků
//     workouts: { '2026-10-26': { templateId, name } } }            který plán byl v jaký den
// t = čas vzniku řádku – podle něj se řadí série v tréninku.

import { getTable } from './db.js';
import { newId, today, fold } from './utils.js';

export const WORK = 'Pracovní';
export const WARMUP = 'Rozcvička';

// type: 'date' | 'number' | 'text' | 'choice' (výběr z možností)
// role: co ve sloupci je – zůstává, i když sloupec přejmenuješ nebo přesuneš
export const DEFAULT_COLUMNS = [
  { name: 'Datum', type: 'date', role: 'date' },
  { name: 'Cvik', type: 'text', role: 'exercise' },
  { name: 'Typ', type: 'choice', role: 'kind', options: [WORK, WARMUP] },
  { name: 'Váha (kg)', type: 'number', role: 'weight' },
  { name: 'Opak.', type: 'number', role: 'reps' },
  { name: 'Poznámka', type: 'text', role: 'note' },
];

function emptyTable(id) {
  return {
    id,
    columns: DEFAULT_COLUMNS.map((c) => ({ id: newId(), ...c, options: c.options && [...c.options] })),
    rows: [],
  };
}

// Výchozí plány – název i cviky jdou změnit v ⚙ Plány
const DEFAULT_TEMPLATES = ['Prsa + biceps', 'Záda + triceps', 'Ramena + nohy'];

// Načte tabulku z databáze, nebo vytvoří novou prázdnou
export async function loadTable(key) {
  const table = (await getTable(key)) || emptyTable(key);
  // Starší uložené tabulky ještě nemají plány a názvy tréninků
  table.templates ??= DEFAULT_TEMPLATES.map((name) => ({ id: newId(), name, exercises: [] }));
  table.workouts ??= {};
  return table;
}

// Plán a název tréninku v daný den -> { name, template } (bez plánu: name = '')
export function workoutPlan(table, date) {
  const meta = table.workouts[date];
  if (!meta) return { name: '', template: null };
  const template = table.templates.find((t) => t.id === meta.templateId) || null;
  // Smazaný plán: zůstane aspoň název, jaký měl
  return { name: template ? template.name : meta.name || '', template };
}

export const colByRole = (table, role) => table.columns.find((c) => c.role === role);

// Nový řádek – datum dostane zadaný den (jinak dnešek), typ série "Pracovní"
export function newRow(table, date = today()) {
  const cells = {};
  for (const col of table.columns) {
    if (col.type === 'date') cells[col.id] = date;
    if (col.role === 'kind') cells[col.id] = WORK;
  }
  return { id: newId(), t: Date.now(), cells };
}

// Z výsledku rychlého zápisu (parseQuick) udělá řádky tabulky
export function rowsFromQuick(table, parsed, date) {
  const now = Date.now();
  return parsed.sets.map((set, i) => {
    const row = newRow(table, date);
    row.t = now + i; // série v pořadí, jak jsi je cvičil
    const put = (role, value) => {
      const col = colByRole(table, role);
      if (col && value !== '') row.cells[col.id] = value;
    };
    put('exercise', parsed.exercise);
    put('kind', set.warmup ? WARMUP : WORK);
    put('weight', set.weight);
    put('reps', set.reps);
    if (i === 0) put('note', parsed.note);
    return row;
  });
}

// "82,5" -> 82.5, prázdné -> 0
const toNumber = (s) => parseFloat(String(s).replace(',', '.')) || 0;

// Statistiky jednoho cviku: pracovní série, objem (váha × opakování), nejlepší série
function exerciseStats(ex) {
  const work = ex.sets.filter((s) => !s.warmup);
  const volume = work.reduce((sum, s) => sum + toNumber(s.weight) * toNumber(s.reps), 0);
  const isBetter = (a, b) =>
    toNumber(a.weight) > toNumber(b.weight) ||
    (toNumber(a.weight) === toNumber(b.weight) && toNumber(a.reps) > toNumber(b.reps));
  const best = work.reduce((b, s) => (!b || isBetter(s, b) ? s : b), null);
  return { ...ex, work, volume, best };
}

/**
 * Seskupí řádky do tréninků, nejnovější první:
 * [{ date, exercises: [{ name, sets, work, volume, best }], workSets, warmupSets, volume }]
 */
export function groupWorkouts(table) {
  const col = Object.fromEntries(
    ['date', 'exercise', 'kind', 'weight', 'reps', 'note'].map((r) => [r, colByRole(table, r)])
  );
  const get = (row, role) => (col[role] ? String(row.cells[col[role].id] ?? '').trim() : '');

  const sets = table.rows
    .map((row, i) => ({
      rowId: row.id,
      t: row.t ?? -i, // starší řádky bez času: níž v tabulce = starší
      date: get(row, 'date'),
      exercise: get(row, 'exercise'),
      warmup: get(row, 'kind') === WARMUP,
      weight: get(row, 'weight'),
      reps: get(row, 'reps'),
      note: get(row, 'note'),
    }))
    .filter((s) => s.exercise || s.reps || s.weight) // prázdné řádky přeskoč
    .sort((a, b) => a.t - b.t);

  // datum -> (cvik -> série)
  const byDate = new Map();
  for (const s of sets) {
    if (!byDate.has(s.date)) byDate.set(s.date, new Map());
    const exercises = byDate.get(s.date);
    const name = s.exercise || 'Bez názvu';
    const key = fold(name);
    if (!exercises.has(key)) exercises.set(key, { name, sets: [] });
    exercises.get(key).sets.push(s);
  }

  return [...byDate]
    .map(([date, map]) => {
      const exercises = [...map.values()].map(exerciseStats);
      return {
        date,
        exercises,
        workSets: exercises.reduce((n, e) => n + e.work.length, 0),
        warmupSets: exercises.reduce((n, e) => n + e.sets.length - e.work.length, 0),
        volume: exercises.reduce((n, e) => n + e.volume, 0),
      };
    })
    .sort((a, b) => (a.date === '') - (b.date === '') || b.date.localeCompare(a.date));
}

// Poslední trénink před daným dnem, kde byl tenhle cvik -> { date, exercise } nebo null
export function lastTime(workouts, name, beforeDate) {
  const key = fold(name.trim());
  for (const w of workouts) {
    if (!w.date || w.date >= beforeDate) continue;
    const exercise = w.exercises.find((e) => fold(e.name) === key);
    if (exercise) return { date: w.date, exercise };
  }
  return null;
}

// Všechny názvy cviků ze zápisů (od nejnovějších) i z plánů – pro napovídání
export function exerciseNames(table, workouts) {
  const seen = new Map();
  const add = (name) => !seen.has(fold(name)) && seen.set(fold(name), name);
  for (const w of workouts) for (const e of w.exercises) add(e.name);
  for (const t of table.templates) for (const name of t.exercises) add(name);
  return [...seen.values()];
}

// 80×8, nebo "10 op." u cviku bez váhy
export const formatSet = (s) => (s.weight ? `${s.weight}×${s.reps}` : `${s.reps} op.`);

// "80×8 · 80×8 · 70×6" – jen pracovní série (rozcvičky s withWarmups jako "R 40×10")
export function setsSummary(ex, withWarmups = false) {
  const list = withWarmups ? ex.sets : ex.work.length ? ex.work : ex.sets;
  return list.map((s) => (s.warmup ? 'R ' : '') + formatSet(s)).join(' · ');
}

// Série zpátky na rychlý zápis bez názvu: "r40 10/10 80 8/8 70 6"
export function setsText(ex) {
  const groups = [];
  for (const s of ex.sets) {
    const last = groups[groups.length - 1];
    if (last && last.weight === s.weight && last.warmup === s.warmup) last.reps.push(s.reps);
    else groups.push({ weight: s.weight, warmup: s.warmup, reps: [s.reps] });
  }
  return groups.map((g) => (g.weight ? `${g.warmup ? 'r' : ''}${g.weight} ` : '') + g.reps.join('/')).join(' ');
}

// Celý cvik na rychlý zápis: "Bench press r40 10/10 80 8/8 70 6"
export const toQuickText = (ex) => `${ex.name} ${setsText(ex)}`;
