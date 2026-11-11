// Krátké oznámení dole na obrazovce, po chvíli samo zmizí.

let $toast = null;
let timer;

export function toast(text) {
  if (!$toast) {
    $toast = document.createElement('div');
    $toast.className = 'toast';
    $toast.setAttribute('role', 'status');
    document.body.append($toast);
  }
  clearTimeout(timer);
  $toast.textContent = text;
  $toast.hidden = false;
  timer = setTimeout(() => ($toast.hidden = true), 2500);
}
