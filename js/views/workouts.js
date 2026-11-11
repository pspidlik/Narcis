// Tréninky jako ve Stravě: start podle plánu, seznam karet a detail jednoho tréninku.
// Data jsou stejná jako v tabulce – trénink skládá série se stejným datem.
// Plány jsou v table.templates, který plán byl v jaký den v table.workouts.

import { saveTable } from '../db.js';
import { escapeHtml, today, dayLabel, shortDate, formatKg, plural, fold, daysAgo, daysBetween } from '../utils.js';
import { parseEntry, describeQuick } from '../quick-entry.js';
import {
  groupWorkouts, rowsFromQuick, lastTime, exerciseNames, setsSummary, formatSet, setsText,
  toQuickText, workoutPlan, exerciseInfo, shouldAddWeight, partStatus, achievedGoals,
} from '../gym-data.js';

const HELP_HTML = `
  <div class="help">
    <p><code>bench press 80kg 8/8/6</code> 3 série po 80 kg</p>
    <p><code>bench 80 8/8 70 6</code> změna váhy: 2× 80 kg, pak 1× 70 kg</p>
    <p><code>bench r40 10/10 80 8/8/6</code> <b>r</b> = rozcvička: 2× 40 kg rozcvička, pak 3× 80 kg</p>
    <p><code>80x8</code> váha a opakování dohromady</p>
    <p><code>shyby 10/8/6</code> bez váhy</p>
    <p><code>… 8/8/6 lehké</code> slova na konci = poznámka</p>
    <p class="muted">„kg" psát nemusíš. Desetinná čísla s čárkou: 82,5.
      U cviku z plánu píšeš jen čísla, např. <code>80 8/8/6</code></p>
    <p class="help-heading">Mluvený zápis 🎤</p>
    <p><code>bench press 3 série po 8, 60 kilo</code></p>
    <p><code>dřep 100 kilo 5 5 5 poznámka šlo to lehce</code></p>
    <p><code>bench rozcvička 2 série po 10 se 40 kily, pak 3 série po 8 s 80 kily</code></p>
    <p><code>shyby 3 krát 10</code></p>
    <p class="muted">Vždycky řekni, kolik bylo opakování. Před zapsáním zkontroluj náhled –
      diktování se občas splete. Když tlačítko 🎤 nefunguje, klepni do pole a použij
      mikrofon na klávesnici iPhonu.</p>
  </div>`;

// ---------- Společné kousky stránky ----------

function quickHtml(label) {
  return `
    <form class="quick-card" id="quick-form" autocomplete="off">
      <label class="quick-label" for="quick-input">${label}</label>
      <div class="quick">
        <input class="quick-input" id="quick-input" list="exercise-names" placeholder="bench press 80kg 8/8/6"
               enterkeyhint="done" autocapitalize="off" autocorrect="off" spellcheck="false">
        <button class="btn btn-ghost icon mic" type="button" id="mic-btn" aria-label="Nadiktovat">🎤</button>
        <button class="btn btn-ghost icon" type="button" data-action="help" aria-label="Jak psát zápis">?</button>
        <button class="btn" type="submit">Zapsat</button>
      </div>
      <p class="quick-preview muted" id="quick-preview"></p>
      <div class="last-hint" id="last-hint" hidden></div>
      <datalist id="exercise-names"></datalist>
    </form>
    <dialog class="menu" id="help-dialog">
      <div class="menu-body">
        <p class="menu-title">Jak psát zápis</p>${HELP_HTML}
        <button class="menu-item cancel" type="button" data-action="close-dialog">Zavřít</button>
      </div>
    </dialog>
    <div class="toast" id="toast" role="status" hidden></div>`;
}

/**
 * Společná logika stránky: zápis sérií, "Vrátit", ukládání, oznámení dole.
 * targetDate = do kterého dne se zapisuje, redraw() = překresli stránku.
 */
function createPage($root, table, targetDate, redraw) {
  const $toast = $root.querySelector('#toast');
  let toastTimer;

  // Oznámení dole, volitelně s tlačítkem Vrátit
  function toast(text, undo) {
    clearTimeout(toastTimer);
    $toast.innerHTML = `<span>${escapeHtml(text)}</span>${undo ? '<button type="button">Vrátit</button>' : ''}`;
    $toast.hidden = false;
    if (undo) {
      $toast.querySelector('button').onclick = () => {
        undo();
        $toast.hidden = true;
      };
    }
    toastTimer = setTimeout(() => ($toast.hidden = true), 6000);
  }

  function persist() {
    saveTable(table).catch(() => toast('Chyba ukládání!'));
  }

  // Zapíše série z rychlého zápisu do tabulky – jediná cesta, jak se v trénincích zapisuje
  function log(parsed) {
    const goalsBefore = achievedGoals(table, groupWorkouts(table));
    const rows = rowsFromQuick(table, parsed, targetDate);
    table.rows.unshift(...rows);
    persist();
    redraw();

    // Čerstvě splněný cíl = byl splněný po zápisu, ale ne před ním
    const goalsAfter = achievedGoals(table, groupWorkouts(table));
    const fresh = table.goals.filter((g) => goalsAfter.has(g.id) && !goalsBefore.has(g.id));
    const goalText = fresh.map((g) => ` 🎯 Cíl splněn: ${g.exercise} ${g.weight} kg!`).join('');

    toast(`✓ ${describeQuick(parsed)}${goalText}`, () => {
      const ids = new Set(rows.map((r) => r.id));
      table.rows = table.rows.filter((r) => !ids.has(r.id));
      persist();
      redraw();
    });
  }

  return { toast, persist, log };
}

/**
 * Oživí hlavní pole zápisu (název cviku + série).
 * Při psaní ukazuje náhled a co jsi u cviku dělal minule.
 */
function mountQuickEntry($root, table, targetDate, page) {
  const $ = (sel) => $root.querySelector(sel);
  const $form = $('#quick-form');
  const $input = $('#quick-input');
  const $preview = $('#quick-preview');
  const $hint = $('#last-hint');
  const $names = $('#exercise-names');
  let lastText = ''; // zápis z minula pro tlačítko "Stejně"

  function refreshNames() {
    $names.innerHTML = exerciseNames(table, groupWorkouts(table))
      .map((n) => `<option value="${escapeHtml(n)}">`)
      .join('');
  }

  function update() {
    const text = $input.value.trim();
    $preview.classList.remove('error');
    $hint.hidden = true;
    if (!text) {
      $preview.textContent = 'Napiš cvik, váhu a opakování. Nápověda pod „?"';
      return;
    }

    const parsed = parseEntry(text);
    const last = parsed.exercise && lastTime(groupWorkouts(table), parsed.exercise, targetDate);
    if (last) {
      lastText = toQuickText(last.exercise);
      const tip = shouldAddWeight(table, last.exercise) ? ' <b>→ přidej váhu 💡</b>' : '';
      $hint.innerHTML = `
        <span>Minule <b>${shortDate(last.date)}</b>: ${escapeHtml(setsSummary(last.exercise, true))}${tip}</span>
        <button type="button" class="btn btn-ghost small" data-action="use-last">↺ Stejně</button>`;
      $hint.hidden = false;
    }

    if (parsed.error) {
      $preview.textContent = parsed.error;
      $preview.classList.toggle('error', parsed.code !== 'no-sets');
    } else {
      $preview.textContent = describeQuick(parsed);
    }
  }

  $input.addEventListener('input', update);

  $form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const parsed = parseEntry($input.value);
    if (parsed.error) return update();
    page.log(parsed);
    $input.value = '';
    refreshNames();
    update();
  });

  $hint.addEventListener('click', (ev) => {
    if (!ev.target.closest('[data-action="use-last"]')) return;
    $input.value = lastText;
    update();
    $input.focus();
  });

  mountMic($('#mic-btn'), $input, update, page);
  refreshNames();
  update();
}

// 🎤 Diktování přes rozpoznávání řeči v prohlížeči (na iPhonu ho dělá Apple/Siri).
// Text se jen vepíše do pole – zapsání potvrdíš sám, ať vidíš, co appka slyšela.
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const KEYBOARD_TIP = 'Klepni do pole a použij 🎤 na klávesnici iPhonu.';

function mountMic($mic, $input, update, page) {
  let recognition = null;

  const stop = () => {
    recognition = null;
    $mic.classList.remove('listening');
    $mic.setAttribute('aria-label', 'Nadiktovat');
  };

  $mic.addEventListener('click', () => {
    if (recognition) return recognition.stop(); // druhé klepnutí = konec poslechu
    if (!SpeechRecognition) return page.toast(`Diktování tlačítkem tady nejde. ${KEYBOARD_TIP}`);

    recognition = new SpeechRecognition();
    recognition.lang = 'cs-CZ';
    recognition.interimResults = true; // text se objevuje průběžně, jak mluvíš
    const before = $input.value.trim() ? `${$input.value.trim()} ` : '';

    recognition.onresult = (ev) => {
      $input.value = before + [...ev.results].map((r) => r[0].transcript).join('');
      update();
    };
    recognition.onerror = (ev) => {
      if (ev.error === 'no-speech' || ev.error === 'aborted') return;
      page.toast(ev.error === 'not-allowed'
        ? `Appka nemá povolený mikrofon. ${KEYBOARD_TIP}`
        : `Diktování nefunguje. ${KEYBOARD_TIP}`);
    };
    recognition.onend = stop;

    try {
      recognition.start();
      $mic.classList.add('listening');
      $mic.setAttribute('aria-label', 'Zastavit diktování');
    } catch {
      stop();
      page.toast(`Diktování nefunguje. ${KEYBOARD_TIP}`);
    }
  });
}

// Dialogy (nápověda, výběr plánu): zavření tlačítkem nebo klepnutím vedle
function mountDialogs($root) {
  $root.addEventListener('click', (ev) => {
    if (ev.target.tagName === 'DIALOG') return ev.target.close();
    const action = ev.target.closest('[data-action]')?.dataset.action;
    if (action === 'help') $root.querySelector('#help-dialog').showModal();
    if (action === 'close-dialog') ev.target.closest('dialog').close();
  });
}

function statsHtml(w) {
  const n = w.exercises.length;
  return `<div class="stats">
    <div><b>${n}</b><span>${plural(n, 'cvik', 'cviky', 'cviků')}</span></div>
    <div><b>${w.workSets}</b><span>${plural(w.workSets, 'série', 'série', 'sérií')}</span></div>
    <div><b>${formatKg(w.volume)}</b><span>kg objem</span></div>
  </div>`;
}

// ---------- Seznam tréninků ----------

const MAX_ON_CARD = 5;

function cardHtml(table, w, key) {
  const { day, date } = dayLabel(w.date);
  const { name } = workoutPlan(table, w.date);
  // Série bez data nemají detail – otevřou se v tabulce
  const href = w.date ? `#/${key}/${w.date}` : `#/${key}/excel`;
  const items = w.exercises
    .slice(0, MAX_ON_CARD)
    .map((e) => `<li><span class="wc-ex">${escapeHtml(e.name)}</span><span class="muted">${escapeHtml(setsSummary(e))}</span></li>`)
    .join('');
  const more = w.exercises.length > MAX_ON_CARD ? `<li class="muted">+ ${w.exercises.length - MAX_ON_CARD} další</li>` : '';
  const list = w.exercises.length ? `<ul class="wc-list">${items}${more}</ul>` : '<p class="muted">Zatím nic nezapsáno</p>';
  return `<a class="workout-card" href="${href}">
    <div class="wc-head">
      <span class="wc-day">${escapeHtml(name || day)}</span>
      <span class="muted">${name ? `${day} · ${date}` : date}</span>
    </div>
    ${w.exercises.length ? statsHtml(w) : ''}
    ${list}
  </a>`;
}

// "Co dnes? Záda (před 6 dny) · Ramena (před 4 dny)" – odkaz na Přehled
function todayHintHtml(table, key) {
  const status = partStatus(table, groupWorkouts(table));
  if (!status.some((s) => s.last)) return ''; // cviky ještě nemají partie
  // Jen partie, které už máš zapsané – "ještě nikdy" bývá partie, kterou nedáváš
  const top = status
    .filter((s) => !s.paused && s.last)
    .slice(0, 3)
    .map((s) => `<b>${escapeHtml(s.part)}</b> ${daysAgo(s.days)}`)
    .join(' · ');
  return `<a class="today-hint" href="#/${key}/prehled"><span class="muted">Co dnes?</span> ${top} ›</a>`;
}

// Kdy jsi trénink podle plánu dělal naposledy
function planLastDate(table, templateId) {
  const dates = Object.keys(table.workouts).filter((d) => table.workouts[d].templateId === templateId && d <= today());
  return dates.sort().at(-1) || null;
}

export function renderWorkoutList($el, table, key) {
  $el.innerHTML = `
    <section class="plan-start">
      <div class="section-head">
        <span class="quick-label">Začít trénink</span>
        <a class="btn btn-ghost small" href="#/${key}/plany">⚙ Plány a cviky</a>
      </div>
      ${todayHintHtml(table, key)}
      <div class="plan-buttons" id="plan-buttons"></div>
    </section>
    ${quickHtml('Nebo zapiš rovnou do dneška')}
    <div id="workout-list"></div>`;

  const $plans = $el.querySelector('#plan-buttons');
  const $list = $el.querySelector('#workout-list');

  $plans.innerHTML = table.templates.length
    ? table.templates
        .map((t) => {
          const n = t.exercises.length;
          const last = planLastDate(table, t.id);
          const when = last ? ` · ${daysAgo(daysBetween(last, today()))}` : '';
          return `<button class="plan-btn" data-action="start" data-id="${t.id}">
            <b>${escapeHtml(t.name)}</b><span>${n} ${plural(n, 'cvik', 'cviky', 'cviků')}${when}</span>
          </button>`;
        })
        .join('')
    : `<p class="muted">Zatím žádné plány – vytvoř si je v ⚙ Plány.</p>`;

  const draw = () => {
    const workouts = groupWorkouts(table);
    // Dny, kdy jsi začal trénink podle plánu, ale ještě nic nezapsal
    for (const date of Object.keys(table.workouts)) {
      if (!workouts.some((w) => w.date === date)) {
        workouts.push({ date, exercises: [], workSets: 0, warmupSets: 0, volume: 0 });
      }
    }
    workouts.sort((a, b) => (a.date === '') - (b.date === '') || b.date.localeCompare(a.date));

    $list.innerHTML = workouts.length
      ? workouts.map((w) => cardHtml(table, w, key)).join('')
      : `<p class="empty-state">Zatím žádný trénink.<br>Začni podle plánu nahoře, nebo zapiš cvik, třeba <code>bench press 80kg 8/8/6</code></p>`;
  };

  const page = createPage($el, table, today(), draw);
  mountQuickEntry($el, table, today(), page);
  mountDialogs($el);

  // Start tréninku podle plánu: dnešek dostane plán a otevře se detail
  $plans.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-action="start"]');
    if (!btn) return;
    const template = table.templates.find((t) => t.id === btn.dataset.id);
    table.workouts[today()] = { templateId: template.id, name: template.name };
    saveTable(table).then(() => (location.hash = `#/${key}/${today()}`));
  });

  draw();
}

// ---------- Detail tréninku ----------

// Cvik v detailu: partie, série, srovnání s minule, tip "přidej váhu" a pole pro zápis jen čísel
function exerciseHtml(table, key, ex, prev) {
  let n = 0;
  const rows = ex.sets
    .map((s) => {
      const label = s.warmup ? 'R' : ++n;
      const cls = s.warmup ? 'warmup' : s === ex.best ? 'best' : '';
      return `<tr class="${cls}"><td>${label}</td><td>${escapeHtml(s.weight || '–')}</td><td>${escapeHtml(s.reps)}</td></tr>`;
    })
    .join('');
  const done = ex.sets.length > 0;
  const summary = done
    ? `${formatKg(ex.volume)} kg${ex.best ? ` · nejlepší ${escapeHtml(formatSet(ex.best))}` : ''}`
    : 'zatím nezapsáno';
  const sets = done
    ? `<table class="sets">
        <thead><tr><th>Série</th><th>kg</th><th>Opak.</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`
    : '';
  const notes = ex.sets.filter((s) => s.note).map((s) => `<p class="ex-note">${escapeHtml(s.note)}</p>`).join('');
  const prevHtml = prev
    ? `<p class="ex-prev">Minule ${shortDate(prev.date)}: ${escapeHtml(setsSummary(prev.exercise, true))}</p>`
    : '';
  const name = escapeHtml(ex.name);

  // Partie u cviku, nebo odkaz, kde ji nastavit
  const info = exerciseInfo(table, ex.name);
  const part = info.part
    ? `<span class="part-chip">${escapeHtml(info.part)}</span>`
    : `<a class="part-chip empty" href="#/${key}/plany">+ partie</a>`;

  // Tip "přidej váhu": dnes (když je hotovo), jinak podle minula
  const { max } = info;
  let tip = '';
  if (done && shouldAddWeight(table, ex)) tip = `Všechny série na ${max} – příště přidej váhu`;
  else if (!done && prev && shouldAddWeight(table, prev.exercise)) tip = `Minule všechny série na ${max} – dnes přidej váhu`;
  const tipHtml = tip ? `<p class="ex-tip">💡 ${tip}</p>` : '';

  return `<section class="ex-card${done ? '' : ' pending'}">
    <div class="ex-head"><h3>${name} ${part}</h3><span class="muted">${summary}</span></div>
    ${sets}${notes}${prevHtml}${tipHtml}
    <form class="ex-quick" data-exercise="${name}" autocomplete="off">
      <input class="quick-input" name="sets" placeholder="${prev ? escapeHtml(setsText(prev.exercise)) : '80 8/8/6'}"
             enterkeyhint="done" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Série – ${name}">
      ${prev ? `<button class="btn btn-ghost small" type="button" data-action="same" data-exercise="${name}">↺ Stejně</button>` : ''}
      <button class="btn icon" type="submit" aria-label="Zapsat ${name}">+</button>
    </form>
  </section>`;
}

export function renderWorkoutDetail($el, table, key, date) {
  const { day, date: dateText } = dayLabel(date);
  $el.innerHTML = `
    <div class="detail-top">
      <a class="back" href="#/${key}">‹ Tréninky</a>
      <a class="btn btn-ghost small" href="#/${key}/excel/${date}">Upravit v tabulce</a>
    </div>
    <div class="detail-head">
      <div>
        <h2 class="detail-title" id="detail-title"></h2>
        <p class="muted" id="detail-sub"></p>
      </div>
      <button class="btn btn-ghost small" type="button" data-action="plan-menu">Plán ▾</button>
    </div>
    <div id="detail-stats"></div>
    <div id="detail-list"></div>
    ${quickHtml('Přidat jiný cvik')}
    <dialog class="menu" id="plan-dialog"></dialog>`;

  const $ = (sel) => $el.querySelector(sel);
  const $title = $('#detail-title');
  const $sub = $('#detail-sub');
  const $stats = $('#detail-stats');
  const $list = $('#detail-list');
  const $planDialog = $('#plan-dialog');

  // Cviky v pořadí: nejdřív z plánu (i nezapsané), pak ostatní zapsané
  function exercisesToShow(workouts, template) {
    const w = workouts.find((x) => x.date === date);
    const logged = w ? w.exercises : [];
    const planned = (template ? template.exercises : []).map(
      (name) => logged.find((e) => fold(e.name) === fold(name)) || { name, sets: [], work: [], volume: 0, best: null }
    );
    return [...new Set([...planned, ...logged])];
  }

  const draw = () => {
    const workouts = groupWorkouts(table);
    const w = workouts.find((x) => x.date === date);
    const { name, template } = workoutPlan(table, date);

    $title.textContent = name || day;
    $sub.textContent = name ? `${day} · ${dateText}` : dateText;

    $stats.innerHTML = w
      ? statsHtml(w) +
        (w.warmupSets
          ? `<p class="muted detail-warm">+ ${w.warmupSets} ${plural(w.warmupSets, 'rozcvičková série', 'rozcvičkové série', 'rozcvičkových sérií')}</p>`
          : '')
      : '';

    const items = exercisesToShow(workouts, template);
    $list.innerHTML = items.length
      ? items.map((ex) => exerciseHtml(table, key, ex, lastTime(workouts, ex.name, date))).join('')
      : template
        ? `<p class="empty-state">Plán „${escapeHtml(template.name)}" zatím nemá cviky.<br><a href="#/${key}/plany">Přidej je v ⚙ Plány</a></p>`
        : `<p class="empty-state">Vyber plán (Plán ▾), nebo zapiš cvik dole.</p>`;
  };

  const page = createPage($el, table, date, draw);
  mountQuickEntry($el, table, date, page);
  mountDialogs($el);

  // Pole u cviku: píšeš jen série, název je daný ("80 8/8/6")
  $el.addEventListener('submit', (ev) => {
    const $form = ev.target.closest('.ex-quick');
    if (!$form) return;
    ev.preventDefault();
    const $input = $form.elements.sets;
    const parsed = parseEntry(`x ${$input.value}`); // "x" = dočasný název, hned ho přepíšeme
    if (parsed.error) {
      $input.classList.add('error');
      return page.toast(parsed.code === 'no-sets' ? 'Napiš váhu a opakování, např. 80 8/8/6' : parsed.error);
    }
    parsed.exercise = $form.dataset.exercise;
    page.log(parsed);
  });

  $el.addEventListener('input', (ev) => ev.target.classList.remove('error'));

  $el.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    // ↺ Stejně u cviku: zapíše jedním klepnutím to samé co minule
    if (action === 'same') {
      const name = btn.dataset.exercise;
      const prev = lastTime(groupWorkouts(table), name, date);
      if (!prev) return;
      const parsed = parseEntry(`x ${setsText(prev.exercise)}`);
      parsed.exercise = name;
      page.log(parsed);
    }

    if (action === 'plan-menu') {
      const current = table.workouts[date]?.templateId;
      $planDialog.innerHTML = `<div class="menu-body">
        <p class="menu-title">Plán tréninku</p>
        ${table.templates
          .map((t) => `<button class="menu-item${t.id === current ? ' active' : ''}" type="button" data-action="set-plan" data-id="${t.id}">${escapeHtml(t.name)}</button>`)
          .join('')}
        <button class="menu-item${current ? '' : ' active'}" type="button" data-action="set-plan" data-id="">Bez plánu</button>
        <a class="menu-item" href="#/${key}/plany">⚙ Upravit plány</a>
        <button class="menu-item cancel" type="button" data-action="close-dialog">Zavřít</button>
      </div>`;
      $planDialog.showModal();
    }

    if (action === 'set-plan') {
      const template = table.templates.find((t) => t.id === btn.dataset.id);
      if (template) table.workouts[date] = { templateId: template.id, name: template.name };
      else delete table.workouts[date];
      $planDialog.close();
      page.persist();
      draw();
    }
  });

  draw();
}
