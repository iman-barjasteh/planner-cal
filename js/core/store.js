// Central application state: a tiny pub/sub store with actions and persistence.
// Feature modules read via getState(), react via subscribe(), and mutate ONLY
// through the exported actions. Keeping this framework-free makes it portable.

import { storage } from "./storage.js";
import { BACKLOG_KEY, createEvent, normalizeLink } from "./models.js";
import { eachDayKey } from "../utils/dates.js";

const STORE_KEY = "wanderlust_trip_v2";
const LEGACY_KEY = "wanderlust_trip_v1";
export const EXPORT_VERSION = 2;

// ---- state ------------------------------------------------------------------

function emptyState() {
  return {
    trip: { name: "", start: "", end: "" },
    days: { [BACKLOG_KEY]: [] },
    ui: { filter: "" },
  };
}

let state = emptyState();
const listeners = new Set();

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of listeners) fn(state);
}

// ---- normalization / migration ---------------------------------------------

// Accepts current (v2), legacy (v1) or partial shapes and returns a clean
// { trip, days } object. Ensures the backlog bucket always exists.
export function normalize(raw) {
  const base = { trip: { name: "", start: "", end: "" }, days: { [BACKLOG_KEY]: [] } };
  if (!raw || typeof raw !== "object") return base;

  // v1 shape: { tripName, start, end, days }
  if (raw.tripName !== undefined || (raw.days && raw.trip === undefined)) {
    base.trip = {
      name: raw.tripName || "",
      start: raw.start || "",
      end: raw.end || "",
    };
    base.days = normalizeDays(raw.days);
    return base;
  }

  // v2 shape: { trip, days }
  base.trip = {
    name: (raw.trip && raw.trip.name) || "",
    start: (raw.trip && raw.trip.start) || "",
    end: (raw.trip && raw.trip.end) || "",
  };
  base.days = normalizeDays(raw.days);
  return base;
}

function normalizeDays(days) {
  const out = { [BACKLOG_KEY]: [] };
  if (days && typeof days === "object") {
    for (const [key, list] of Object.entries(days)) {
      if (!Array.isArray(list)) continue;
      out[key] = list.map(normalizeEvent);
    }
  }
  if (!Array.isArray(out[BACKLOG_KEY])) out[BACKLOG_KEY] = [];
  return out;
}

function normalizeEvent(ev) {
  const e = createEvent({
    time: ev.time || "",
    text: ev.text || "",
    cat: ev.cat || "other",
    link: ev.link || "",
  });
  if (ev.id) e.id = ev.id;
  e.done = !!ev.done;
  return e;
}

// ---- persistence ------------------------------------------------------------

function persist() {
  storage.set(STORE_KEY, { version: EXPORT_VERSION, trip: state.trip, days: state.days });
}

export function init() {
  let raw = storage.get(STORE_KEY);
  if (!raw) {
    const legacy = storage.get(LEGACY_KEY);
    if (legacy) raw = legacy; // one-time migration from the old monolith key
  }
  const clean = normalize(raw);
  state = { ...emptyState(), trip: clean.trip, days: clean.days };
  if (raw) persist(); // write back in the migrated shape
}

// ---- actions ----------------------------------------------------------------

function commit() {
  persist();
  notify();
}

// Build (or rebuild) the trip: sets metadata and prunes out-of-range days,
// always preserving the backlog bucket.
export function buildTrip({ name, start, end }) {
  state.trip = { name: name || "", start, end };
  const valid = new Set(eachDayKey(start, end));
  valid.add(BACKLOG_KEY);
  for (const key of Object.keys(state.days)) {
    if (!valid.has(key)) delete state.days[key];
  }
  for (const key of valid) {
    if (!state.days[key]) state.days[key] = [];
  }
  commit();
}

export function addEvent(dayKey, data) {
  if (!state.days[dayKey]) state.days[dayKey] = [];
  const ev = createEvent(data);
  state.days[dayKey].push(ev);
  commit();
  return ev;
}

export function updateEvent(dayKey, id, patch) {
  const list = state.days[dayKey];
  if (!list) return;
  const ev = list.find((e) => e.id === id);
  if (!ev) return;
  if (patch.text !== undefined) ev.text = patch.text;
  if (patch.time !== undefined) ev.time = patch.time;
  if (patch.cat !== undefined) ev.cat = patch.cat;
  if (patch.link !== undefined) ev.link = normalizeLink(patch.link);
  if (patch.done !== undefined) ev.done = !!patch.done;
  commit();
}

export function deleteEvent(dayKey, id) {
  const list = state.days[dayKey];
  if (!list) return;
  state.days[dayKey] = list.filter((e) => e.id !== id);
  commit();
}

export function toggleDone(dayKey, id) {
  const list = state.days[dayKey];
  if (!list) return;
  const ev = list.find((e) => e.id === id);
  if (!ev) return;
  ev.done = !ev.done;
  commit();
}

export function moveEvent(fromKey, id, toKey) {
  if (fromKey === toKey) return;
  const from = state.days[fromKey];
  if (!from) return;
  const ev = from.find((e) => e.id === id);
  if (!ev) return;
  state.days[fromKey] = from.filter((e) => e.id !== id);
  if (!state.days[toKey]) state.days[toKey] = [];
  state.days[toKey].push(ev);
  commit();
}

// Filter is ephemeral UI state: it does not persist, only re-renders.
export function setFilter(str) {
  state.ui.filter = str || "";
  notify();
}

export function clearAll() {
  state = emptyState();
  storage.remove(STORE_KEY);
  notify();
}

// Replace the whole trip from imported data (already raw/legacy tolerant).
export function replaceAll(raw) {
  const clean = normalize(raw);
  state = { ...emptyState(), trip: clean.trip, days: clean.days };
  commit();
}

// Force listeners to render current state (used once after all inits).
export function refresh() {
  notify();
}
