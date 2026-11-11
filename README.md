# Narcis

Osobní progress journal – nová verze, stavíme od začátku krok po kroku.
Čisté HTML, CSS a JavaScript, data jen v zařízení, funguje po přidání na plochu iPhonu.

## Struktura

```
narcis/
├── index.html             kostra stránky + nastavení pro iPhone
├── manifest.webmanifest   název, ikona a režim "aplikace" pro přidání na plochu
├── sw.js                  offline režim (uložení souborů appky v telefonu)
├── css/
│   ├── theme.css          VŠECHNY barvy jako proměnné (témata)
│   └── style.css          rozložení a stavební prvky ve stylu Stravy
├── js/
│   ├── app.js             spodní lišta a přepínání stránek (#/gym)
│   ├── icons.js           ikony (SVG přímo v kódu)
│   ├── toast.js           krátké oznámení dole
│   └── pages/
│       └── home.js        home page: Narcis + datum, zkratky, Dnes
├── icons/                 ikony appky (PNG)
└── tools/
    ├── serve.ps1          mini server pro testování na PC
    └── make-icons.ps1     znovu vygeneruje ikony
```

## Spuštění na počítači

```
powershell -ExecutionPolicy Bypass -File tools\serve.ps1
```

Pak otevři http://localhost:8080 (ukončení: Ctrl+C).

## Po změně souborů

Zvyš verzi `CACHE` v `sw.js` (`narcis-v1` → `narcis-v2`), jinak telefon drží starou verzi.

## Stará verze

První verze (Gym: tréninky, plány, partie, fotky, progres) je v gitu pod štítkem `stara-verze`.

```
git show stara-verze --stat
git checkout stara-verze -- js/spoken-entry.js
```
