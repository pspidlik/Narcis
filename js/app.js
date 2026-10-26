// Hlavní logika: podle adresy za # vykreslí správnou kategorii a podzáložku.
// Příklad adresy: index.html#/gym/pumpa

import { categories } from './routes.js';
import { addEntry, listEntries, deleteEntry, requestPersistence } from './db.js';

const $tabbar = document.getElementById('tabbar');
const $subnav = document.getElementById('subnav');
const $title = document.getElementById('page-title');
const $view = document.getElementById('view');

// "#/gym/pumpa" -> { category, section }; neznámá adresa -> první záložka
function parseHash() {
  const [catId, secId] = location.hash.replace(/^#\/?/, '').split('/');
  const category = categories.find((c) => c.id === catId) || categories[0];
  const section = category.sections.find((s) => s.id === secId) || category.sections[0];
  return { category, section };
}

function renderNav(category, section) {
  $tabbar.innerHTML = categories
    .map((c) => `<a href="#/${c.id}" class="${c === category ? 'active' : ''}">${c.icon}${c.label}</a>`)
    .join('');

  $subnav.innerHTML = category.sections
    .map((s) => `<a href="#/${category.id}/${s.id}" class="${s === section ? 'active' : ''}">${s.label}</a>`)
    .join('');

  $title.textContent = category.label;
  document.title = `${section.label} · ${category.label} · Narcis`;
}

// Zatím stejná zástupná stránka pro každou podzáložku.
// Malý formulář jen ověřuje, že ukládání do IndexedDB funguje.
async function renderView(category, section) {
  const key = `${category.id}/${section.id}`;
  $view.innerHTML = `
    <div class="card">
      <h2>${section.label}</h2>
      <p class="muted">Tady bude obsah sekce ${category.label} → ${section.label}.</p>
    </div>
    <div class="card">
      <h2>Test ukládání</h2>
      <p class="muted">Záznamy se ukládají jen do tohoto zařízení.</p>
      <form class="row" id="entry-form">
        <input name="text" placeholder="Napiš poznámku…" autocomplete="off" required>
        <button class="btn" type="submit">Uložit</button>
      </form>
      <ul class="list" id="entry-list"></ul>
    </div>`;

  const $list = document.getElementById('entry-list');

  async function refresh() {
    const entries = await listEntries(key);
    $list.innerHTML = entries
      .map((e) => `<li><span>${escapeHtml(e.text)}</span><button class="del" data-id="${e.id}" aria-label="Smazat">✕</button></li>`)
      .join('');
  }

  document.getElementById('entry-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const input = ev.target.elements.text;
    await addEntry(key, { text: input.value.trim() });
    input.value = '';
    refresh();
  });

  $list.addEventListener('click', async (ev) => {
    const id = ev.target.dataset.id;
    if (!id) return;
    await deleteEntry(Number(id));
    refresh();
  });

  refresh();
}

// Text od uživatele nikdy nevkládáme do HTML "syrový"
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

function render() {
  const { category, section } = parseHash();
  renderNav(category, section);
  renderView(category, section);
}

window.addEventListener('hashchange', render);
render();
requestPersistence();

// Service worker = offline režim. Funguje jen přes http(s), ne z file://
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch((err) => console.warn('SW se nezaregistroval:', err));
}
