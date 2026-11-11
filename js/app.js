// Hlavní logika: spodní lišta a přepínání stránek podle adresy za #.
// Příklad: index.html#/gym  ->  stránka Gym

import { icon } from './icons.js';
import { renderHome } from './pages/home.js';

// Stránky ve spodní liště. Prázdné stránky zatím ukážou jen nadpis.
const PAGES = [
  { id: 'home', label: 'Domů', icon: 'home', render: renderHome },
  { id: 'gym', label: 'Gym', icon: 'gym' },
  { id: 'looks', label: 'Looks', icon: 'looks' },
  { id: 'fity', label: 'Fity', icon: 'fity' },
];

const $view = document.getElementById('view');
const $tabbar = document.getElementById('tabbar');

// Stránka, která zatím nemá obsah
function renderEmpty($el, page) {
  $el.innerHTML = `
    <header class="page-head"><h1 class="page-title">${page.label}</h1></header>
    <section class="card empty">
      ${icon(page.icon, 32)}
      <b>Tady zatím nic není</b>
      <p>Sekci ${page.label} postavíme v dalších krocích.</p>
    </section>`;
}

function render() {
  const id = location.hash.replace(/^#\/?/, '').split('/')[0];
  const page = PAGES.find((p) => p.id === id) || PAGES[0]; // neznámá adresa -> Domů

  $tabbar.innerHTML = PAGES.map(
    (p) => `<a href="#/${p.id}" class="${p === page ? 'active' : ''}">${icon(p.icon)}${p.label}</a>`
  ).join('');

  $view.scrollTop = 0;
  (page.render || ((el) => renderEmpty(el, page)))($view);
  document.title = page.id === 'home' ? 'Narcis' : `${page.label} · Narcis`;
}

window.addEventListener('hashchange', render);
render();

// Service worker = offline režim. Funguje jen přes https (nebo localhost), ne z file://
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Offline režim se nezapnul:', err));
}
