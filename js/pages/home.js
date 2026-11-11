// Home page: název Narcis + dnešní datum, zkratky, Dnes.

import { icon } from '../icons.js';
import { toast } from '../toast.js';

// Zkratky = nejčastější akce na jedno klepnutí.
// Zatím jen vzhled – funkce za nimi přidáme v dalších krocích.
const SHORTCUTS = [
  { id: 'trenink', label: 'Trénink', icon: 'gym' },
  { id: 'fotka', label: 'Fotka', icon: 'camera' },
  { id: 'poznamka', label: 'Poznámka', icon: 'note' },
  { id: 'checkin', label: 'Check-in', icon: 'checkin' },
];

// "Středa 11. listopadu" – velké jen první písmeno
function todayText() {
  const text = new Date().toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' });
  return text[0].toUpperCase() + text.slice(1);
}

export function renderHome($view) {
  $view.innerHTML = `
    <header class="page-head">
      <p class="page-date">${todayText()}</p>
      <h1 class="page-title">Narcis</h1>
    </header>

    <nav class="shortcuts" aria-label="Zkratky">
      ${SHORTCUTS.map(
        (s) => `<button class="shortcut" type="button" data-shortcut="${s.id}">
          <span class="circle">${icon(s.icon)}</span>${s.label}
        </button>`
      ).join('')}
    </nav>

    <h2 class="section-title">Dnes</h2>
    <section class="card empty">
      ${icon('sun', 32)}
      <b>Na dnešek nic</b>
      <p>Až začneš zapisovat, uvidíš tady, co je na řadě.</p>
    </section>`;

  $view.querySelector('.shortcuts').addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-shortcut]');
    if (btn) toast('Přidáme v dalším kroku');
  });
}
