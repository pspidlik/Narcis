// Rychlý zápis tréninku: z jednoho řádku textu udělá seznam sérií.
//
//   bench press 80kg 8/8/6     3 série po 80 kg (kg jde vynechat: 80 8/8/6)
//   bench 80 8/8 70 6          změna váhy – nová váha platí pro další opakování
//   bench r40 10/10 80 8/8/6   r před váhou = rozcvičovací série (jde i "r 40")
//   80x8                       váha a opakování dohromady (i 80x8/8)
//   shyby 10/8/6               bez váhy
//   … 8/8/6 lehké              slova na konci = poznámka

import { looksSpoken, parseSpoken } from './spoken-entry.js';

// Hlavní vstup: mluvenou větu ("3 série po 8, 60 kilo") pošle do spoken-entry.js,
// zkratku ("80 8/8/6") zpracuje parseQuick. Výsledek mají oba stejný.
export function parseEntry(text) {
  return looksSpoken(text) ? parseSpoken(text) : parseQuick(text);
}

const NUM = String.raw`\d+(?:[.,]\d+)?`;
const RE_COMBINED = new RegExp(`^(r)?(${NUM})(?:kg)?[x×*](\\d+(?:/\\d+)*)$`, 'i'); // 80x8, r40x10/10
const RE_WEIGHT = new RegExp(`^(r)?(${NUM})(kg)?$`, 'i'); // 80, 80kg, r40
const RE_REPS = /^\d+(?:\/\d+)+$/; // 8/8/6

const startsWithNumber = (t = '') => /^r?\d/i.test(t);

// 82.5 -> "82,5" (v tabulce píšeme česky s čárkou)
const formatNumber = (n) => n.replace('.', ',');

/**
 * Vrátí { exercise, sets: [{ weight, reps, warmup }], note }
 * nebo { error } s vysvětlením, co chybí.
 */
export function parseQuick(text) {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  let i = 0;

  // 1) Název cviku = slova až do prvního čísla (nebo "r" před číslem)
  const name = [];
  while (i < tokens.length) {
    const t = tokens[i];
    if (startsWithNumber(t)) break;
    if (t.toLowerCase() === 'r' && startsWithNumber(tokens[i + 1])) break;
    name.push(t);
    i++;
  }

  // 2) Váhy a opakování
  const sets = [];
  const note = [];
  let weight = '';        // aktuální váha
  let warmNext = false;   // bylo samotné "r" – další váha je rozcvička
  let warmup = false;     // aktuální váha je rozcvička
  let expectReps = false; // právě padla váha – další číslo jsou opakování

  const setWeight = (value, rPrefix) => {
    weight = formatNumber(value);
    warmup = warmNext || rPrefix;
    warmNext = false;
    expectReps = true;
  };
  const addReps = (list) => {
    for (const reps of list.split('/')) sets.push({ weight, reps, warmup });
    expectReps = false;
  };

  for (; i < tokens.length; i++) {
    const t = tokens[i];
    const lower = t.toLowerCase();
    let m;

    if (note.length) note.push(t);                // jakmile začne poznámka, zbytek je poznámka
    else if (lower === 'kg') continue;            // "80 kg" s mezerou
    else if (lower === 'r') warmNext = true;
    else if ((m = t.match(RE_COMBINED))) {
      setWeight(m[2], !!m[1]);
      addReps(m[3]);
    } else if (RE_REPS.test(t)) {
      addReps(t);
    } else if ((m = t.match(RE_WEIGHT))) {
      // Samotné číslo: hned za váhou = opakování; jinak když za ním
      // následuje další číslo, je to nová váha, a na konci opakování
      const next = (tokens[i + 1] || '').toLowerCase();
      const isWeight = m[1] || m[3] || next === 'kg' || (!expectReps && startsWithNumber(next));
      if (isWeight) setWeight(m[2], !!m[1]);
      else addReps(m[2]);
    } else {
      note.push(t);
    }
  }

  if (!name.length) return { error: 'Začni názvem cviku, např. „bench press 80kg 8/8/6"', code: 'no-name' };

  const joined = name.join(' ');
  const exercise = joined[0].toUpperCase() + joined.slice(1);
  // Název už známe – hodí se i bez opakování (nápověda "minule")
  if (!sets.length) return { error: 'Doplň váhu a opakování, např. „80 8/8/6"', code: 'no-sets', exercise };

  return { exercise, sets, note: note.join(' ') };
}

// 1–4 série, 5+ sérií
const seriesWord = (n) => (n <= 4 ? 'série' : 'sérií');

// Lidský popis výsledku pro náhled pod polem rychlého zápisu
export function describeQuick(parsed) {
  const list = parsed.sets
    .map((s) => (s.weight ? `${s.weight}×${s.reps}` : `${s.reps} op.`) + (s.warmup ? ' (R)' : ''))
    .join(', ');
  const note = parsed.note ? ` · pozn.: ${parsed.note}` : '';
  return `${parsed.exercise} · ${parsed.sets.length} ${seriesWord(parsed.sets.length)}: ${list}${note}`;
}
