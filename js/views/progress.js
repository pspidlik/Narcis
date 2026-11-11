// Gym → Progres: check-in 1× za 1–2 týdny (ráno), fotky ze stejných úhlů, porovnání.
//   #/gym/progres                         stav + časová osa check-inů
//   #/gym/progres/novy                    nový check-in (focení s overlayem minulé fotky)
//   #/gym/progres/porovnat/<od>/<do>      dva check-iny vedle sebe
// Údaje o check-inu (datum, váha, poznámka) jsou v gym tabulce (table.checkins),
// fotky ve store photos (kind 'checkin', checkinId, pose).

import { saveTable, addPhoto, listPhotos, deleteCheckinPhotos } from '../db.js';
import { loadTable } from '../gym-data.js';
import { preparePhoto, photoUrl } from '../images.js';
import { takePhoto } from '../camera.js';
import { toast } from '../toast.js';
import { escapeHtml, newId, today, dayLabel, shortDate, daysBetween, daysAgo, plural } from '../utils.js';

const POSES = [
  { id: 'front', label: 'Předek' },
  { id: 'side', label: 'Bok' },
  { id: 'back', label: 'Záda' },
];

const KEY = 'gym/progres';

// "-1,5 kg" / "+0,8 kg"
const kgDiff = (a, b) => {
  if (!a || !b) return '';
  const d = Math.round((b - a) * 10) / 10;
  return `${d > 0 ? '+' : ''}${String(d).replace('.', ',')} kg`;
};
const kg = (n) => (n ? `${String(n).replace('.', ',')} kg` : '');

// Check-iny od nejstaršího + jejich fotky podle úhlu
async function loadCheckins() {
  const table = await loadTable();
  const photos = await listPhotos('checkin');
  const checkins = [...table.checkins].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  for (const c of checkins) {
    c.photos = Object.fromEntries(photos.filter((p) => p.checkinId === c.id).map((p) => [p.pose, p]));
  }
  return { table, checkins };
}

export async function renderProgress($view, key, [mode, a, b] = []) {
  if (mode === 'novy') return renderNew($view);
  if (mode === 'porovnat') return renderCompare($view, a, b);
  return renderTimeline($view);
}

// ---------- Stav + časová osa ----------

function statusHtml(checkins) {
  if (!checkins.length) {
    return `<p>Zatím žádný check-in.</p>
      <p class="muted">První udělej ráno, nalačno, na stejném místě a ve stejném světle.
      Příště ti kamera ukáže tuhle fotku průhledně přes obraz, ať stojíš stejně.</p>`;
  }
  const last = checkins.at(-1);
  const days = daysBetween(last.date, today());
  let next;
  if (days < 7) next = `<span class="muted">Další check-in za ${7 - days} ${plural(7 - days, 'den', 'dny', 'dní')}.</span>`;
  else if (days <= 14) next = '<span class="up">Je čas na check-in 📸</span>';
  else next = '<span class="down">Už je to přes 2 týdny – udělej check-in 📸</span>';
  return `<p>Poslední check-in <b>${shortDate(last.date)}</b> – ${daysAgo(days)}.</p><p>${next}</p>`;
}

async function renderTimeline($view) {
  const { table, checkins } = await loadCheckins();
  const newest = [...checkins].reverse();

  const cards = newest
    .map((c) => {
      const i = checkins.indexOf(c);
      const prev = checkins[i - 1];
      const { day, date } = dayLabel(c.date);
      const thumbs = POSES.map((p) =>
        c.photos[p.id]
          ? `<img src="${photoUrl(c.photos[p.id].thumb)}" alt="${p.label}">`
          : `<span class="thumb-empty">${p.label}</span>`
      ).join('');
      const diff = prev ? ` <span class="muted">${kgDiff(prev.weight, c.weight)}</span>` : '';
      const gap = prev ? daysBetween(prev.date, c.date) : 0;
      const since = prev
        ? `<span class="muted">+${gap} ${plural(gap, 'den', 'dny', 'dní')}</span>`
        : '<span class="muted">první</span>';
      // Klepnutí = porovnání s předchozím (u prvního s posledním)
      const other = prev || checkins.at(-1);
      const href = other && other !== c ? `#/${KEY}/porovnat/${prev ? prev.id : c.id}/${prev ? c.id : other.id}` : null;
      return `<article class="checkin-card">
        <a class="checkin-link" ${href ? `href="${href}"` : ''}>
          <div class="wc-head"><span class="wc-day">${day}</span><span class="muted">${date}</span></div>
          <div class="checkin-meta">${c.weight ? `<b>${kg(c.weight)}</b>${diff}` : ''} ${since}</div>
          <div class="checkin-thumbs">${thumbs}</div>
          ${c.note ? `<p class="ex-note">${escapeHtml(c.note)}</p>` : ''}
        </a>
        <button class="icon-btn danger checkin-del" type="button" data-action="delete" data-id="${c.id}" aria-label="Smazat check-in">✕</button>
      </article>`;
    })
    .join('');

  $view.innerHTML = `<div class="page">
    <div class="photo-head">
      <h2 class="detail-title">Progres</h2>
      ${statusHtml(checkins)}
    </div>
    <div class="photo-actions">
      <a class="btn" href="#/${KEY}/novy">📸 Nový check-in</a>
      ${checkins.length >= 2 ? `<a class="btn btn-ghost" href="#/${KEY}/porovnat/${checkins[0].id}/${checkins.at(-1).id}">Porovnat první a poslední</a>` : ''}
    </div>
    <div class="checkins">${cards}</div>
  </div>`;

  // Posluchače věšíme na obal stránky – $view zůstává mezi stránkami, obal se zahodí
  const $root = $view.firstElementChild;
  $root.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('[data-action="delete"]');
    if (!btn) return;
    const c = checkins.find((x) => x.id === btn.dataset.id);
    if (!confirm(`Smazat check-in ${shortDate(c.date)} i s fotkami? Nejde to vrátit.`)) return;
    table.checkins = table.checkins.filter((x) => x.id !== c.id);
    await saveTable(table);
    await deleteCheckinPhotos(c.id);
    renderTimeline($view);
  });
}

// ---------- Nový check-in ----------

async function renderNew($view) {
  const { table, checkins } = await loadCheckins();
  const last = checkins.at(-1);
  const taken = {}; // pose -> připravená fotka { blob, thumb, width, height }
  let currentPose = null;

  $view.innerHTML = `<div class="page">
    <div class="detail-top"><a class="back" href="#/${KEY}">‹ Progres</a></div>
    <h2 class="detail-title">Nový check-in</h2>
    <p class="muted plans-intro">Ráno, nalačno, stejné místo a světlo.
      ${last ? 'Kamera ukáže minulou fotku průhledně přes obraz – postav se tak, ať sedí.' : ''}</p>
    <div class="poses" id="poses"></div>
    <div class="checkin-form">
      <label>Váha <input class="quick-input num" id="ci-weight" inputmode="decimal" placeholder="kg"></label>
      <input class="quick-input" id="ci-note" placeholder="Poznámka (nepovinné)">
    </div>
    <button class="btn wide" type="button" data-action="save" id="ci-save" disabled>Uložit check-in</button>
    <input type="file" accept="image/*" hidden id="ci-file">
  </div>`;

  const $root = $view.firstElementChild;
  const $poses = $root.querySelector('#poses');
  const $file = $root.querySelector('#ci-file');
  const $save = $root.querySelector('#ci-save');

  function draw() {
    $poses.innerHTML = POSES.map((p) => {
      const mine = taken[p.id];
      const prev = last?.photos[p.id];
      const img = mine
        ? `<img src="${photoUrl(mine.thumb)}" alt="${p.label}">`
        : prev
          ? `<img class="ghost" src="${photoUrl(prev.thumb)}" alt=""><span class="pose-hint">minule</span>`
          : `<span class="pose-hint">bez fotky</span>`;
      return `<section class="pose-card${mine ? ' done' : ''}">
        <div class="pose-slot">${img}</div>
        <div class="pose-info">
          <b>${p.label}${mine ? ' ✓' : ''}</b>
          <button class="btn" type="button" data-action="camera" data-pose="${p.id}">📷 ${mine ? 'Znovu' : 'Vyfotit'}</button>
          <button class="btn btn-ghost" type="button" data-action="gallery" data-pose="${p.id}">🖼 Z galerie</button>
        </div>
      </section>`;
    }).join('');
    $save.disabled = !Object.keys(taken).length;
  }

  async function use(pose, blob) {
    toast('Připravuju fotku…');
    taken[pose] = await preparePhoto(blob);
    draw();
  }

  $file.addEventListener('change', () => {
    const file = $file.files[0];
    $file.value = '';
    if (file && currentPose) use(currentPose, file);
  });

  $root.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('[data-action]');
    if (!btn) return;
    const { action, pose } = btn.dataset;

    if (action === 'gallery') {
      currentPose = pose;
      $file.click();
    }

    if (action === 'camera') {
      currentPose = pose;
      const label = POSES.find((p) => p.id === pose).label;
      const result = await takePhoto({ overlayBlob: last?.photos[pose]?.blob || null, title: `Check-in · ${label}` });
      if (result === 'unavailable') {
        toast('Kamera tady nejde – vyber fotku z galerie.');
        $file.click();
      } else if (result) {
        use(pose, result);
      }
    }

    if (action === 'save') {
      $save.disabled = true;
      const weight = parseFloat($root.querySelector('#ci-weight').value.replace(',', '.')) || null;
      const note = $root.querySelector('#ci-note').value.trim();
      const checkin = { id: newId(), date: today(), weight, note, createdAt: Date.now() };
      for (const [poseId, photo] of Object.entries(taken)) {
        await addPhoto({ kind: 'checkin', checkinId: checkin.id, pose: poseId, date: checkin.date, ...photo });
      }
      table.checkins.push(checkin);
      await saveTable(table);
      toast('✓ Check-in uložen');
      location.hash = `#/${KEY}`;
    }
  });

  draw();
}

// ---------- Porovnání vedle sebe ----------

async function renderCompare($view, fromId, toId) {
  const { checkins } = await loadCheckins();
  if (checkins.length < 2) {
    location.hash = `#/${KEY}`;
    return;
  }
  let from = checkins.find((c) => c.id === fromId) || checkins[0];
  let to = checkins.find((c) => c.id === toId) || checkins.at(-1);
  // První úhel, který mají oba check-iny
  let pose = POSES.find((p) => from.photos[p.id] && to.photos[p.id])?.id || 'front';

  const options = (selected) =>
    checkins
      .map((c) => `<option value="${c.id}"${c === selected ? ' selected' : ''}>${shortDate(c.date)}${c.weight ? ` · ${kg(c.weight)}` : ''}</option>`)
      .join('');

  const side = (c) => {
    const photo = c.photos[pose];
    const { day, date } = dayLabel(c.date);
    return `<figure class="compare-side">
      ${photo ? `<img src="${photoUrl(photo.blob)}" alt="${day} ${date}">` : '<div class="thumb-empty">Bez fotky</div>'}
      <figcaption><b>${date}</b>${c.weight ? ` · ${kg(c.weight)}` : ''}</figcaption>
    </figure>`;
  };

  // Obal stránky – posluchače na něm, překresluje se jen jeho obsah
  $view.innerHTML = '<div class="page"></div>';
  const $root = $view.firstElementChild;

  function draw() {
    const days = daysBetween(from.date, to.date);
    const weight = kgDiff(from.weight, to.weight);
    $root.innerHTML = `
      <div class="detail-top"><a class="back" href="#/${KEY}">‹ Progres</a></div>
      <h2 class="detail-title">Porovnání</h2>
      <nav class="segmented" aria-label="Úhel">
        ${POSES.map((p) => `<a href="" data-pose="${p.id}" class="${p.id === pose ? 'active' : ''}">${p.label}</a>`).join('')}
      </nav>
      <div class="compare-pick">
        <select class="ex-info-part" id="cmp-from" aria-label="Od">${options(from)}</select>
        <span class="muted">→</span>
        <select class="ex-info-part" id="cmp-to" aria-label="Do">${options(to)}</select>
      </div>
      <div class="compare">${side(from)}${side(to)}</div>
      <p class="compare-diff"><b>${days} ${plural(Math.abs(days), 'den', 'dny', 'dní')}</b>${weight ? ` · ${weight}` : ''}</p>`;
  }

  $root.addEventListener('click', (ev) => {
    const tab = ev.target.closest('[data-pose]');
    if (!tab) return;
    ev.preventDefault();
    pose = tab.dataset.pose;
    draw();
  });

  $root.addEventListener('change', (ev) => {
    if (ev.target.id === 'cmp-from') from = checkins.find((c) => c.id === ev.target.value);
    if (ev.target.id === 'cmp-to') to = checkins.find((c) => c.id === ev.target.value);
    draw();
  });

  draw();
}
