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
│   │   ├── storage.js      # localStorage adapter — the single swap point for iOS
│   │   ├── models.js       # categories + event factory/helpers
│   │   └── store.js        # state, pub/sub, actions, persistence (+ v1→v2 migration)
│   ├── utils/
│   │   ├── dates.js        # pure date/time helpers
│   │   └── dom.js          # tiny DOM helpers ($, escapeHtml, toast)
│   └── features/           # DOM feature modules that subscribe to the store
│       ├── eventView.js    # renders a single event card
│       ├── timePicker.js   # hour/min/AM–PM popup widget
│       ├── datePicker.js   # range date-picker popup widget
│       ├── eventModal.js   # add/edit event modal
│       ├── calendar.js     # day cards + drag/drop
│       ├── backlog.js      # "things to do" backlog
│       ├── stats.js        # stats bar
│       ├── toolbar.js      # search / export / import / print / clear
│       ├── tripPanel.js    # trip name + build button
│       └── clocks.js       # dual searchable world clocks
└── serve-dev.ps1           # optional local static server (no dependencies)
```

## Architecture notes

- **One-way data flow.** Feature modules never mutate state directly — they call
  actions on `core/store.js`, which persists and notifies subscribers. Views
  re-render from `getState()`.
- **Portability.** Everything under `core/`, `utils/`, and `data/` is free of DOM
  and browser globals except `core/storage.js`, which isolates persistence. To
  target iOS (e.g. Capacitor), swap `storage.js` and reuse the rest.
- **Persistence.** Trips are saved under `wanderlust_trip_v2`; the store migrates
  the older `wanderlust_trip_v1` format automatically on load and import.
