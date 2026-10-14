# „Azi" + Taskuri Repetitive — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un view „Azi" (dashboard zilnic cu countdown, progres, ferestre libere, conflicte, bifare) + taskuri repetitive săptămânal/lunar + navigare cu 2 tab-uri.

**Architecture:** Codul curent din `src/App.jsx` (monolit) se împarte în: funcții pure testabile în `src/lib/`, componente prezentationale în `src/components/`, iar `App.jsx` devine shell-ul care ține starea + navigarea. Instanțele repetitive sunt generate virtual din tipare (nu se copiază în store).

**Tech Stack:** React 19, Vite 6, localStorage, Vitest (nou, doar pentru funcții pure).

**Spec:** `docs/superpowers/specs/2026-10-14-azi-recurring-design.md`

## Global Constraints

- Fără comentarii în cod. Fără emoji în UI. Toate etichetele UI în română.
- Reutilizăm variabilele CSS existente (`var(--work)` etc.) și stilul vizual curent (dark, border-radius 10–20px, fonturi DM).
- `planner_v2` (taskuri normale) rămâne compatibil cu datele existente; repetitivele în cheia nouă `planner_recurring_v1`.
- Zilele săptămânii: index 0=Luni … 6=Duminică (conversie din `Date.getDay()` cu `(d.getDay()+6)%7`).
- Task fără `endTime` = durată implicită 60 min (`DEFAULT_DURATION`).
- La finalul fiecărui task: `npm run build` trebuie să treacă (Task-urile 2–6 nu ating `App.jsx`, deci build-ul rămâne verde cât timp compilarea fișierelor noi e validă — fișierele noi nefiind importate de App decât la Task 7, build-ul le ignoră; verificarea reală e `npx vitest run` pe teste + build).

## Review Focus

1. **Task doar cu oră de început** — fade/current folosesc durata implicită 60 min, nu rămâne „curent" toată ziua. Test: `day.test.js > current & isPast with start-only task`.
2. **Lunar pe 31 în luni scurte** — nu aruncă niciodată erori și nu apare în februarie pe 30/31. Test: `recurring.test.js > monthly on 31 skips short months`.
3. **Taskuri fără oră** — nu intră în conflicte/ferestre/curent/următor/digest și stau la coadă. Test: `day.test.js > timeless tasks excluded from time logic`.
4. **Interval invalid (23:00–01:00, end <= start)** — ignorat la conflict/ferestre, nu crash. Test: `day.test.js > invalid interval ignored`.
5. **Bifarea unei instanțe repetitive într-o zi** — nu bifează instanța în alte zile. Test: `recurring.test.js > doneDates per-day isolation`.

---

### Task 1: Fundație — Vitest + `src/lib/dates.js` + `src/lib/types.js` *(val A — blocant pentru restul)*

**Files:**
- Create: `src/lib/dates.js`, `src/lib/dates.test.js`, `src/lib/types.js`
- Modify: `package.json` (devDependency vitest, script `"test": "vitest run"`)

**Interfaces:**

`src/lib/types.js` exportă:
- `TYPE`: obiectul existent din App.jsx, mutat ca atare (work, course, hobby, personal, health, learn, rest — cu `color`, `bg`, `label` identice).

`src/lib/dates.js` exportă (toate mutate din App.jsx, signaturi neschimbate, plus noile):
- `DAYS: string[]`, `MONTHS: string[]` (mutate din App.jsx)
- `dateKey(d: Date): string` → `'YYYY-MM-DD'` (ora locală)
- `parseDateKey(key: string): Date` → zi la 00:00 ora locală
- `getISOWeek(d: Date): number`, `getMonday(offset: number): Date`, `getDates(offset: number): Date[]`, `isToday(d: Date): boolean`, `getWeekKey(offset: number): string`, `getDayKey(weekOffset: number, dayIdx: number): string`, `formatWeekRange(offset: number): string` — mutate din App.jsx, comportament identic
- `minutesFromHHMM(s: string): number | null` — `'14:30'` → `870`; `''`/invalid → `null`
- `hhmmFromMinutes(m: number): string` — `870` → `'14:30'` (rotunjit la minut)
- `weekOffsetForDate(d: Date): number` — 0 pentru zilele săptămânii curente, ±N pentru celelalte (relativ la `getMonday(0)`)
- `formatDateLong(d: Date): string` — `'Miercuri, 14 oct 2026'`
- `formatDateShort(d: Date): string` — `'14 oct'`
- `daysBetween(a: Date, b: Date): number` — număr întreg de zile de la `a` la `b` (ambele la miezul nopții)

- [ ] **Step 1: Instalează Vitest și adaugă scriptul de test**

```bash
npm install -D vitest
```

`package.json` → `"scripts": { ..., "test": "vitest run" }`

- [ ] **Step 2: Scrie testele care eșuează pentru funcțiile NOI** (cele mutate din App.jsx nu se re-testează, doar noile: `dateKey`, `parseDateKey`, `minutesFromHHMM`, `hhmmFromMinutes`, `weekOffsetForDate`, `daysBetween`, `formatDateShort`, `formatDateLong`)

`src/lib/dates.test.js` — fixture central: `const D = new Date(2026, 9, 14)` (miercuri, 14 oct 2026). Exemple de asserții:
- `dateKey(D) === '2026-10-14'`; `parseDateKey('2026-10-14').getDate() === 14` (ora locală)
- `minutesFromHHMM('14:30') === 870`; `minutesFromHHMM('') === null`; `minutesFromHHMM('abc') === null`
- `hhmmFromMinutes(870) === '14:30'`
- `daysBetween(new Date(2026,9,14), new Date(2026,9,19)) === 5`
- `weekOffsetForDate(new Date(2026,9,12)) === 0` (luni aceeași săptămână), `weekOffsetForDate(new Date(2026,9,19)) === 1`
- `formatDateShort(new Date(2026,9,14)) === '14 oct'`
- `formatDateLong(new Date(2026,9,14)) === 'Miercuri, 14 oct 2026'`

- [ ] **Step 3: Rulează testele și verifică că eșuează** — `npx vitest run` → FAIL (modulul nu există)

- [ ] **Step 4: Implementează `src/lib/dates.js` și `src/lib/types.js`** — mută din `src/App.jsx` helper-ele enumerate, fără a le modifica; scrie funcțiile noi. `types.js` primește obiectul `TYPE` copiat identic din App.jsx:6-19.

- [ ] **Step 5: Rulează testele și verifică că trec** — `npx vitest run` → PASS

- [ ] **Step 6: Build de verificare** — `npm run build` → SUCCESS (App.jsx nu e atins)

- [ ] **Step 7: Commit** — `git add -A; git commit -m "lib: dates + types + vitest"`

---

### Task 2: `src/lib/recurring.js` — logica tiparelor repetitive *(val B1, paralel cu Task 3)*

**Files:**
- Create: `src/lib/recurring.js`, `src/lib/recurring.test.js`

**Interfaces:**
- Consumes: `dates.js` → `dateKey(d)`, `daysBetween(a,b)`, `DAYS`
- Produces:
  - `matchesDate(r: RecurringTask, date: Date): boolean` — weekly: `r.days` conține `(date.getDay()+6)%7`; monthly: `date.getDate() === r.dayOfMonth` (luni fără ziua respectivă → false, nu aruncă)
  - `instancesOnDate(list: RecurringTask[], date: Date): Instance[]` — returnează instanțe NESORTATE: `{ id: 'r' + r.id (string), recurringId: r.id, title, type, time, endTime, repeat: r.repeat, done: (r.doneDates || []).includes(dateKey(date)) }` (template id = number, din același contor `nextId` ca taskurile normale)
  - `nextOccurrences(list: RecurringTask[], fromDate: Date, count: number): { r: RecurringTask, date: Date, daysUntil: number }[]` — scanează maxim 62 zile în viitor, ordonate crescător după dată, `daysUntil = daysBetween(fromDate, date)`; include și aparițiile de `fromDate` (daysUntil 0); taskuri de la aceeași dată ordonate după oră
  - `markRecurringDone(list: RecurringTask[], templateId: string, dateKeyStr: string): RecurringTask[]` — imutabil, comută apartenența datei în `doneDates` (sortat ascendent); nu atinge celelalte zile

- [ ] **Step 1: Teste care eșuează** (`src/lib/recurring.test.js`):
  - `matchesDate` weekly: template `{repeat:'weekly', days:[2,4]}` → true pentru vineri (`new Date(2026,9,16)`), false pentru marți
  - `matchesDate` monthly: `{repeat:'monthly', dayOfMonth:14}` → true pe 14 oct; `dayOfMonth:31` → false pe `new Date(2026,1,28)` (februarie 2026, fără 31) — fără eroare
  - `instancesOnDate`: instanța are `id === 'r-7'` când `r.id === 7`, `done === true` doar dacă `doneDates` include `dateKey(date)`
  - `nextOccurrences`: pentru sala `{repeat:'weekly', days:[0,2,4]}` din `new Date(2026,9,14)` (miercuri) → prima apariție e 14 oct (daysUntil 0), a doua 16 oct (daysUntil 2)
  - `markRecurringDone` (Review Focus #5): done pe 14 oct NU apare pe 15 oct; a doua apelare pe aceeași dată elimină data (toggle)
  - Review Focus #2: `nextOccurrences` cu `dayOfMonth:31` nu crashuiește pornind din februarie

- [ ] **Step 2: Verifică eșecul** — `npx vitest run` → FAIL
- [ ] **Step 3: Implementează `src/lib/recurring.js`** — doar funcțiile din Interfaces; fără dependențe de alte fișiere din proiect în afară de `dates.js`
- [ ] **Step 4: Verifică trecerea** — `npx vitest run` → PASS (și testele Task 1)
- [ ] **Step 5: Build** — `npm run build` → SUCCESS
- [ ] **Step 6: Commit** — `git add src/lib/recurring.js src/lib/recurring.test.js; git commit -m "lib: recurring"`

---

### Task 3: `src/lib/day.js` — analiza zilei *(val B2, paralel cu Task 2)*

**Files:**
- Create: `src/lib/day.js`, `src/lib/day.test.js`

**Interfaces:**
- Consumes: `dates.js` → `minutesFromHHMM`
- Produce (operă pe taskuri `{ id, title, type, time, endTime, done?, repeat? }`; `now` = minute din zi, ex. 870):
  - `DEFAULT_DURATION = 60`
  - `sortByTime(tasks): Task[]` — cu oră, crescător după `minutesFromHHMM(time)`; fără oră la coadă (stabil)
  - `endMinutes(t): number | null` — `endTime` valid (`> time`) → alea; altfel `time + DEFAULT_DURATION`; fără oră → `null`
  - `conflictIds(tasks): Set` — id-urile aflate în ≥1 suprapunere (ambele cu oră, intervale valide `[start, end)`)
  - `freeWindows(tasks, minMinutes = 30): { start: number, end: number }[]` — goluri între intervalele ocupate fuzionate, ≥ minMinutes; fără taskuri cu oră → `[]`
  - `currentTask(tasks, now): Task | null` — `start <= now < end`; Review Focus #1 & #4
  - `nextTask(tasks, now): Task | null` — primul cu `start > now`
  - `isPast(t, now): boolean` — `end < now` (cu durata implicită pentru start-only)
  - `progress(tasks): { done: number, total: number }` — `done` numără taskurile cu `done === true`
  - `busiestWindow(tasks): { start: number, end: number } | null` — cel mai lung interval continuu ocupat

- [ ] **Step 1: Teste care eșuează** (`src/lib/day.test.js`) — folosește `minutesFromHHMM` din dates:
  - `sortByTime`: `'09:00' < '14:30'`, cele fără oră la coadă
  - Review Focus #1: task start-only `'14:00'` → `currentTask(..., 14:15) === task`, `currentTask(..., 15:30) === null`, `isPast(task, 15:30) === true`, `isPast(task, 14:30) === false`
  - Review Focus #3: task fără oră → nu apare în `conflictIds`, `currentTask`, `nextTask`, `freeWindows`, `busiestWindow`
  - Review Focus #4: `'23:00'`–`'01:00'` (end <= start) → `endMinutes` = 23:00+60, nu în `conflictIds` cu un task 23:30, nu creează fereastră
  - `conflictIds`: 09:00–10:00 vs 09:30–11:00 → ambele id-uri în set; 09:00–10:00 vs 10:00–11:00 → set gol (capetele nu se ating)
  - `freeWindows`: taskuri 09:00–10:00 și 14:00–15:00 → `[{start: 600, end: 840}]` (4h liber); gap de 20 min → nu apare (sub min 30)
  - `nextTask`: la now=600 → taskul 14:00, nu 09:00 (trecut) și nu cel fără oră
  - `busiestWindow`: 09:00–10:00 + 09:30–12:00 → `{start: 540, end: 720}` (fuzionate, 3h)
  - `progress`: 2 din 3 bifate → `{done: 2, total: 3}`

- [ ] **Step 2: Verifică eșecul** — `npx vitest run` → FAIL
- [ ] **Step 3: Implementează `src/lib/day.js`**
- [ ] **Step 4: Verifică trecerea** — `npx vitest run` → PASS
- [ ] **Step 5: Build** — `npm run build` → SUCCESS
- [ ] **Step 6: Commit** — `git add src/lib/day.js src/lib/day.test.js; git commit -m "lib: day analysis"`

---

### Task 4: `src/components/Modal.jsx` — cu „Se repetă" *(val C1, paralel cu Task 5 și 6)*

**Files:**
- Create: `src/components/Modal.jsx`

**Interfaces:**
- Consumes: `dates.js` → `DAYS`; `types.js` → `TYPE`
- Produces: `function Modal({ isOpen, mode, task, dayIdx, dayLabel, isRecurring, onClose, onSave })`
  - `mode: 'add' | 'edit'`; `task` = task normal sau tipar recurrent; `isRecurring: boolean` (edit al unui tipar); `dayLabel: string` (titlu la add, ex. `'Miercuri'`)
  - `onSave` primește:
    - normal: `{ title, type, time, endTime }` (exact ca acum)
    - repetitiv: `{ title, type, time, endTime, repeat: 'weekly'|'monthly', days: number[], dayOfMonth: number }`
  - Stare internă: title/type/time/endTime (ca acum) + `repeat: 'nu'|'weekly'|'monthly'`, `days: number[]`, `dayOfMonth: number`
  - La deschidere add: `repeat='nu'`, `days=[dayIdx]` (ziua din care s-a deschis), `dayOfMonth=1`; la edit: prefill din `task` (pentru recurrent: `task.repeat`, `task.days`, `task.dayOfMonth`)
  - UI „Se repetă": 3 butoane radio-stil; weekly → 7 chip-uri L M M J V S D (toggle); monthly → input number 1–31 (clamp)
  - Enter salvează (ca acum); validare: titlu non-gol; `repeat === 'nu'` → salvare identică cu formatul actual
  - Etichete: „Nu", „Săptămânal", „Lunar", „Se repetă", „Zilele", „Ziua din lună"

- [ ] **Step 1: Implementează componenta** — JSX + logică din Interfaces; fără CSS nou în afarul claselor existente din `App.css` (`.field`, `.field-row`, `.modal-btns`, `.mbtn`) + clase noi necesare: adaugă-le în `src/App.css` la final, în secțiuni marcate `.repeat-*` (ex. `.repeat-opts`, `.repeat-opt`, `.repeat-opt.active`, `.day-chips`, `.day-chip`, `.day-chip.active`) — stil discret, dark, în ton cu `.mbtn`
- [ ] **Step 2: Build** — `npm run build` → SUCCESS (componenta nu e importată încă)
- [ ] **Step 3: Commit** — `git add src/components/Modal.jsx src/App.css; git commit -m "component: modal with repeat"`

---

### Task 5: `src/components/TaskCard.jsx` + `src/components/WeekView.jsx` *(val C2, paralel cu Task 4 și 6)*

**Files:**
- Create: `src/components/TaskCard.jsx`, `src/components/WeekView.jsx`
- Modify: `src/App.css` (DOAR adăugiri la final: `.card-repeat`, `.card-conflict`, `.card-fade`, `.card-check`)

**Interfaces:**
- Consumes: `types.js` → `TYPE`; `day.js` → `isPast` (pentru fade în varianta day)
- TaskCard — `function TaskCard({ task, variant = 'week', now, conflict, onEdit, onDelete, onToggleDone, onDragStart, onDragEnd, onDragOver, onDrop })`
  - variant `week`: comportamentul actual al cardului (drag activ doar dacă `!task.repeat`; instanțele repetitive au `draggable={false}`)
  - variant `day`: checkbox în stânga (`onToggleDone(task)`), fade când `task.done || (now != null && isPast(task, now))` (clasa `.card-fade`), badge conflict (`.card-conflict`, iconiță „!"), fără drag
  - ambele: iconiță de repetare (`.card-repeat`) dacă `task.repeat` — SVG simplu cu 2 săgeți rotunde
  - interval: `task.time`–`task.endTime` format exact ca acum; `title` se randează ca text React (`{task.title}`, fără `escHtml`)
- WeekView — `function WeekView({ dates, getDayTasks, activeDayFilter, onFilterDay, onAdd, onEdit, onDelete, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onTaskDragOver, onTaskDrop })`
  - mută din App.jsx: days-strip (pills cu filtrare → `onFilterDay(i)`), legenda cu 7 tipuri, componentele `Column` și grid-ul; păstrează clasele CSS existente
  - `getDayTasks(dayIdx): Task[]` — primit gata fuzionat+sortat de App (regular + instanțe repetitive)
  - per zi: `conflictIds = day.conflictIds(tasks)`; pasă `conflict={conflictIds.has(task.id)}` la TaskCard
  - taskurile repetitive din coloană: aceleași butoane edit/delete → `onEdit(task)`/`onDelete` decide App-ul după `task.recurringId`
  - count-ul din coloană (`col-count`) numără toate taskurile, inclusiv repetitive

- [ ] **Step 1: Implementează `TaskCard.jsx`** (conform Interfaces)
- [ ] **Step 2: Implementează `WeekView.jsx`** (conform Interfaces)
- [ ] **Step 3: Adaugă în `src/App.css`** doar clasele noi enumerate la Files — în stilul existent
- [ ] **Step 4: Build** — `npm run build` → SUCCESS
- [ ] **Step 5: Commit** — `git add src/components/TaskCard.jsx src/components/WeekView.jsx src/App.css; git commit -m "component: taskcard + weekview"`

---

### Task 6: `src/components/DayView.jsx` — dashboard-ul „Azi" *(val C3, paralel cu Task 4 și 5)*

**Files:**
- Create: `src/components/DayView.jsx`, `src/components/DayView.css`

**Interfaces:**
- Consumes: `dates.js` → `DAYS`, `formatDateLong`, `formatDateShort`; `types.js` → `TYPE`; `day.js` → `sortByTime, endMinutes, conflictIds, freeWindows, currentTask, nextTask, isPast, progress, busiestWindow, DEFAULT_DURATION`; `recurring.js` → `nextOccurrences`; `TaskCard.jsx` (variant `day`)
- Produce: `function DayView({ date, tasks, recurring, dayOffset, onPrevDay, onNextDay, onAdd, onEdit, onDelete, onToggleDone, onDeleteRecurring })`
  - ceas intern: `useState(() => new Date())` + `setInterval` 15000ms, cleanup la unmount; `now = date-is-same-day ? h*60+m : null` (pentru alte zile decât azi, fără fade/countdown pe „acum")
  - **header**: `DAYS[(date.getDay()+6)%7]` + `formatDateLong(date)`, badge „Azi" dacă e azi, săgeți ← → (`onPrevDay`/`onNextDay`), buton „+ Adaugă task" (`onAdd`)
  - **sumar (digest)**: `Azi: 6 taskuri, primul la 09:00, cel mai ocupat 10:00–13:00` — valorile din `progress`, `nextTask(tasks, 0)`, `busiestWindow`; fără taskuri cu oră → „Azi: 0 taskuri"
  - **bară de progres**: `progress.done / progress.total`, text „4 din 7 bifate"; 0 taskuri → bară goală + „Nimic planificat azi"
  - **panou acum/următor**: taskul curent (titlu + „mai are X min" din `endMinutes - now`); altfel următorul („începe în Y min"); X/Y recompute la fiecare tick; fără taskuri cu oră → panoul nu apare
  - **ferestre libere**: chip-uri „Liber 14:00–15:30" din `freeWindows(tasks)`, afișate sub panoul acum/următor
  - **lista zilei**: `tasks` primit deja sortat de App; pentru fiecare `TaskCard variant="day"` cu `now`, `conflict`, `onToggleDone`; taskurile `repeat` au edit/delete → `onEdit(task)` / `onDelete` (App decide după `recurringId`); dacă `dayOffset !== 0`, adăugarea (`onAdd`) primește data corectă de la App
  - **secțiunea „Repetitive"**: `nextOccurrences(recurring, date, 5)` → rânduri `{title} — {formatDateShort(date)} (azi|mâine|peste N zile)` + butoanele edit/delete → `onEdit(occurrence.r)` / `onDeleteRecurring(r.id)`; titlu secundar „Ce vine curând"
- `DayView.css`: stiluri pentru `.dayview`, `.day-head`, `.day-arrows`, `.day-digest`, `.day-progress`, `.day-now`, `.day-free`, `.day-list`, `.day-recurring` — același limbaj vizual (dark, `--surface`, `--border2`, radius 10–20px); layout mobil-first (max-width 640px pe telefon centrat, 900px pe laptop)

- [ ] **Step 1: Implementează `DayView.jsx` + `DayView.css`** conform Interfaces
- [ ] **Step 2: Build** — `npm run build` → SUCCESS
- [ ] **Step 3: Commit** — `git add src/components/DayView.jsx src/components/DayView.css; git commit -m "component: dayview dashboard"`

---

### Task 7: Integrare în `App.jsx` — tab-uri, storage, wiring *(val D — secvențial, după 1–6)*

**Files:**
- Modify: `src/App.jsx` (refactor shell), `src/App.css` (navigare)

**Interfaces:**
- Consumes: tot ce produce Task 1–6; helper-ele de data/week mutate în `dates.js` se șterg din App.jsx
- Produce: aplicația completă

- [ ] **Step 1: Refactor `App.jsx`**:
  - state: `view: 'azi' | 'saptamana'` (implicit `'azi'`), `dayOffset: number` (0 = azi), restul ca acum
  - storage: `planner_v2` (normal, existent) + `planner_recurring_v1` (array tipare); load ambele la mount (`done`/`doneDates` lipsă → tolerat); save la schimbare
  - `tasksForDate(date)`: fuzionează regular (`getDayKey(weekOffsetForDate(date), (date.getDay()+6)%7)` → `store[...] || []`) cu `instancesOnDate(recurring, date)` → `sortByTime`
  - `tasksForWeekColumn(dayIdx)`: la fel, pentru ziua `dates[dayIdx]` din săptămâna curentă
  - `saveTask(data)`: dacă `data.repeat` (din modal) → upsert tipar în `recurring` (id din același `nextId` la add, edit după `task.recurringId`); altfel fluxul actual (add push / edit merge), inclusiv `done` păstrat la edit
  - `deleteTask(task)`: cu `recurringId` → scoate tiparul din `recurring`; altfel filtrul actual pe toate cele 7 zile
  - `toggleDone(task)`: cu `recurringId` → `markRecurringDone(recurring, recurringId, dateKey(dayDate))`; altfel flip `done` pe taskul din store
  - modal: `<Modal isOpen mode task dayIdx dayLabel={DAYS[dayIdx]} isRecurring={!!modal.task?.repeat} .../>`; `onEdit` din ambele view-uri deschide același modal
  - **Navigare**: `<nav className="view-nav">` cu 2 butoane (`Azi`, `Săptămâna`), iconițe SVG simple (calendar-o-zi / calendar-săptămână), `aria-current` pe activ; randează `<DayView>` sau `<WeekView>`
  - `WeekView` primește `getDayTasks={tasksForWeekColumn}`, `activeDayFilter`, `onFilterDay`, drag handlers ca acum (regular), `onEdit(task)`/`onDelete(task)` care diferențiază recurring
  - `DayView` primește `tasks={tasksForDate(dayDate)}`, `recurring`, `dayOffset`, arrows (`setDayOffset ±1`), `onAdd={() => openModal((dayDate.getDay()+6)%7)}` etc.
  - șterge din App.jsx: `TaskCard`, `Column`, `Modal`, days-strip, legenda, `TYPE`, `DAYS`, `MONTHS`, helper-ele de dată, `escHtml` (rămâne doar shell-ul)

- [ ] **Step 2: Navigare în `src/App.css`**:
  - desktop: `.view-nav` sub header, centrat, butoane pill ca `.day-pill` active/inactive
  - telefon (`max-width: 768px`): `.view-nav` fixed bottom, full-width, 2 butoane mari 50%, `padding-bottom: env(safe-area-inset-bottom)`, fundal `var(--surface)` + border-top; `body`/`.app` primesc `padding-bottom` să nu acopere conținutul

- [ ] **Step 3: Verificare completă** — `npx vitest run` → PASS; `npm run build` → SUCCESS
- [ ] **Step 4: Smoke manual** (dev server): Azi implicit; countdown-ul merge; bifa estompează; săgeata → arată mâine (fără fade); tab-ul Săptămâna arată taskuri + repetitive cu iconiță; adăugare săptămânal apare în coloanele bune; edit recurring se aplică peste tot; datele vechi (fără done/recurring) se încarcă
- [ ] **Step 5: Commit** — `git add -A; git commit -m "feat: azi view + recurring + tabs"`

---

### Task 8: Poarta finală *(val D)*

- [ ] **Step 1: `npx vitest run`** → PASS toate
- [ ] **Step 2: `npm run build`** → SUCCESS
- [ ] **Step 3: Recitește Review Focus din spec** — confirmă cele 5 puncte prin teste (rulate) + smoke
- [ ] **Step 4: Commit dacă mai există diff-uri** — `git add -A; git commit -m "final checks"`

## Valuri de execuție

- **A (secvențial):** Task 1
- **B (paralele):** Task 2 + Task 3
- **C (paralele):** Task 4 + Task 5 + Task 6
- **D (secvențial):** Task 7 + Task 8

Task-urile din același val nu împart fișiere: B — doar `lib/` separat; C — Task 4 atinge `App.css` la finalul fișierului (secțiuni `.repeat-*`), Task 5 la finalul `App.css` (`.card-*`), Task 6 doar `DayView.css`; la commit-uri, agentul comite explicit doar fișierele proprii, nu `git add -A`.