// Gym → Tabulka: tři pohledy na stejná data (série v jedné tabulce).
//   #/gym/tabulka                    seznam tréninků (jako Strava)
//   #/gym/tabulka/2026-10-26         detail jednoho tréninku
//   #/gym/tabulka/plany              ⚙ plány tréninků a cviky (partie, rozsah opakování)
//   #/gym/tabulka/prehled            Co dnes?, tento týden po partiích, cíle
//   #/gym/tabulka/excel              všechny série jako tabulka v Excelu
//   #/gym/tabulka/excel/2026-10-26   tabulka vyfiltrovaná na jeden den

import { loadTable } from '../gym-data.js';
import { renderWorkoutList, renderWorkoutDetail } from './workouts.js';
import { renderPlans } from './plans.js';
import { renderOverview } from './overview.js';
import { renderTable } from './table.js';

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export async function renderGymLog($view, key, [mode, arg] = []) {
  const table = await loadTable(key);
  const tab = mode === 'excel' ? 'excel' : mode === 'prehled' ? 'prehled' : 'treninky';

  // Tabulka vyplní celou výšku a scrolluje sama, ostatní scrollují normálně
  $view.classList.toggle('fill', tab === 'excel');
  $view.innerHTML = `
    <div class="gym-page">
      <nav class="segmented" aria-label="Pohled">
        <a href="#/${key}" class="${tab === 'treninky' ? 'active' : ''}">Tréninky</a>
        <a href="#/${key}/prehled" class="${tab === 'prehled' ? 'active' : ''}">Přehled</a>
        <a href="#/${key}/excel" class="${tab === 'excel' ? 'active' : ''}">Tabulka</a>
      </nav>
      <div class="gym-body" id="gym-body"></div>
    </div>`;

  const $body = $view.querySelector('#gym-body');
  if (tab === 'excel') renderTable($body, table, { search: arg });
  else if (tab === 'prehled') renderOverview($body, table, key);
  else if (mode === 'plany') renderPlans($body, table, key);
  else if (isDate(mode)) renderWorkoutDetail($body, table, key, mode);
  else renderWorkoutList($body, table, key);
}
