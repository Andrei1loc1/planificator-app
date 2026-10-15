# Planificator — Săptămâna mea

Planificator personal de activități: **PWA web** + **aplicație Android nativă** (Capacitor) cu **widget-uri de ecran principal** care arată taskurile zilei, în timp real.

- Repo: https://github.com/Andrei1loc1/planificator-app
- Limbaj UI: română, temă dark, date 100% locale (fără backend, fără cont)

## Funcționalități

### View „Azi" (dashboard zilnic — ecranul implicit)
- Panou **Acum/Urmează** cu countdown live (refresh la 15s)
- Sumar de dimineață: „Azi: 6 taskuri, primul la 09:00, cel mai ocupat 10:00–13:00"
- Bară de progres a zilei („4 din 7 bifate")
- Ferestre de timp liber (gap-uri ≥ 30 min între taskuri)
- Avertisment de conflict la ore suprapuse
- Taskurile trecute se estompează automat; bifare manuală (task fără oră de final = durată implicită 60 min)
- Săgeți ← → pentru ziua precedentă/următoare
- Secțiune „Repetative — ce vine curând"

### View „Săptămâna" (planificare)
- 7 coloane, drag & drop între zile și reordonare în aceeași zi
- Filtrare pe zi (pill-urile din strip), legendă tipuri
- Navigare între săptămâni (← →)

### Taskuri
- 7 tipuri cu culori: Muncă, Curs, Hobby, Personal, Sănătate, Învățare, Odihnă
- Oră de început + sfârșit (opționale)
- **Repetitive**: săptămânal (bifezi zilele L–D) sau lunar (pe data de 1–31; lunile fără ziua respectivă o sar)
  - instanțele se generează automat, nu se copiază
  - editare/ștergere = se aplică peste tot
  - bifarea unei instanțe e per-zi (`doneDates`), nu afectează celelalte zile
- Taskurile repetitive nu se trag cu drag

### Widget-uri Android (2)
- **„Azi"** — taskuri ca card-uri separate, scrollabil
- **„Azi — linii"** — taskurile într-un singur card cu linii fine între rânduri (ca secțiunea „Repetative" din app)
- Ambele: header modern (badge „AZI", zi în serif, dată, „2/6", bară de progres), ordonare centrată pe prezent (taskul curent primul, apoi viitoarele, apoi cele trecute estompate), redimensionabile, tap → deschide app-ul, buton „+ Adaugă task" când ziua e goală
- Refresh: la orice schimbare de task (debounce 500 ms), la deschiderea app-ului (onResume) și automat la 30 min

## Tech Stack

| Strat | Tehnologii |
|---|---|
| Frontend | React 19, Vite 6 |
| PWA | vite-plugin-pwa (manifest + service worker, autoUpdate, precache offline) |
| Teste | Vitest (93 teste, doar funcții pure) |
| Mobil | Capacitor 8, Kotlin, AppWidgetProvider + RemoteViewsService |
| Android | AGP 8.13, compileSdk 36, targetSdk 36, minSdk 24, Gradle wrapper |
| Mediu | Node ≥ 20, JDK 21, Android SDK la `%LOCALAPPDATA%\Android\Sdk` |

## Structura proiectului

```
src/
  App.jsx                 shell: tab-uri (Azi/Săptămâna), stare, localStorage, wiring
  lib/
    dates.js              utilitare de dată (dateKey, getMonday, minutesFromHHMM, weekOffsetForDate...)
    day.js                analiza zilei (sortByTime, conflictIds, freeWindows, currentTask, progress...)
    recurring.js          logica repetitive (matchesDate, instancesOnDate, nextOccurrences, markRecurringDone)
    types.js              TYPE: cele 7 tipuri, culori CSS var + hex (pentru widget)
    widget-data.js        buildWidgetPayload — payload 3 zile pentru widget
    widget-bridge.js      syncWidget — bridge JS→nativ (no-op pe web)
    *.test.js             teste Vitest
  components/
    DayView.jsx / .css    dashboard-ul „Azi"
    WeekView.jsx          board-ul săptămânal (coloane, days-strip, legendă)
    TaskCard.jsx / .css   card task (variant week / day, badge conflict, iconiță repeat, checkbox)
    Modal.jsx / .css      adăugare/editare + „Se repetă" (nu / săptămânal / lunar)
android/
  app/src/main/java/com/planificator/app/
    MainActivity.java     înregistrează pluginul + onResume refresh widget
    WidgetSyncPlugin.kt   plugin Capacitor (syncTasks → SharedPreferences → refresh)
    WidgetRenderer.kt     render comun + WidgetData (parsare payload, sortare now-centric)
    TodayWidgetProvider.kt      widget „Azi" (card-uri)
    TodayLinesWidgetProvider.kt widget „Azi — linii"
    TaskListService.kt    RemoteViewsService — adapterul listei scrollabile (2 stiluri)
  app/src/main/res/       layout-uri widget, drawable, mipmap icon-uri
docs/superpowers/
  specs/                  design docs
  plans/                  planuri de implementare
```

## Pornire rapidă

```bash
npm install          # dependințe
npm run dev          # server dev (web)
```

Alte comenzi:

```bash
npm run build        # build producție → dist/
npm run preview      # previzualizare build
npx vitest run       # rulează cele 93 de teste
```

## Model de date (localStorage)

- **`planner_v2`** — taskuri normale: `{ "YYYY-Www-dayIdx": [ { id, title, type, time, endTime, done? } ] }`
  - cheia zilei: ISO an-săptămână + index zi (ex. `2026-W42-2` = miercuri din săptămâna 42)
- **`planner_recurring_v1`** — tipare repetitive: `[ { id, title, type, time, endTime, repeat: 'weekly'|'monthly', days?: [0..6], dayOfMonth?: 1-31, doneDates?: ['YYYY-MM-DD'] } ]`
- Instanțele repetitive sunt generate la runtime (`instancesOnDate`), nu se stochează
- Task fără `endTime` = durată implicită 60 min (`DEFAULT_DURATION` în day.js)
- Zile: 0 = Luni … 6 = Duminică (conversie din `Date.getDay()` cu `(d.getDay()+6)%7`)

## Android (Capacitor)

### Cerințe (o singură dată, deja configurate pe această mașină)
- JDK 21 în PATH, Android SDK la `%LOCALAPPDATA%\Android\Sdk` (cmdline-tools + platform-tools + `platforms;android-36` + `build-tools;36.0.0`, licențe acceptate)
- `ANDROID_HOME` setat la nivel de user; `android/local.properties` conține `sdk.dir`
- Pentru editare vizuală nativă: Android Studio (instalat la `C:\Program Files\Android\Android Studio`)

### Build + instalare pe telefon (USB debugging activat)

```bash
npm run build
npx cap sync android                                  # copiază dist/ în proiectul Android
cd android
gradlew.bat assembleDebug                              # APK la app/build/outputs/apk/debug/app-debug.apk
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r app\build\outputs\apk\debug\app-debug.apk
```

Note:
- **appId**: `com.planificator.app` (nu se schimbă ușor după publicare pe Play)
- După orice modificare în `src/`: `npm run build` + `npx cap sync android` înainte de build-ul Android
- Modificările de layout/widget cer ștergerea și re-adaugarea widget-ului din launcher
- Fără telefon conectat: build-ul merge oricum (doar instalarea are nevoie de adb)

### Flux de date widget

```
App (localStorage) → useEffect debounce 500ms
  → buildWidgetPayload(store, recurring, azi, 3 zile)
  → syncWidget() → WidgetSyncPlugin.syncTasks (Kotlin)
  → SharedPreferences("widget_prefs" / "widget_payload")
  → WidgetRenderer + TaskListService (sortare now-centric) → RemoteViews
```

- Payload acoperă 3 zile (azi + 2) → trecerea zilei noaptea funcționează dacă app-ul a fost deschis în ziua precedentă
- Limitare platformă: widget-urile nu se reîmprospătează secundar — refresh-ul maxim automat e la 30 min (`updatePeriodMillis`), plus orice schimbare din app
- RemoteViews: doar clase permise în itemii listei (LinearLayout, TextView, ImageView etc. — **nu** `View` simplu)

### PWA pe telefon (fără Play Store)
- Hostează `dist/` pe HTTPS (Vercel/Netlify) → Chrome pe Android → „Instalează aplicația"
- iPhone: Safari → Adaugă la ecranul principal

## Publicare pe Google Play (pași, când e nevoie)
1. Build release semnat: în Android Studio → Generate Signed Bundle (AAB) sau `gradlew bundleRelease` cu keystore propriu
2. Cont Play Console ($25 unic) → creare app → upload AAB
3. Listing, screenshot-uri, content rating
4. Alternativ mai târziu: export/sync JSON sau backend (datele sunt per-device — localStorage-ul nu se sincronizează între telefoane)

## Convenții

- Fără comentarii în cod; fără emoji în UI; etichetele UI în română
- Culorile de tip au o singură sursă: `src/lib/types.js` (CSS var pentru UI + hex pentru widget)
- Stilul vizual: dark, `--surface`/`--surface2`, radius 10–20px, pill-uri 999px, DM Sans / DM Serif Display
- Commit-uri: mesaje scurte lowercase (`scroll`, `widget cards redesign`)
- Testele acoperă doar funcțiile pure din `src/lib/` (TDD); componentele se verifică prin build + smoke

## Documentație

- `docs/superpowers/specs/2026-10-14-azi-recurring-design.md` — design-ul view-ului „Azi" + repetitive
- `docs/superpowers/plans/2026-10-14-azi-recurring.md` — planul de implementare (valuri paralele)
- `docs/superpowers/plans/2026-10-14-capacitor-widget.md` — planul Capacitor + widget