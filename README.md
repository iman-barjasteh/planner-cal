# myCal — Wanderlust Travel Planner

An offline, day-by-day travel planner built with **plain ES modules** (no build
step, no framework). Architected in layers so the portable core can later be
reused in a native/iOS app.

## Features
- Build a day-by-day calendar from a start/end date (custom range date picker).
- Add itemized events per day with an optional time (hour/minute/AM–PM popup), category, and link.
- Event categories: sightseeing, food, transport, flight departure/landing, hotel check-in/check-out, lodging, activity, other.
- **Things to do** backlog for unplanned ideas (no time, optional link); drag ideas onto any day.
- Drag & drop events between days and the backlog.
- Live stats + progress bar, search, and dual world clocks with searchable time zones.
- Auto-saves to the browser (localStorage). Export / Import JSON, and Print.
- **Optional cloud sync**: share a link and edit the same trip live with others
  (Firestore-backed). Off by default — the app is fully usable offline.
- **Optional AI Smart Add**: paste a flight confirmation, hotel booking, or
  free-form text and let Gemini extract structured events for you to review
  before adding. Off by default — requires your own free Gemini API key.

## Running it

Because the app uses ES modules (`<script type="module">`), it must be served
over `http://` — opening `index.html` directly via `file://` will be blocked by
the browser's module CORS policy.

Use any static server from the `myCal` folder, e.g.:

```powershell
# Bundled zero-dependency PowerShell server (Windows)
./serve-dev.ps1            # then open http://localhost:8137/

# …or, if you have them installed:
python -m http.server 8137
npx serve .
```

Then open `http://localhost:8137/` in a modern browser.

## Project structure

```
myCal/
├── index.html              # markup only; links CSS + loads js/app.js as a module
├── css/
│   └── styles.css          # all styles (theme vars live in :root)
├── js/
│   ├── app.js              # bootstrap: load state, init features, first render
│   ├── data/
│   │   └── timezones.js    # static time-zone list (pure data)
│   ├── core/               # portable, DOM-free layer
│   │   ├── storage.js      # localStorage adapter
│   │   ├── firebaseConfig.js # paste your Firebase web config here (blank = offline)
│   │   ├── aiConfig.js     # Gemini API key storage (localStorage, bring-your-own-key)
│   │   ├── models.js       # categories + event factory/helpers
│   │   ├── store.js        # state, pub/sub, actions (+ v1→v2 migration)
│   │   ├── extract/
│   │   │   └── geminiExtractor.js # calls Gemini to parse pasted text into events
│   │   └── backends/       # pluggable persistence
│   │       ├── index.js        # selects local vs cloud; trip-id / share-link helpers
│   │       ├── localBackend.js # localStorage whole-state (offline default)
│   │       └── firestoreBackend.js # per-event Firestore docs + realtime sync
│   ├── utils/
│   │   ├── dates.js        # pure date/time helpers
│   │   └── dom.js          # tiny DOM helpers ($, escapeHtml, toast)
│   └── features/           # DOM feature modules that subscribe to the store
│       ├── eventView.js    # renders a single event card
│       ├── timePicker.js   # hour/min/AM–PM popup widget
│       ├── datePicker.js   # range date-picker popup widget
│       ├── eventModal.js   # add/edit event modal
│       ├── importText.js   # "Smart Add" — paste text, AI-extract, review, commit
│       ├── calendar.js     # day cards + drag/drop
│       ├── backlog.js      # "things to do" backlog
│       ├── stats.js        # stats bar
│       ├── toolbar.js      # search / share / smart add / export / import / print / clear
│       ├── tripPanel.js    # trip name + build button
│       └── clocks.js       # dual searchable world clocks
├── firestore.rules         # security rules for cloud mode
└── serve-dev.ps1           # optional local static server (no dependencies)
```

## Architecture notes

- **One-way data flow.** Feature modules never mutate state directly — they call
  actions on `core/store.js`, which persists and notifies subscribers. Views
  re-render from `getState()`.
- **Pluggable persistence.** The store talks to a backend interface, not to a
  specific store. `localBackend` uses `localStorage`; `firestoreBackend` uses
  Firestore with realtime sync. This same seam is where an iOS/native adapter
  (e.g. Capacitor) would plug in — everything under `core/`, `utils/`, and
  `data/` is DOM-free.
- **Persistence.** Trips are saved under `wanderlust_trip_v2`; the store migrates
  the older `wanderlust_trip_v1` format automatically on load and import.

## Cloud sync & sharing (optional)

By default the app is offline-only (`localStorage`). To let multiple people edit
the same trip live:

1. **Create a Firebase project** at <https://console.firebase.google.com>, add a
   **Web app**, and enable **Cloud Firestore** (start in production mode).
2. **Paste the web config** (`apiKey`, `projectId`, `appId`, …) into
   `js/core/firebaseConfig.js`. These values are not secrets — a web config is
   safe to ship in a static client.
3. **Publish the security rules** from `firestore.rules`
   (`firebase deploy --only firestore:rules`, or paste them in the console).
4. **Deploy the static files** to any static host (Cloudflare Pages, Netlify,
   GitHub Pages, Firebase Hosting). No server needed.

Once configured, opening the site mints a new trip and puts its id in the URL
**fragment** (`…/#trip=<randomId>`). Click **🔗 Share** to copy that link — anyone
who opens it edits the same trip, with changes syncing live.

**How it works / trade-offs**
- Each event is its own Firestore document (`trips/{id}/events/{eventId}`), so
  edits and drag-between-days rarely conflict (last-write-wins per event).
- The trip id is an unguessable, capability-style secret kept in the URL fragment
  (never sent to servers or `Referer`). **Anyone with the link can edit** until
  you add Firebase Auth.
- To move an existing offline trip into the cloud, **Export JSON** locally, open a
  fresh cloud trip, and **Import** it.

## AI Smart Add (optional)

Click **✨ Smart Add** to paste a flight confirmation, hotel booking, or plain
trip notes and have Gemini pull out structured events for you to review before
they're added.

1. **Get a free API key** at <https://aistudio.google.com/apikey>.
2. **Paste it into the Smart Add dialog** the first time you use it — it's saved
   only in this browser's `localStorage` (`js/core/aiConfig.js`), never sent
   anywhere except directly to Google's Gemini API.
3. Paste your text and click **Extract events**. Each detected event (a flight
   confirmation typically yields both a departure and landing; a hotel booking
   yields check-in and check-out) appears as an **editable row** — fix the day,
   time, category, or text, remove any you don't want, then **Add events**.
4. If Gemini can't confidently determine a date (or it falls outside your trip's
   range), the event defaults to **Things to do** so nothing is lost.

This feature is entirely optional and off by default — without a key, the rest
of the app (including manual event entry) works exactly as before. Pasted text
is sent to Google's API only when you click Extract; nothing is stored or sent
anywhere else.

