// Mluvený zápis: normální česká věta (z diktování) -> stejný výsledek jako parseQuick.
//
//   bench press 3 série po 8 opakováních 60 kilo        3× 60×8
//   dřep 100 kilo 5 5 5 poznámka šlo to lehce           3× 100×5 + poznámka
//   bench rozcvička 2 série po 10 se 40 kily,
//         pak 3 série po 8 s 80 kily                    2× 40×10 (R), 3× 80×8
//   shyby 3 krát 10                                     3× 10 op.
//   sedmdesát dva a půl kila                            72,5 kg
//
// Postup: rozsekat na slova -> čísla slovy převést na čísla -> název cviku
// -> skupiny sérií (každá: rozcvička?, váha, počet sérií, opakování) -> série.

const NUMBER_WORDS = {
  nula: 0, jedna: 1, jeden: 1, jedno: 1, jednu: 1, dva: 2, dvě: 2, dvou: 2, tři: 3, tří: 3,
  čtyři: 4, čtyř: 4, pět: 5, šest: 6, sedm: 7, osm: 8, devět: 9, deset: 10,
  jedenáct: 11, dvanáct: 12, třináct: 13, čtrnáct: 14, patnáct: 15, šestnáct: 16,
  sedmnáct: 17, osmnáct: 18, devatenáct: 19, dvacet: 20, třicet: 30, čtyřicet: 40,
  padesát: 50, šedesát: 60, sedmdesát: 70, osmdesát: 80, devadesát: 90, sto: 100,
  // ohnuté tvary: "po osmi", "se třemi", "po deseti"
  jednom: 1, jedné: 1, dvěma: 2, třech: 3, třemi: 3, čtyřech: 4, čtyřmi: 4, pěti: 5, šesti: 6,
  sedmi: 7, osmi: 8, devíti: 9, deseti: 10, jedenácti: 11, dvanácti: 12, třinácti: 13,
  čtrnácti: 14, patnácti: 15, šestnácti: 16, sedmnácti: 17, osmnácti: 18, devatenácti: 19,
  dvaceti: 20, třiceti: 30, čtyřiceti: 40, padesáti: 50, šedesáti: 60, sedmdesáti: 70,
  osmdesáti: 80, devadesáti: 90, stech: 100,
};
const HUNDREDS = ['stě', 'sta', 'set']; // "dvě stě", "tři sta", "pět set"

const RE_KG = /^(kg|kil|kilo|kila|kily|kilech|kilama|kilogram\w*)$/;
const RE_SETS = /^s[eé]ri/;        // série, sérií, sérii
const RE_TIMES = /^(krát|krat|x|×)$/;
const RE_REPS = /^opak/;           // opakování, opakováních
const RE_WARM = /^rozcvi[cč]/;     // rozcvička, rozcvičkové
const RE_WORK = /^pracovn/;        // pracovní, pracovních
const RE_NOTE = /^pozn[aá]m/;      // poznámka
const RE_SEP = /^(a|pak|potom|následně|,|;)$/;
const RE_DECIMAL = /^(celá|cela|celé|celých|čárka|carka)$/;

// Slova, podle kterých poznáme mluvenou větu (oproti zkratce "80 8/8/6")
const RE_SPOKEN = /(^|\s)(s[eé]ri\S*|opak\S*|kil\S*|kg|kr[aá]t|rozcvi\S*|pracovn\S*|pozn[aá]m\S*|po|se?|pak)(\s|$)/;

const formatNumber = (n) => String(Math.round(n * 100) / 100).replace('.', ',');

export function looksSpoken(text) {
  const t = text.toLowerCase();
  if (t.includes('/')) return false; // "8/8/6" je vždycky zkratka
  if (RE_SPOKEN.test(t)) return true;
  return t.split(/\s+/).some((w) => w in NUMBER_WORDS);
}

// Text -> slova. raw = původní podoba (pro název a poznámku), w = malými písmeny
function tokenize(text) {
  return text
    .replace(/(\d),(\d)/g, '$1.$2')           // 82,5 -> 82.5
    .replace(/(\d)([^\d\s.,])/g, '$1 $2')     // 60kg -> 60 kg, 3krát -> 3 krát
    .replace(/([^\d\s.,])(\d)/g, '$1 $2')     // x8 -> x 8
    .replace(/[,;]/g, ' $& ')                 // čárka = oddělovač skupin
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => ({ raw, w: raw.toLowerCase().replace(/[.!?:]+$/, '') }))
    .filter((t) => t.w);
}

// Čísla slovy -> čísla. Složená jen ze slov: "sto dvacet pět" = 125,
// ale "60 8" z diktování zůstanou dvě čísla. "a půl" = +0,5, "82 celá 5" = 82,5
function readNumbers(tokens) {
  const out = [];
  const wordValue = (t) => (t ? NUMBER_WORDS[t.w] : undefined);
  const anyValue = (t) => (t && /^\d+(\.\d+)?$/.test(t.w) ? parseFloat(t.w) : wordValue(t));

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    let value = anyValue(t);
    if (value === undefined) {
      out.push(t);
      continue;
    }
    let isWord = wordValue(t) !== undefined;
    let raw = t.raw;

    for (;;) {
      const next = tokens[i + 1];
      if (!next) break;
      const nextWord = wordValue(next);
      if (isWord && HUNDREDS.includes(next.w) && value < 10) {
        value *= 100;
      } else if (
        isWord && nextWord !== undefined &&
        ((value >= 20 && value % 10 === 0 && nextWord < 10) || (value >= 100 && value % 100 === 0 && nextWord < 100))
      ) {
        value += nextWord;
      } else if (next.w === 'a' && tokens[i + 2]?.w === 'půl') {
        value += 0.5;
        raw += ' a';
        i++;
      } else if (RE_DECIMAL.test(next.w) && anyValue(tokens[i + 2]) !== undefined) {
        const d = anyValue(tokens[i + 2]);
        value += d / 10 ** String(d).length;
        raw += ` ${next.raw}`;
        i++;
      } else {
        break;
      }
      raw += ` ${tokens[i + 1].raw}`;
      i++;
      isWord = true;
    }
    out.push({ raw, w: String(value), num: value });
  }
  return out;
}

const isNum = (t) => t !== undefined && t.num !== undefined;

const newGroup = (carry = {}) => ({
  warmup: carry.warmup ?? false,
  weight: carry.weight ?? null,
  sets: carry.sets ?? null,
  reps: [],
  pending: [], // čísla, u kterých ještě nevíme, co jsou
});

// Skupina -> série
function resolve(g) {
  let weight = g.weight;
  let reps = [...g.reps];
  const pending = [...g.pending];
  if (!reps.length) {
    // "100 5 5 5" bez jednotek: první číslo váha, zbytek opakování
    if (weight === null && pending.length >= 2) weight = pending.shift();
    reps = pending;
  } else if (weight === null && pending.length) {
    // "3 série po 8 opakováních 60" – zbylé číslo je váha
    weight = pending[0];
  }
  if (reps.length === 1 && g.sets) reps = Array(g.sets).fill(reps[0]);
  return reps.map((r) => ({
    weight: weight === null ? '' : formatNumber(weight),
    reps: formatNumber(r),
    warmup: g.warmup,
  }));
}

/**
 * Vrátí { exercise, sets: [{ weight, reps, warmup }], note }
 * nebo { error, code, exercise? } – stejně jako parseQuick.
 */
export function parseSpoken(text) {
  const tokens = readNumbers(tokenize(text));
  let i = 0;

  // 1) Název cviku = slova do prvního čísla nebo klíčového slova.
  //    "s"/"se"/"po" ukončí název jen před číslem ("tlaky s jednoručkami" zůstane celé)
  const name = [];
  for (; i < tokens.length; i++) {
    const t = tokens[i];
    if (isNum(t) || RE_WARM.test(t.w) || RE_WORK.test(t.w) || RE_NOTE.test(t.w) || RE_SETS.test(t.w)) break;
    if (/^(s|se|po)$/.test(t.w) && isNum(tokens[i + 1])) break;
    if (t.w === ',' || t.w === ';') continue;
    name.push(t.raw);
  }

  // 2) Skupiny sérií
  const sets = [];
  let note = [];
  let g = newGroup();
  const hasReps = (x) => x.reps.length > 0 || x.pending.length > 0;

  let lastSets = []; // série z poslední uzavřené skupiny

  // Uzavře skupinu. Skupina bez opakování buď doplní váhu předchozím sériím
  // ("3 série po 8, 60 kilo"), nebo ji předá dál ("80 kilo, 8 8 6").
  const close = () => {
    if (hasReps(g)) {
      lastSets = resolve(g);
      sets.push(...lastSets);
      g = newGroup();
    } else if (g.weight !== null && lastSets.length && lastSets.every((s) => s.weight === '')) {
      for (const s of lastSets) s.weight = formatNumber(g.weight);
      g = newGroup();
    } else {
      g = newGroup({ weight: g.weight, sets: g.sets, warmup: g.warmup });
    }
  };

  for (; i < tokens.length; i++) {
    const t = tokens[i];
    const prev = tokens[i - 1];
    const next = tokens[i + 1]?.w ?? '';

    if (RE_NOTE.test(t.w)) {
      note = tokens.slice(i + 1).map((x) => x.raw);
      break;
    }
    if (RE_SEP.test(t.w)) {
      close();
      continue;
    }

    if (RE_WARM.test(t.w) || RE_WORK.test(t.w)) {
      const warmup = RE_WARM.test(t.w);
      if (isNum(prev) && g.pending.at(-1) === prev.num) {
        // "3 pracovní série", "2 rozcvičkové opakování" – přídavné jméno k číslu
        g.warmup = warmup;
        if (RE_SETS.test(next)) { g.sets = g.pending.pop(); i++; }
        else if (RE_REPS.test(next)) { g.reps.push(g.pending.pop()); i++; }
      } else {
        if (hasReps(g)) close();
        g.warmup = warmup;
      }
      continue;
    }

    if (!isNum(t)) continue; // výplňová slova ("jsem", "dal", "série" bez čísla…)

    const n = t.num;
    const before = prev?.w ?? '';
    if (RE_KG.test(next)) { g.weight = n; i++; }                          // 60 kilo
    else if (RE_SETS.test(next) || RE_TIMES.test(next)) { g.sets = n; i++; } // 3 série, 3 krát
    else if (RE_REPS.test(next)) { g.reps.push(...g.pending, n); g.pending = []; i++; } // 8 8 6 opakování
    else if (/^(s|se)$/.test(before)) g.weight = n;                         // s 80, se 40
    else if (RE_TIMES.test(before)) g.reps.push(n);                        // 3 krát 10
    else if (before === 'po' && g.sets !== null && !g.reps.length) g.reps.push(n); // 3 série po 8
    else g.pending.push(n);
  }
  close();

  if (!name.length) return { error: 'Začni názvem cviku, např. „bench press 3 série po 8, 60 kilo"', code: 'no-name' };
  const joined = name.join(' ');
  const exercise = joined[0].toUpperCase() + joined.slice(1);
  if (!sets.length) {
    return { error: 'Kolik opakování? Řekni třeba „3 série po 8, 60 kilo"', code: 'no-sets', exercise };
  }
  return { exercise, sets, note: note.join(' ') };
}
