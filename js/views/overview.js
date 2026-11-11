// Přehled gymu: Co dnes? (dny od partie, pauzy), tento týden po partiích, cíle.
// Všechno se počítá z těch samých sérií jako tréninky a tabulka.

import { saveTable } from '../db.js';
import { escapeHtml, newId, today, shortDate, formatKg, plural, daysAgo, weekStart, addDays } from '../utils.js';
import { groupWorkouts, partStatus, weekByPart, goalProgress, exerciseNames } from '../gym-data.js';

// ---------- Co dnes? ----------

function todayHtml(table, workouts, key) {
  const status = partStatus(table, workouts);
  const anyPart = status.some((s) => s.last);
  const rows = status
    .map((s) => {
      const part = escapeHtml(s.part);
      if (s.paused) {
        const note = s.paused.note ? ` · ${escapeHtml(s.paused.note)}` : '';
        return `<li class="part-row paused">
          <span class="part-name">⏸ ${part}</span>
          <span class="part-days">pauza od ${shortDate(s.paused.since)}${note}</span>
          <button class="btn btn-ghost small" type="button" data-action="resume" data-part="${part}">Obnovit</button>
        </li>`;
      }
      return `<li class="part-row">
        <span class="part-name">${part}</span>
        <span class="part-days">${daysAgo(s.days)}</span>
        <button class="btn btn-ghost small" type="button" data-action="pause" data-part="${part}" aria-label="Pauza – ${part}">⏸</button>
      </li>`;
    })
    .join('');
  const hint = anyPart
    ? '<p class="muted block-sub">Nejdéle netrénované partie jsou nahoře.</p>'
    : `<p class="muted block-sub">Přiřaď cvikům partie v <a href="#/${key}/plany">⚙ Plány a cviky</a> – pak tu uvidíš, kterou partii jsi dlouho nedal.</p>`;
  return `<section class="block">
    <h3>Co dnes?</h3>${hint}
    <ul class="part-list">${rows}</ul>
  </section>`;
}

// ---------- Tento týden ----------

function weekHtml(table, workouts) {
  const start = weekStart();
  const now = weekByPart(table, workouts, start);
  const prev = weekByPart(table, workouts, addDays(start, -7));
  const maxSets = Math.max(1, ...now.parts.map((p) => p.sets));

  // Rozdíl objemu proti minulému týdnu
  let diff = '';
  // Na začátku týdne (zatím nic) nemá srovnání smysl – jen by strašilo "↓ 100 %"
  if (prev.volume > 0 && now.volume > 0) {
    const pct = Math.round(((now.volume - prev.volume) / prev.volume) * 100);
    diff = `<span class="${pct >= 0 ? 'up' : 'down'}">${pct >= 0 ? '↑' : '↓'} ${Math.abs(pct)} % proti minulému týdnu</span>`;
  }

  const bars = now.parts.length
    ? now.parts
        .map(
          (p) => `<li class="bar-row">
            <span class="bar-label">${escapeHtml(p.part)}</span>
            <span class="bar"><span style="width:${(p.sets / maxSets) * 100}%"></span></span>
            <span class="bar-value">${p.sets} ${plural(p.sets, 'série', 'série', 'sérií')} · ${formatKg(p.volume)} kg</span>
          </li>`
        )
        .join('')
    : '<li class="muted">Tento týden zatím nic.</li>';

  return `<section class="block">
    <h3>Tento týden <span class="muted">od ${shortDate(start)}</span></h3>
    <div class="stats">
      <div><b>${now.days}</b><span>${plural(now.days, 'trénink', 'tréninky', 'tréninků')}</span></div>
      <div><b>${now.sets}</b><span>${plural(now.sets, 'série', 'série', 'sérií')}</span></div>
      <div><b>${formatKg(now.volume)}</b><span>kg objem</span></div>
    </div>
    <p class="muted block-sub">${diff || `Minulý týden: ${formatKg(prev.volume)} kg`}</p>
    <ul class="bars">${bars}</ul>
  </section>`;
}

// ---------- Cíle ----------

function goalsHtml(table, workouts) {
  const items = table.goals
    .map((g) => {
      const p = goalProgress(workouts, g);
      const reps = g.reps > 1 ? ` × ${g.reps}` : '';
      const state = p.achieved
        ? `<span class="up">🎯 Splněno ${p.achieved === 'bez data' ? '' : shortDate(p.achieved)}</span>`
        : `<span class="muted">zatím ${p.best ? `${formatKg(p.best)} kg` : 'nic'} · chybí ${formatKg(g.weight - p.best)} kg</span>`;
      return `<li class="goal${p.achieved ? ' done' : ''}">
        <div class="goal-head">
          <b>${escapeHtml(g.exercise)} ${formatKg(g.weight)} kg${reps}</b>
          <button class="icon-btn danger" type="button" data-action="goal-del" data-id="${g.id}" aria-label="Smazat cíl">✕</button>
        </div>
        <span class="bar"><span style="width:${p.ratio * 100}%"></span></span>
        ${state}
      </li>`;
    })
    .join('');

  return `<section class="block">
    <h3>Cíle</h3>
    <ul class="goals">${items || '<li class="muted">Zatím žádný cíl. Třeba bench press 100 kg?</li>'}</ul>
    <form class="goal-form" id="goal-form" autocomplete="off">
      <input class="quick-input" name="exercise" list="goal-exercises" placeholder="Cvik" required>
      <input class="quick-input num" name="weight" inputmode="decimal" placeholder="kg" required>
      <input class="quick-input num" name="reps" inputmode="numeric" placeholder="× 1">
      <button class="btn" type="submit">Přidat</button>
    </form>
    <datalist id="goal-exercises">
      ${exerciseNames(table, workouts).map((n) => `<option value="${escapeHtml(n)}">`).join('')}
    </datalist>
  </section>`;
}

export function renderOverview($el, table, key) {
  const draw = () => {
    const workouts = groupWorkouts(table);
    $el.innerHTML = todayHtml(table, workouts, key) + weekHtml(table, workouts) + goalsHtml(table, workouts);
  };

  const persist = () => saveTable(table);

  $el.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-action]');
    if (!btn) return;
    const { action, part, id } = btn.dataset;

    if (action === 'pause') {
      const note = prompt(`Pauza – ${part}. Proč? (třeba kotník, nepovinné)`, '');
      if (note === null) return;
      table.paused[part] = { since: today(), note: note.trim() };
    }
    if (action === 'resume') delete table.paused[part];
    if (action === 'goal-del') {
      const goal = table.goals.find((g) => g.id === id);
      if (!confirm(`Smazat cíl ${goal.exercise} ${goal.weight} kg?`)) return;
      table.goals = table.goals.filter((g) => g !== goal);
    }
    persist();
    draw();
  });

  $el.addEventListener('submit', (ev) => {
    if (ev.target.id !== 'goal-form') return;
    ev.preventDefault();
    const f = ev.target.elements;
    const exercise = f.exercise.value.trim();
    const weight = parseFloat(f.weight.value.replace(',', '.'));
    const reps = parseInt(f.reps.value, 10) || 1;
    if (!exercise || !(weight > 0)) return;
    table.goals.push({
      id: newId(),
      exercise: exercise[0].toUpperCase() + exercise.slice(1),
      weight,
      reps,
      createdAt: today(),
    });
    persist();
    draw();
  });

  draw();
}
