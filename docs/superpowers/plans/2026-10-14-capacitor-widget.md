# Capacitor + Widget Android „Azi" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicația devine instalabilă nativ pe Android (Play Store-ready) cu un widget pe ecranul principal care arată taskurile de azi în stil „widget de meteo".

**Architecture:** App-ul React rămâne neatins ca logică; se adaugă Capacitor (shell nativ Android). Widget-ul e un `AppWidgetProvider` clasic (RemoteViews cu rânduri fixe — fără ListView, maximum fiabilitate). Datele curg: localStorage (JS) → payload JSON cu fereastră de 3 zile → plugin Capacitor `WidgetSync` (Kotlin, SharedPreferences) → widget. Fără bridge JS→nativ direct în widget; refresh la fiecare schimbare de task + la 30 min (updatePeriodMillis) + la onResume.

**Tech Stack:** React 19 + Vite 6 (existente), Capacitor 7, Kotlin, AppWidgetProvider + RemoteViews, SharedPreferences, org.json.

**Spec:** Design discutat și aprobat în conversație (widget „meteo": header dată + progres, rânduri taskuri cu bulină de tip, oră, titlu, bifat; tap deschide app-ul; „real time" = actualizare la fiecare schimbare + interval, nu tick secundar).

## Global Constraints

- Fără comentarii în cod. Fără emoji în UI. Etichete UI în română.
- App-ul web (PWA) trebuie să continue să funcționeze identic fără Capacitor (bridge-ul devine no-op pe web).
- Storage rămâne: `planner_v2` (normal) + `planner_recurring_v1` (repetitive) — widget-ul doar CITEȘTE un payload serializat, nu are voie să scrie.
- Id Android: `com.planificator.app`; nume app: `Planificator`; webDir: `dist`.
- Culorile de tip (hex real, nu `var(--…)`) devin sursă unică în `src/lib/types.js` — câmpul `hex` pe fiecare intrare din `TYPE`.
- Kotlin fără `java.time` (folosește `SimpleDateFormat`) — evită desugaring; minSdk-ul template-ului Capacitor.
- Zilele săptămânii: 0=Luni..6=Duminică (`(getDay()+6)%7`).

## Widget Spec (ce vede userul)

- Marime minimă ~4x2, resizable; fundal `#0e0e11`, colțuri rotunjite, stil dark identic app-ului.
- Header: „Azi" + data („Miercuri, 14 oct") + „2/6 bifate".
- Rânduri (max 6): bulină colorată (hex tip) + „18:00–19:00" + titlu; task bifat → strikethrough + estompat; „Încă N…" ca ultim rând dacă sunt >6.
- Fără taskuri azi: „Nimic azi — deschide aplicația".
- Payload-ul acoperă 3 zile (azi +2) → trecerea zilei noaptea arată ziua nouă dacă app-ul a fost deschis ieri seară; dacă datele sunt mai vechi de fereastră sau lipsă: „Deschide aplicația pentru azi".
- Tap oriunde pe widget → deschide MainActivity (app-ul pe „Azi").

## Review Focus

1. **Rulover de zi** — payload cu 3 zile; widgetul găsește ziua de azi fără crash dacă app-ul n-a fost redeschis. Test: `widget-data` window 3 zile (azi, +1, +2) keyed by `dateKey`.
2. **Payload lipsă / zi lipsă** — widget randează starea goală „Deschide aplicația", nicio excepție Kotlin pe JSON corupt (try/catch la parsare, fallback empty).
3. **Repetitive în widget** — instanțele apar ca taskuri normale, cu `done` per-zi. Test: `widget-data` include recurring instance + done flag per zi.
4. **Build web fără Capacitor** — `syncWidget` no-op, `npm run build` verde, PWA neschimbată vizual. Test: bridge importuri opționale; build trece fără @capacitor/core în browser context (core e instalat, dar pluginul nu — `isPluginAvailable` false path).
5. **Refresh fără app deschis** — `updatePeriodMillis 1800000` re-randează din SharedPreferences; nu depinde de app deschisă.

---

### Task 1: Capacitor bootstrap *(val A — blocant, secvențial, executat de orchestrator)*

**Files:** package.json/package-lock.json (deps noi), capacitor.config.json, android/ (proiect generat)

- [ ] `npm install @capacitor/core @capacitor/android; npm install -D @capacitor/cli`
- [ ] `npx cap init "Planificator" com.planificator.app --web-dir=dist`
- [ ] `npx cap add android` (generează proiectul android/ cu template AGP curent)
- [ ] capacitor.config.json: appId `com.planificator.app`, appName `Planificator`, webDir `dist`, `android: { backgroundColor: "#0e0e11" }`
- [ ] `npx vitest run` (81 verde) + `npm run build` → SUCCESS
- [ ] `npx cap sync android` (copiază dist în android)
- [ ] Commit: `git add -A; git commit -m "capacitor android"`

### Task 2: Widget data + bridge + wiring (JS) *(val B1 — paralel cu Task 3)*

**Files:**
- Modify: `src/lib/types.js` (adaugă `hex` pe fiecare tip: work #5b9cf6, course #a78bfa, hobby #34d399, personal #f87171, health #2dd4bf, learn #fbbf24, rest #fb923c)
- Create: `src/lib/widget-data.js`, `src/lib/widget-data.test.js`, `src/lib/widget-bridge.js`
- Modify: `src/App.jsx` (efect de sync)

**Interfaces:**

`widget-data.js` exportă:
- `buildWidgetPayload(store, recurring, fromDate: Date, days = 3): { days: { [dateKey: string]: { label: string, total: number, done: number, tasks: { title, start, end, color, done }[] } } }`
  - pentru fiecare din cele `days` zile: `label` = `formatDateLong(date)` (din dates.js), taskuri = `sortByTime([...(store[getDayKey(weekOffsetForDate(date), dayIdx)] || []), ...instancesOnDate(recurring, date)])` (din day.js/recurring.js), fiecare `{ title, start: time, end: endTime, color: TYPE[type].hex, done }`
  - `total`/`done` = `progress(tasks)` (day.js)

`widget-bridge.js` exportă:
- `syncWidget(payload): boolean` — import static `@capacitor/core` (`Capacitor`); dacă `Capacitor.isPluginAvailable('WidgetSync')` false → returnează false fără aruncare; altfel `Capacitor.Plugins.WidgetSync.syncTasks({ payload: JSON.stringify(payload) })` (fire-and-forget, catch intern) → true

`App.jsx` — după useEffect-urile de persistare, un `useEffect` pe `[store, recurring]` cu debounce 500ms care apelează `syncWidget(buildWidgetPayload(store, recurring, todayAtMidnight))`; `todayAtMidnight` calculat în efect (nu din state).

- [ ] **Step 1:** Teste eșuante în `widget-data.test.js`: fereastră 3 zile cu keyele dateKey corecte; task normal apare cu color hex corect; instanță recurring apare în ziua potrivită cu done per-zi; done counts corecte (progress); zi goală → `{ label, total: 0, done: 0, tasks: [] }`
- [ ] **Step 2:** `npx vitest run` → FAIL → implement → PASS (toate 81+ trec)
- [ ] **Step 3:** `npm run build` → SUCCESS
- [ ] **Step 4:** Commit: `git add src/lib/types.js src/lib/widget-data.js src/lib/widget-data.test.js src/lib/widget-bridge.js src/App.jsx; git commit -m "widget data sync (js)"`

### Task 3: Widget nativ Android (Kotlin) *(val B2 — paralel cu Task 2)*

**Files:**
- Create: `android/app/src/main/java/com/planificator/app/WidgetSyncPlugin.kt`, `TodayWidgetProvider.kt`
- Create: `android/app/src/main/res/layout/widget_today.xml`, `android/app/src/main/res/drawable/widget_bg.xml` (rounded corners 16dp, #0e0e11), `android/app/src/main/res/xml/widget_today_info.xml`, `android/app/src/main/res/values/widget_strings.xml`
- Modify: `android/app/src/main/AndroidManifest.xml` (receiver), `android/app/src/main/java/com/planificator/app/MainActivity.kt` (registerPlugin + onResume refresh)

**Interfaces:**

`WidgetSyncPlugin.kt` — `@CapacitorPlugin(name = "WidgetSync")`:
- metoda `syncTasks(call: PluginCall)` — `call.getString("payload")` → `prefs.edit().putString("widget_payload", payload).apply()` pe `getSharedPreferences("widget_prefs", MODE_PRIVATE)` → `WidgetSync.refreshAll(context)` → `call.resolve()`
- companion object `refreshAll(context)` → `AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, TodayWidgetProvider::class.java)).forEach { update }` (apelabil și din MainActivity.onResume)
- payload invalid/lipsă → try/catch, nu crash

`TodayWidgetProvider.kt` — `AppWidgetProvider`:
- `onUpdate` construiește RemoteViews: header („Azi · " + label din payload pentru dateKey azi, via SimpleDateFormat `yyyy-MM-dd`), „N/total bifate", max 6 rânduri task + „Încă N…", empty state „Nimic azi — deschide aplicația" / „Deschide aplicația pentru azi" dacă payloadul nu conține ziua de azi
- rând task: bulină (setTextViewTextSize, setTextColor cu Int color din hex parsat `Color.parseColor`), text „HH:MM–HH:MM" (sau doar start), titlu; `done` → `paintFlags STRIKE_THRU` + alpha
- `updatePeriodMillis` nu e în Kotlin — e în widget_today_info.xml
- tap: `PendingIntent.getActivity` → MainActivity (launchMode singleTask din template), `setOnClickPendingIntent` pe root
- `onAppWidgetOptionsChanged` — re-randare (resize)

`widget_today_info.xml`: `appwidget-provider` cu `minWidth 250dp`, `minHeight 110dp`, `targetCellWidth 4`, `targetCellHeight 2`, `updatePeriodMillis 1800000`, `resizeMode horizontal|vertical`, `widgetCategory home_screen`, `initialLayout @layout/widget_today`, `previewLayout @layout/widget_today`.

`MainActivity.kt`: `onCreate` → `registerPlugin(WidgetSyncPlugin::class.java)`; `onResume` → `WidgetSyncPlugin.refreshAll(this)`.

- [ ] **Step 1:** Implementează toate fișierele conform Interfaces (fără comentarii în cod)
- [ ] **Step 2:** Dacă SDK e montat (test: `Test-Path $env:LOCALAPPDATA\Android\Sdk\platforms`): `cd android; .\gradlew assembleDebug` → BUILD SUCCESSFUL; altfel: syntax self-review + raportează „pending compile"
- [ ] **Step 3:** Commit: `git add android; git commit -m "android widget"`

### Task 4: SDK + integrare + build final *(val C — secvențial, orchestrator)*

- [ ] Montez SDK (cmdline-tools zip → `%LOCALAPPDATA%\Android\Sdk`, licenses acceptate, `platforms;android-3X` + `build-tools` + `platform-tools` după ce `cap add android` a fixat versiunile din template)
- [ ] `local.properties` în android/ cu `sdk.dir` (dacă lipsește)
- [ ] `npm run build; npx cap sync android; cd android; .\gradlew assembleDebug` → BUILD SUCCESSFUL
- [ ] Dacă e un telefon conectat (`adb devices`): `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`
- [ ] Commit final + checklist manual pentru user (adaugă widget din launcher, deschide app-ul, verifică că lista apare)

## Valuri

- **A:** Task 1 (orchestrator, blocant)
- **B (paralele):** Task 2 (src/**) + Task 3 (android/**) — fișiere disjuncte
- **C:** Task 4 (orchestrator: SDK, build, device)

## Non-goals

- iOS WidgetKit (iterează separat), activitate de configurare a widget-ului, deep-link în zile specifice, notificări native.