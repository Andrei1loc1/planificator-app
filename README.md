# Planificator Săptămânal

Aplicație web pentru planificarea activităților săptămânale. Design modern, dark mode, PWA cu suport offline complet.

## Caracteristici

- **Vizualizare săptămânală** - 7 zile pe ecran cu navigare ușoară între săptămâni
- **Drag & Drop** - mută taskurile între zile sau reordonează-le în aceeași zi
- **Categorii** - Muncă, Curs, Hobby, Personal (fiecare cu culoare distinctă)
- **Filtrare pe zi** - apeși pe o zi pentru a vedea doar taskurile aceleia
- **PWA** - funcționează fullscreen pe telefon, lucrează offline
- **Stocare locală** - datele persistă în localStorage

## Tech Stack

- React 19
- Vite
- Vite PWA Plugin
- CSS modern (CSS Variables)

## Start rapid

```bash
npm install
npm run dev
```

## Build PWA

```bash
npm run build
npm run preview
```

După build, accesezi din browser și instalezi ca aplicație (butonul "Adaugă la Ecran" pe iOS, sau instalezi pe Android).

## Structura proiectului

```
src/
├── App.jsx    # Componenta principală
├── App.css    # Stiluri
└── main.jsx   # Entry point
```

## Licență

MIT