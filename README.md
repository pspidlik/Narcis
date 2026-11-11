# Narcis

Osobní progress journal. PWA bez serveru – všechna data zůstávají v zařízení (IndexedDB).

## Struktura

```
narcis/
├── index.html             kostra stránky + nastavení pro iPhone
├── manifest.webmanifest   název, ikona a režim "aplikace" pro instalaci
├── sw.js                  service worker – offline režim (cache souborů)
├── css/
│   ├── theme.css          VŠECHNY barvy jako proměnné (témata)
│   └── style.css          rozložení a vzhled, barvy bere z theme.css
├── js/
│   ├── routes.js          seznam kategorií a podzáložek
│   ├── app.js             přepínání stránek podle adresy (#/gym/pumpa)
│   ├── db.js              ukládání do IndexedDB
│   ├── utils.js           drobné sdílené pomocné funkce
│   ├── quick-entry.js     rychlý zápis "bench press 80kg 8/8/6" → série
│   ├── spoken-entry.js    mluvený zápis "bench press 3 série po 8, 60 kilo"
│   ├── gym-data.js        data gymu: tréninky, objem, "minule", partie, cíle
│   ├── images.js          zmenšení fotek a odkazy pro zobrazení
│   ├── camera.js          fotoaparát s overlayem minulé fotky a samospouští
│   ├── toast.js           krátké oznámení dole
│   └── views/
│       ├── gym-log.js     Gym → Tabulka: přepínač Tréninky | Přehled | Tabulka
│       ├── workouts.js    seznam a detail tréninků (jako Strava)
│       ├── overview.js    Přehled: Co dnes?, pauzy partií, týden po partiích, cíle
│       ├── plans.js       ⚙ plány tréninků a cviky (partie, rozsah opakování)
│       ├── pump.js        Gym → Pumpa: fotky kdykoliv
│       ├── progress.js    Gym → Progres: check-iny, porovnání, časová osa
│       └── table.js       všechny série jako tabulka v Excelu
├── icons/                 ikony appky (PNG)
└── tools/
    ├── serve.ps1          mini server pro testování na PC
    └── make-icons.ps1     znovu vygeneruje ikony
```

## Spuštění na počítači

```
powershell -ExecutionPolicy Bypass -File tools\serve.ps1
```

Pak otevři http://localhost:8080. Ukončení: Ctrl+C.
(`-ExecutionPolicy Bypass` povolí spuštění skriptu jen pro tento jeden příkaz.)

## Na iPhone

Service worker a instalace na plochu vyžadují **HTTPS**, takže appku je potřeba
nahrát na hosting (např. GitHub Pages – zdarma). Pak v Safari: Sdílet → Přidat na plochu.

## Po změně souborů

Zvyš verzi `CACHE` v `sw.js` (`narcis-v1` → `narcis-v2`), jinak telefon drží starou verzi.
