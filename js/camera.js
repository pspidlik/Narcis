// Fotoaparát v appce: živý obraz z kamery, přes něj poloprůhledně minulá fotka
// ("overlay"), ať stojíš pokaždé stejně. Se samospouští pro focení bez druhé osoby.
//
// takePhoto() vrátí:
//   Blob        – vyfocená fotka
//   null        – zrušeno
//   'unavailable' – kamera nejde (není povolená / zařízení ji nemá) -> použij galerii

import { photoUrl } from './images.js';
import { escapeHtml } from './utils.js';

const GHOST_LEVELS = [0.4, 0.65, 0]; // průhlednost minulé fotky – přepíná se tlačítkem
const TIMERS = [0, 3, 10];           // samospoušť v sekundách

export async function takePhoto({ overlayBlob = null, title = '' } = {}) {
  if (!navigator.mediaDevices?.getUserMedia) return 'unavailable';

  let facing = 'user'; // přední kamera – vidíš se při focení
  let stream;
  try {
    stream = await openStream(facing);
  } catch {
    return 'unavailable';
  }

  const $cam = document.createElement('div');
  $cam.className = 'camera';
  $cam.innerHTML = `
    <div class="camera-stage mirrored">
      <video playsinline muted autoplay></video>
      ${overlayBlob ? `<img class="camera-ghost" alt="" src="${photoUrl(overlayBlob)}">` : ''}
      <div class="camera-count" hidden></div>
    </div>
    <div class="camera-top">${escapeHtml(title)}</div>
    <div class="camera-bar">
      <button type="button" data-cam="cancel">Zrušit</button>
      ${overlayBlob ? '<button type="button" data-cam="ghost">Minulá: 40 %</button>' : '<span></span>'}
      <button type="button" class="shutter" data-cam="shoot" aria-label="Vyfotit"></button>
      <button type="button" data-cam="timer">⏱ ihned</button>
      <button type="button" data-cam="flip" aria-label="Otočit kameru">⟲</button>
    </div>`;
  document.body.append($cam);

  const $stage = $cam.querySelector('.camera-stage');
  const $video = $cam.querySelector('video');
  const $ghost = $cam.querySelector('.camera-ghost');
  const $count = $cam.querySelector('.camera-count');
  $video.srcObject = stream;

  let ghostLevel = 0;
  let timerLevel = 0;
  let busy = false;

  return new Promise((resolve) => {
    const close = (result) => {
      stream.getTracks().forEach((t) => t.stop()); // vypnout kameru
      $cam.remove();
      resolve(result);
    };

    // Snímek z videa -> JPEG (uloží se bez zrcadlení, jako normální fotka)
    const capture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = $video.videoWidth;
      canvas.height = $video.videoHeight;
      canvas.getContext('2d').drawImage($video, 0, 0);
      canvas.toBlob((blob) => close(blob), 'image/jpeg', 0.92);
    };

    $cam.addEventListener('click', async (ev) => {
      const action = ev.target.closest('[data-cam]')?.dataset.cam;
      if (!action || busy) return;
      const btn = ev.target.closest('[data-cam]');

      if (action === 'cancel') close(null);

      if (action === 'ghost') {
        ghostLevel = (ghostLevel + 1) % GHOST_LEVELS.length;
        const level = GHOST_LEVELS[ghostLevel];
        $ghost.style.opacity = level;
        btn.textContent = level ? `Minulá: ${Math.round(level * 100)} %` : 'Minulá: skrytá';
      }

      if (action === 'timer') {
        timerLevel = (timerLevel + 1) % TIMERS.length;
        btn.textContent = TIMERS[timerLevel] ? `⏱ ${TIMERS[timerLevel]} s` : '⏱ ihned';
      }

      if (action === 'flip') {
        busy = true;
        stream.getTracks().forEach((t) => t.stop());
        facing = facing === 'user' ? 'environment' : 'user';
        try {
          stream = await openStream(facing);
          $video.srcObject = stream;
          $stage.classList.toggle('mirrored', facing === 'user'); // přední kamera jako zrcadlo
        } catch {
          return close('unavailable');
        } finally {
          busy = false;
        }
      }

      if (action === 'shoot') {
        busy = true;
        // Samospoušť: odpočet na obrazovce, pak fotka
        for (let s = TIMERS[timerLevel]; s > 0; s--) {
          $count.hidden = false;
          $count.textContent = s;
          await new Promise((r) => setTimeout(r, 1000));
        }
        $count.hidden = true;
        capture();
      }
    });
  });
}

function openStream(facingMode) {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1920 } },
    audio: false,
  });
}
