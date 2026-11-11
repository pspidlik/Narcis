// Gym → Pumpa: fotky kdykoliv, jen pro radost. Do porovnání (Progres) nejdou.
// Mřížka jako na Instagramu, seskupená po měsících.

import { addPhoto, listPhotos, updatePhoto, deletePhoto } from '../db.js';
import { preparePhoto, photoUrl } from '../images.js';
import { takePhoto } from '../camera.js';
import { toast } from '../toast.js';
import { escapeHtml, today, isoDate, dayLabel, plural } from '../utils.js';

const monthLabel = (iso) => {
  const [y, m] = iso.split('-').map(Number);
  const name = new Date(y, m - 1, 1).toLocaleDateString('cs-CZ', { month: 'long' });
  return `${name[0].toUpperCase()}${name.slice(1)} ${y}`;
};

export async function renderPump($view) {
  $view.innerHTML = `<div class="page">
    <div class="photo-head">
      <h2 class="detail-title">Pumpa</h2>
      <p class="muted">Fotky kdykoliv – jen pro radost, do porovnání nejdou.</p>
    </div>
    <div class="photo-actions">
      <button class="btn" type="button" data-action="camera">📷 Vyfotit</button>
      <button class="btn btn-ghost" type="button" data-action="gallery">🖼 Z galerie</button>
    </div>
    <input type="file" accept="image/*" multiple hidden id="pump-file">
    <div id="pump-grid"></div>
    <dialog class="photo-viewer" id="viewer"></dialog>
  </div>`;

  // Posluchače věšíme na obal stránky – $view zůstává mezi stránkami, obal se zahodí
  const $root = $view.firstElementChild;
  const $grid = $root.querySelector('#pump-grid');
  const $file = $root.querySelector('#pump-file');
  const $viewer = $root.querySelector('#viewer');
  let photos = [];

  async function load() {
    photos = (await listPhotos('pump')).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
    draw();
  }

  function draw() {
    if (!photos.length) {
      $grid.innerHTML = '<p class="empty-state">Zatím žádná fotka.<br>Vyfoť pumpu po tréninku 💪</p>';
      return;
    }
    // Po měsících: "Listopad 2026 · 12 fotek"
    const months = new Map();
    for (const p of photos) {
      const m = p.date.slice(0, 7);
      if (!months.has(m)) months.set(m, []);
      months.get(m).push(p);
    }
    $grid.innerHTML = [...months]
      .map(
        ([m, list]) => `<h3 class="month-head">${monthLabel(m)} <span class="muted">· ${list.length} ${plural(list.length, 'fotka', 'fotky', 'fotek')}</span></h3>
        <div class="photo-grid">
          ${list.map((p) => `<button class="photo-tile" type="button" data-id="${p.id}"><img src="${photoUrl(p.thumb)}" alt="Pumpa ${p.date}" loading="lazy"></button>`).join('')}
        </div>`
      )
      .join('');
  }

  // Uloží vybrané nebo vyfocené fotky
  async function save(files, date) {
    toast(`Ukládám ${files.length} ${plural(files.length, 'fotku', 'fotky', 'fotek')}…`);
    for (const file of files) {
      const prepared = await preparePhoto(file);
      // Fotka z galerie: datum podle toho, kdy byla pořízená (lastModified)
      const photoDate = date || (file.lastModified ? isoDate(new Date(file.lastModified)) : today());
      await addPhoto({ kind: 'pump', date: photoDate, note: '', ...prepared });
    }
    toast('✓ Uloženo');
    await load();
  }

  function openViewer(photo) {
    const { day, date } = dayLabel(photo.date);
    $viewer.innerHTML = `
      <div class="viewer-body">
        <img src="${photoUrl(photo.blob)}" alt="">
        <div class="viewer-info">
          <b>${day}</b> <span class="muted">${date}</span>
          <textarea class="quick-input viewer-note" rows="2" placeholder="Poznámka…">${escapeHtml(photo.note || '')}</textarea>
          <div class="viewer-actions">
            <button class="btn btn-ghost danger-text" type="button" data-action="delete">Smazat</button>
            <button class="btn" type="button" data-action="close">Hotovo</button>
          </div>
        </div>
      </div>`;
    $viewer.dataset.id = photo.id;
    $viewer.showModal();
  }

  $file.addEventListener('change', () => {
    const files = [...$file.files];
    $file.value = ''; // ať jde vybrat znovu ta samá fotka
    if (files.length) save(files, null);
  });

  $root.addEventListener('click', async (ev) => {
    if (ev.target === $viewer) return $viewer.close();
    const tile = ev.target.closest('.photo-tile');
    if (tile) return openViewer(photos.find((p) => p.id === Number(tile.dataset.id)));

    const action = ev.target.closest('[data-action]')?.dataset.action;
    if (action === 'gallery') $file.click();
    if (action === 'camera') {
      const result = await takePhoto({ title: 'Pumpa' });
      if (result === 'unavailable') {
        toast('Kamera tady nejde – vyber fotku z galerie.');
        $file.click();
      } else if (result) {
        save([result], today());
      }
    }

    const photo = photos.find((p) => p.id === Number($viewer.dataset.id));
    if (action === 'close') $viewer.close();
    if (action === 'delete' && photo && confirm('Smazat fotku? Nejde to vrátit.')) {
      await deletePhoto(photo.id);
      $viewer.close();
      await load();
    }
  });

  // Poznámka se ukládá při psaní
  $viewer.addEventListener('input', (ev) => {
    if (!ev.target.classList.contains('viewer-note')) return;
    const photo = photos.find((p) => p.id === Number($viewer.dataset.id));
    photo.note = ev.target.value;
    updatePhoto(photo);
  });

  await load();
}
