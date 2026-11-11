// ⚙ Plány tréninků: názvy tréninků a cviky, které v nich obvykle cvičíš.
// Uložené v gym tabulce (table.templates), takže jsou pohromadě s ostatními daty.

import { saveTableSoon } from '../db.js';
import { escapeHtml, newId, fold } from '../utils.js';
import { groupWorkouts, exerciseNames } from '../gym-data.js';

function exercisesHtml(t) {
  if (!t.exercises.length) return '<li class="muted plan-empty">Zatím žádné cviky</li>';
  const last = t.exercises.length - 1;
  return t.exercises
    .map(
      (name, i) => `<li>
        <span class="plan-ex-name">${escapeHtml(name)}</span>
        <button class="icon-btn" type="button" data-action="ex-move" data-id="${t.id}" data-i="${i}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Posunout nahoru">↑</button>
        <button class="icon-btn" type="button" data-action="ex-move" data-id="${t.id}" data-i="${i}" data-dir="1" ${i === last ? 'disabled' : ''} aria-label="Posunout dolů">↓</button>
        <button class="icon-btn danger" type="button" data-action="ex-del" data-id="${t.id}" data-i="${i}" aria-label="Odebrat cvik">✕</button>
      </li>`
    )
    .join('');
}

function planHtml(t) {
  return `<section class="plan-card">
    <div class="plan-card-head">
      <input class="plan-name" data-plan="${t.id}" value="${escapeHtml(t.name)}" aria-label="Název tréninku">
      <button class="icon-btn danger" type="button" data-action="plan-del" data-id="${t.id}" aria-label="Smazat trénink">✕</button>
    </div>
    <ol class="plan-exercises" id="ex-${t.id}">${exercisesHtml(t)}</ol>
    <form class="quick plan-add" data-id="${t.id}" autocomplete="off">
      <input class="quick-input" name="name" list="plan-exercises" placeholder="Přidat cvik, např. Bench press"
             enterkeyhint="done" autocorrect="off" spellcheck="false">
      <button class="btn icon" type="submit" aria-label="Přidat cvik">+</button>
    </form>
  </section>`;
}

export function renderPlans($el, table, key) {
  $el.innerHTML = `
    <div class="detail-top"><a class="back" href="#/${key}">‹ Tréninky</a></div>
    <h2 class="detail-title">Plány tréninků</h2>
    <p class="muted plans-intro">Ke každému tréninku si přidej cviky, které obvykle cvičíš.
      Když pak trénink začneš, budou připravené k zapsání.</p>
    <div id="plans"></div>
    <button class="btn btn-ghost wide" type="button" data-action="plan-add">+ Nový trénink</button>
    <datalist id="plan-exercises"></datalist>`;

  const $plans = $el.querySelector('#plans');
  const $names = $el.querySelector('#plan-exercises');
  const find = (id) => table.templates.find((t) => t.id === id);
  const save = () => saveTableSoon(table);

  const refreshNames = () => {
    $names.innerHTML = exerciseNames(table, groupWorkouts(table)).map((n) => `<option value="${escapeHtml(n)}">`).join('');
  };

  const draw = () => {
    $plans.innerHTML = table.templates.length
      ? table.templates.map(planHtml).join('')
      : '<p class="empty-state">Žádné plány. Přidej první tlačítkem dole.</p>';
  };

  // Překreslí jen cviky jednoho plánu – pole pro přidání zůstane aktivní
  const drawExercises = (t) => {
    $el.querySelector(`#ex-${t.id}`).innerHTML = exercisesHtml(t);
  };

  // Přejmenování tréninku – ukládá se průběžně
  $el.addEventListener('input', (ev) => {
    const id = ev.target.dataset.plan;
    if (!id) return;
    find(id).name = ev.target.value;
    save();
  });

  // Přidání cviku do plánu
  $el.addEventListener('submit', (ev) => {
    const $form = ev.target.closest('.plan-add');
    if (!$form) return;
    ev.preventDefault();
    const $input = $form.elements.name;
    const raw = $input.value.trim();
    if (!raw) return;
    const name = raw[0].toUpperCase() + raw.slice(1);
    const t = find($form.dataset.id);
    if (!t.exercises.some((e) => fold(e) === fold(name))) t.exercises.push(name);
    $input.value = '';
    drawExercises(t);
    refreshNames();
    save();
  });

  $el.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    const t = id && find(id);
    const i = Number(btn.dataset.i);

    if (action === 'ex-move') {
      const j = i + Number(btn.dataset.dir);
      [t.exercises[i], t.exercises[j]] = [t.exercises[j], t.exercises[i]];
      drawExercises(t);
      save();
    }

    if (action === 'ex-del') {
      t.exercises.splice(i, 1);
      drawExercises(t);
      save();
    }

    if (action === 'plan-del') {
      if (!confirm(`Smazat trénink „${t.name}"? Zapsané série zůstanou.`)) return;
      table.templates = table.templates.filter((x) => x !== t);
      draw();
      save();
    }

    if (action === 'plan-add') {
      const plan = { id: newId(), name: 'Nový trénink', exercises: [] };
      table.templates.push(plan);
      draw();
      save();
      const $name = $el.querySelector(`[data-plan="${plan.id}"]`);
      $name.focus();
      $name.select();
    }
  });

  refreshNames();
  draw();
}
