// Krátké oznámení dole na obrazovce, volitelně s tlačítkem (např. "Vrátit").
// Jeden společný prvek pro celou appku.

let $toast = null;
let timer;

export function toast(text, action = null) {
  if (!$toast) {
    $toast = document.createElement('div');
    $toast.className = 'toast';
    $toast.setAttribute('role', 'status');
    document.body.append($toast);
  }
  clearTimeout(timer);
  $toast.innerHTML = '';
  const $text = document.createElement('span');
  $text.textContent = text;
  $toast.append($text);
  if (action) {
    const $btn = document.createElement('button');
    $btn.type = 'button';
    $btn.textContent = action.label;
    $btn.onclick = () => {
      action.run();
      $toast.hidden = true;
    };
    $toast.append($btn);
  }
  $toast.hidden = false;
  timer = setTimeout(() => ($toast.hidden = true), 6000);
}
