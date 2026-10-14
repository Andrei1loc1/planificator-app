# „Azi" + Taskuri Repetitive — Design

## Intent & Why

Planificatorul actual e un tablou săptămânal bun pentru *planificare*, dar pe telefon,
în timpul zilei, utilizatorul vrea răspunsuri instant: *ce fac acum, ce urmează, cât mai
am până la următorul task, ce am de făcut azi*. Pe lângă asta, taskurile care se repetă
(sala de 2–3 ori pe săptămână, plăți lunare) trebuie să apară singure, fără copiere manuală,
și să fie vizibile dintr-o privire.

## Goals

1. **Vederea „Azi"** (dashboard zilnic, ecranul implicit):
   - taskul curent evidențiat, cu timp rămas
   - următorul task cu countdown live („Ședință în 45 min")
   - lista zilei pe ore: trecutele estompează singure, bifabile manual
   - bară de progres („4 din 7 bifate")
   - ferestre de timp liber („liber 14:00–15:30")
   - avertisment la conflicte de ore (suprapuneri)
   - sumar de dimineață: „Azi: 6 taskuri, primul la 09:00, cel mai ocupat 10:00–13:00"
   - secțiune „Repetitive": ce vine curând („Chirie — pe 1, peste 5 zile")
2. **Taskuri repetitive**:
   - la adăugare: „Se repetă: nu / săptămânal / lunar"
   - săptămânal: bifezi zilele din săptămână (L–D)
   - lunar: pe data de X (1–31); lunile fără data respectivă → nu apare
   - iconiță de repetare pe card; instanțe generate automat, nu copiate
   - modificare/ștergere → se aplică **peste tot** (fără excepții per-zi)
   - bifarea unei instanțe e per-zi (doneDates), nu afectează celelalte zile
3. **Vederea „Săptămâna"** — existentă, rămâne pentru planificare; primește instanțele
   repetitive în coloane + badge de conflict.
4. **Navigare maxim simplă**: exact două tab-uri — „Azi" și „Săptămâna".
   - telefon: bară fixă jos (la deget)
   - laptop: aceleași tab-uri sus
   - aplicația deschide mereu „Azi"
   - în „Azi": săgeți ← → lângă dată pentru ziua precedentă/următoare (peek mâine/ieri)

## Non-goals / Anti-goals

- fără notificări, taskuri favorite, mod focus, statistici/streak-uri
- fără conturi sau backend — totul rămâne în localStorage
- fără bifare în vederea săptămânală (estompare/bifare sunt comportament al view-ului „Azi")
- taskurile repetitive nu se trag cu drag&drop (mutarea unei instanțe virtuale nu are sens)

## Decizii de design (ale mele, marcate; restul — de la utilizator)

- **Fade rule**: un task e estompat dacă e bifat SAU intervalul lui a trecut complet.
  Task fără oră de final = durată implicită **60 min**.
- **Task curent**: `start <= acum < sfârșit` (cu durata implicită de mai sus).
- **Conflict**: două taskuri cu ore suprapuse (intervale `[start, end)`). `end <= start`
  (ex. 23:00–01:00) = interval invalid, ignorat la conflict/ferestre libere.
- **Taskuri fără oră**: mersi la coada listei; nu intră în conflicte, curent, următor,
  ferestre libere, digest.
- **Ferestre libere**: goluri ≥ 30 min între intervale ocupate, în interiorul zilei ocupate.
- **Sumar „cel mai ocupat"**: cel mai lung interval continuu ocupat (intervale fuzionate).
- **Storage**: `planner_v2` rămâne neschimbat pentru taskuri normale (+ `done: true` per task);
  repetitivele stau separat în `planner_recurring_v1` ca tipare, cu `doneDates` per zi.
  Datele vechi se încarcă fără migrație.
- Weekly preselectează ziua din care deschizi modalul.

## Data model

```js
// task normal (în planner_v2, existent)
{ id: number, title, type, time, endTime, done?: true }

// task repetitiv (template, în planner_recurring_v1)
{ id: number,            // din același contor nextId ca taskurile normale
  title, type, time, endTime,
  repeat: 'weekly' | 'monthly',
  days?: number[]        // 0=Luni..6=Duminică (weekly)
  dayOfMonth?: number,   // 1..31 (monthly)
  doneDates?: string[]   // 'YYYY-MM-DD'
}

// instanță generată la runtime (nu se stochează)
{ id: 'r<templateId>' (string), recurringId: templateId, title, type, time, endTime, repeat, done }
```

## Tech

React 19 + Vite 6, aceleași variabile CSS / limbaj vizual. Teste noi: Vitest, doar
funcții pure (lib-uri). Componentele se verifică prin build + smoke manual.