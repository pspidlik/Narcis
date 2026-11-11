// Všechny série jako tabulka v Excelu: buňky, do kterých se rovnou píše.
// Jeden řádek = jedna série. Nejnovější řádky jsou nahoře.
// Podoba dat a výchozí sloupce jsou v gym-data.js.

import { saveTableSoon } from '../db.js';
import { escapeHtml, newId, fold } from '../utils.js';
import { WARMUP, colByRole, newRow } from '../gym-data.js';

const TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Číslo' },
  { value: 'date', label: 'Datum' },
  { value: 'choice', label: 'Výběr z možností' },
];

// Kolik kroků jde vrátit tlačítkem Zpět
const MAX_HISTORY = 50;

const swap = (arr, i, j) => ([arr[i], arr[j]] = [arr[j], arr[i]]);

function cellInput(col, row) {
  const raw = row.cells[col.id] ?? '';
  const attrs = `class="cell" data-row="${row.id}" data-col="${col.id}" aria-label="${escapeHtml(col.name)}"`;
  if (col.type === 'choice') {
    const options = ['', ...(col.options || [])]
      .map((o) => `<option value="${escapeHtml(o)}"${o === raw ? ' selected' : ''}>${escapeHtml(o)}</option>`)
      .join('');
    return `<select ${attrs}>${options}</select>`;
  }
  const value = `value="${escapeHtml(raw)}"`;
  if (col.type === 'date') return `<input type="date" ${attrs} ${value}>`;
  // type="text" + inputmode="decimal": iPhone ukáže čísla a jde psát i 82,5
  if (col.type === 'number') return `<input type="text" inputmode="decimal" ${attrs} ${value}>`;
  return `<input type="text" ${attrs} ${value}>`;
}

// Zeptá se na možnosti pro sloupec typu "výběr". null = uživatel zrušil.
function askOptions(current) {
  const answer = prompt('Možnosti oddělené čárkou:', (current || ['Ano', 'Ne']).join(', '));
  if (answer === null) return null;
  const options = answer.split(',').map((s) => s.trim()).filter(Boolean);
  return options.length ? options : null;
}

/**
 * Vykreslí tabulku do $el. table = načtená tabulka (gym-data.js loadTable).
 * search = text, kterým se má tabulka rovnou vyfiltrovat (např. datum).
 */
export function renderTable($el, table, { search = '' } = {}) {
  // Vlastní obal: posluchače událostí věšíme na něj. Při odchodu ze stránky
  // se zahodí i s posluchači, takže se nenasčítají.
  $el.innerHTML = `
    <div class="table-page">
      <div class="table-toolbar">
        <button class="btn btn-ghost" data-action="add-row">+ Řádek</button>
        <button class="btn btn-ghost" data-action="add-col">+ Sloupec</button>
        <button class="btn btn-ghost icon" data-action="undo" id="undo-btn" disabled aria-label="Zpět">↶</button>
        <button class="btn btn-ghost icon" data-action="redo" id="redo-btn" disabled aria-label="Znovu">↷</button>
        <span class="muted save-status" id="save-status"></span>
      </div>

      <div class="search-row">
        <input type="search" class="search" id="search" placeholder="Hledat, např. bench" aria-label="Hledat v tabulce">
        <span class="muted search-count" id="search-count"></span>
      </div>

      <div class="sheet-wrap"><table class="sheet" id="sheet"></table></div>
      <dialog class="menu" id="menu"></dialog>
    </div>`;

  const $root = $el.firstElementChild;
  const $ = (sel) => $root.querySelector(sel);
  const $sheet = $('#sheet');
  const $status = $('#save-status');
  const $undo = $('#undo-btn');
  const $redo = $('#redo-btn');
  const $search = $('#search');
  const $count = $('#search-count');
  const $menu = $('#menu');

  const role = (r) => colByRole(table, r);

  // ---------- Historie: Zpět / Znovu ----------
  // Před každou změnou si uložíme kopii tabulky (snapshot) do zásobníku Zpět.
  // Zpět přesune aktuální stav do zásobníku Znovu a obráceně.
  // Nová změna zásobník Znovu vymaže. Historie žije jen v paměti.
  const undoStack = [];
  const redoStack = [];
  let editing = null; // buňka, do které se právě píše – celé psaní = jeden krok

  const snapshot = () => JSON.stringify({ columns: table.columns, rows: table.rows });

  function updateHistoryButtons() {
    $undo.disabled = undoStack.length === 0;
    $redo.disabled = redoStack.length === 0;
  }

  function remember() {
    undoStack.push(snapshot());
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
    updateHistoryButtons();
  }

  function restore(from, to) {
    const snap = from.pop();
    if (!snap) return;
    to.push(snapshot());
    Object.assign(table, JSON.parse(snap));
    editing = null;
    updateHistoryButtons();
    draw();
    save();
  }

  // ---------- Ukládání ----------
  function save() {
    $status.textContent = 'Ukládám…';
    saveTableSoon(table).then(
      () => ($status.textContent = 'Uloženo'),
      () => ($status.textContent = 'Chyba ukládání!')
    );
  }

  // ---------- Hledání ----------
  let query = []; // slova z hledání, všechna musí v řádku být

  function setSearch(text) {
    $search.value = text;
    query = fold(text).split(/\s+/).filter(Boolean);
  }

  function isVisible(row) {
    if (!query.length) return true;
    const text = fold(table.columns.map((c) => row.cells[c.id] ?? '').join(' '));
    return query.every((word) => text.includes(word));
  }

  // ---------- Vykreslení ----------
  // Překreslí celou tabulku – při změně struktury nebo hledání, ne při psaní
  function draw() {
    const kindCol = role('kind');

    const head = table.columns
      .map(
        (c) => `<th><div class="th">
          <input class="cell head" data-head="${c.id}" value="${escapeHtml(c.name)}" aria-label="Název sloupce">
          <button class="icon-btn" data-action="col-menu" data-id="${c.id}" aria-label="Možnosti sloupce ${escapeHtml(c.name)}">⋯</button>
        </div></th>`
      )
      .join('');

    const visible = table.rows.map((row, i) => ({ row, n: i + 1 })).filter(({ row }) => isVisible(row));

    const body = visible
      .map(({ row, n }) => {
        const warm = kindCol && row.cells[kindCol.id] === WARMUP;
        return `<tr${warm ? ' class="warmup"' : ''}>
          <th class="rownum"><button data-action="row-menu" data-id="${row.id}" aria-label="Možnosti řádku ${n}">
            <span>${n}</span><span class="dots">⋯</span>
          </button></th>
          ${table.columns.map((c) => `<td>${cellInput(c, row)}</td>`).join('')}
        </tr>`;
      })
      .join('');

    const empty = table.rows.length === 0
      ? `<tr><td class="empty" colspan="${table.columns.length + 1}">Zatím prázdné – zapiš první cvik v Trénincích.</td></tr>`
      : '';

    $sheet.innerHTML = `<thead><tr><th class="rownum corner">#</th>${head}</tr></thead><tbody>${body}${empty}</tbody>`;
    $count.textContent = query.length ? `${visible.length} z ${table.rows.length}` : '';
  }

  function focusCell(rowId, colId) {
    const $input = $sheet.querySelector(`[data-row="${rowId}"][data-col="${colId}"]`);
    if ($input) {
      $input.focus();
      $input.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  // ---------- Nabídka (⋯) ----------
  // items: { label, action, id, value, active, danger, disabled } nebo { heading }
  function openMenu(title, items) {
    const buttons = items
      .map((it) =>
        it.heading
          ? `<p class="menu-heading">${escapeHtml(it.heading)}</p>`
          : `<button class="menu-item${it.danger ? ' danger' : ''}${it.active ? ' active' : ''}"
               data-action="${it.action}" data-id="${it.id ?? ''}" data-value="${it.value ?? ''}"
               ${it.disabled ? 'disabled' : ''}>${it.label}</button>`
      )
      .join('');
    $menu.innerHTML = `<div class="menu-body">
      <p class="menu-title">${escapeHtml(title)}</p>${buttons}
      <button class="menu-item cancel" data-action="close-menu">Zavřít</button>
    </div>`;
    $menu.showModal();
  }

  // ---------- Akce (tlačítka a položky nabídek) ----------
  function addColumn(type) {
    const options = type === 'choice' ? askOptions() : undefined;
    if (type === 'choice' && !options) return;
    remember();
    const col = { id: newId(), name: 'Nový sloupec', type, options };
    table.columns.push(col);
    draw();
    save();
    const $head = $sheet.querySelector(`[data-head="${col.id}"]`);
    $head.focus();
    $head.select();
  }

  function setColumnType(id, type) {
    const col = table.columns.find((c) => c.id === id);
    const options = type === 'choice' ? askOptions(col.options) : undefined;
    if (type === 'choice' && !options) return;
    remember();
    col.type = type;
    if (options) col.options = options;
    draw();
    save();
  }

  // Posun řádku o jeden viditelný řádek (při hledání přeskočí skryté)
  function moveRow(id, dir) {
    const visible = table.rows.filter(isVisible);
    const vi = visible.findIndex((r) => r.id === id);
    const neighbor = visible[vi + dir];
    if (!neighbor) return;
    remember();
    swap(table.rows, table.rows.indexOf(visible[vi]), table.rows.indexOf(neighbor));
    draw();
    save();
  }

  const actions = {
    undo: () => restore(undoStack, redoStack),
    redo: () => restore(redoStack, undoStack),
    'close-menu': () => {},

    'add-row': () => {
      remember();
      const row = newRow(table);
      table.rows.unshift(row);
      setSearch('');
      draw();
      save();
      $sheet.parentElement.scrollTop = 0;
      const col = role('exercise') || table.columns.find((c) => c.type !== 'date');
      if (col) focusCell(row.id, col.id);
    },

    'add-col': () =>
      openMenu('Nový sloupec', [
        { heading: 'Typ sloupce' },
        ...TYPES.map((t) => ({ label: t.label, action: 'add-col-type', value: t.value })),
      ]),
    'add-col-type': (id, value) => addColumn(value),

    'col-menu': (id) => {
      const i = table.columns.findIndex((c) => c.id === id);
      const col = table.columns[i];
      openMenu(`Sloupec „${col.name}"`, [
        { label: '← Posunout vlevo', action: 'col-move', id, value: -1, disabled: i === 0 },
        { label: 'Posunout vpravo →', action: 'col-move', id, value: 1, disabled: i === table.columns.length - 1 },
        { heading: 'Typ sloupce' },
        ...TYPES.map((t) => ({ label: t.label, action: 'col-type', id, value: t.value, active: col.type === t.value })),
        { label: 'Smazat sloupec', action: 'del-col', id, danger: true },
      ]);
    },
    'col-move': (id, value) => {
      const i = table.columns.findIndex((c) => c.id === id);
      remember();
      swap(table.columns, i, i + Number(value));
      draw();
      save();
    },
    'col-type': (id, value) => setColumnType(id, value),
    'del-col': (id) => {
      remember();
      table.columns = table.columns.filter((c) => c.id !== id);
      for (const r of table.rows) delete r.cells[id];
      draw();
      save();
    },

    'row-menu': (id) => {
      const visible = table.rows.filter(isVisible);
      const vi = visible.findIndex((r) => r.id === id);
      const n = table.rows.findIndex((r) => r.id === id) + 1;
      openMenu(`Řádek ${n}`, [
        { label: '⧉ Kopírovat – další série', action: 'copy-row', id },
        { label: '↑ Posunout nahoru', action: 'row-move', id, value: -1, disabled: vi === 0 },
        { label: '↓ Posunout dolů', action: 'row-move', id, value: 1, disabled: vi === visible.length - 1 },
        { label: 'Smazat řádek', action: 'del-row', id, danger: true },
      ]);
    },
    // Kopie jde hned pod originál – jako další série stejného cviku
    'copy-row': (id) => {
      const i = table.rows.findIndex((r) => r.id === id);
      remember();
      const copy = { id: newId(), t: Date.now(), cells: { ...table.rows[i].cells } };
      table.rows.splice(i + 1, 0, copy);
      draw();
      save();
      const reps = role('reps');
      if (reps) focusCell(copy.id, reps.id);
    },
    'row-move': (id, value) => moveRow(id, Number(value)),
    'del-row': (id) => {
      remember();
      table.rows = table.rows.filter((r) => r.id !== id);
      draw();
      save();
    },
  };

  // ---------- Události ----------
  function onEdit(t) {
    if (editing !== t) {
      remember(); // první změna v této buňce = nový krok v historii
      editing = t;
    }
    if (t.dataset.head) {
      table.columns.find((c) => c.id === t.dataset.head).name = t.value;
    } else {
      table.rows.find((r) => r.id === t.dataset.row).cells[t.dataset.col] = t.value;
    }
    save();
  }

  $root.addEventListener('input', (ev) => {
    const t = ev.target;
    if (t === $search) {
      setSearch(t.value);
      draw();
    } else if (t.tagName !== 'SELECT' && (t.dataset.head || t.dataset.row)) {
      onEdit(t);
    }
  });

  // Výběr (select) hlásí změnu přes 'change'
  $root.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.tagName !== 'SELECT' || !t.dataset.row) return;
    onEdit(t);
    editing = null;
    if (t.dataset.col === role('kind')?.id) t.closest('tr').classList.toggle('warmup', t.value === WARMUP);
  });

  // Odchod z buňky ukončí "psaní" – další změna v ní bude nový krok Zpět
  $root.addEventListener('focusout', () => (editing = null));

  // Enter = o buňku níž (jako v Excelu)
  $root.addEventListener('keydown', (ev) => {
    const t = ev.target;
    if (ev.key !== 'Enter' || !t.dataset.row) return;
    ev.preventDefault();
    const $rows = [...$sheet.querySelectorAll('tbody tr')];
    const $next = $rows[$rows.indexOf(t.closest('tr')) + 1]?.querySelector(`[data-col="${t.dataset.col}"]`);
    if ($next) $next.focus();
    else t.blur();
  });

  $root.addEventListener('click', (ev) => {
    // Klepnutí vedle nabídky ji zavře
    if (ev.target === $menu) return $menu.close();
    const btn = ev.target.closest('[data-action]');
    if (!btn) return;
    if ($menu.contains(btn)) $menu.close();
    actions[btn.dataset.action]?.(btn.dataset.id, btn.dataset.value);
  });

  setSearch(search);
  draw();
}
