// Struktura navigace. Chceš novou kategorii nebo podzáložku? Přidej ji sem.
// id = kousek adresy (#/gym/tabulka), label = text v appce.

const icon = (path) =>
  `<svg class="icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

export const categories = [
  {
    id: 'gym',
    label: 'Gym',
    icon: icon('<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>'),
    sections: [
      { id: 'tabulka', label: 'Tabulka' },
      { id: 'pumpa', label: 'Pumpa' },
      { id: 'progres', label: 'Progres' },
    ],
  },
  {
    id: 'looks',
    label: 'Looks',
    icon: icon('<circle cx="12" cy="9" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
    // Zatím zástupné podzáložky – přejmenuj podle sebe
    sections: [
      { id: 'fotky', label: 'Fotky' },
      { id: 'rutina', label: 'Rutina' },
      { id: 'progres', label: 'Progres' },
    ],
  },
  {
    id: 'fity',
    label: 'Fity',
    icon: icon('<path d="M8 3l4 3 4-3 5 4-3 3v11H6V10L3 7z"/>'),
    // Zatím zástupné podzáložky – přejmenuj podle sebe
    sections: [
      { id: 'outfity', label: 'Outfity' },
      { id: 'satnik', label: 'Šatník' },
      { id: 'wishlist', label: 'Wishlist' },
    ],
  },
];
