// Central application state: a tiny pub/sub store with actions.
// Persistence is delegated to a pluggable backend (local or cloud), so the same
// state logic drives both offline single-device use and realtime collaboration.

import { BACKLOG_KEY, createEvent, normalizeLink } from "./models.js";
import { eachDayKey } from "../utils/dates.js";

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
let backend = null;
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

// ---- backend integration ----------------------------------------------------

function setState(clean) {
  state = { ...emptyState(), trip: clean.trip, days: clean.days };
}

// Apply an incoming remote snapshot WITHOUT writing back (avoids echo loops).
function applyRemote(raw) {
  const prevFilter = state.ui.filter;
  setState(normalize(raw));
  state.ui.filter = prevFilter; // filter is local/ephemeral, keep it
  notify();
}

// Initialize with a backend. Loads initial data; cloud backends also subscribe
// and will call applyRemote on later changes.
export async function init(be) {
  backend = be;
  backend.attach({ getState, applyRemote });
  const raw = await backend.start();
  if (raw) setState(normalize(raw));
}

// ---- actions ----------------------------------------------------------------

export function buildTrip({ name, start, end }) {
  state.trip = { name: name || "", start, end };
  const valid = new Set(eachDayKey(start, end));
  valid.add(BACKLOG_KEY);
  const removed = [];
  for (const key of Object.keys(state.days)) {
    if (!valid.has(key)) {
      for (const ev of state.days[key]) removed.push({ dayKey: key, id: ev.id });
      delete state.days[key];
    }
  }
  for (const key of valid) {
    if (!state.days[key]) state.days[key] = [];
  }
  backend.saveMeta(state.trip);
  removed.forEach((r) => backend.removeEvent(r.dayKey, r.id));
  notify();
}

export function addEvent(dayKey, data) {
  if (!state.days[dayKey]) state.days[dayKey] = [];
  const ev = createEvent(data);
  state.days[dayKey].push(ev);
  backend.upsertEvent(dayKey, ev);
  notify();
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
  backend.upsertEvent(dayKey, ev);
  notify();
}

export function deleteEvent(dayKey, id) {
  const list = state.days[dayKey];
  if (!list) return;
  state.days[dayKey] = list.filter((e) => e.id !== id);
  backend.removeEvent(dayKey, id);
  notify();
}

export function toggleDone(dayKey, id) {
  const list = state.days[dayKey];
  if (!list) return;
  const ev = list.find((e) => e.id === id);
  if (!ev) return;
  ev.done = !ev.done;
  backend.upsertEvent(dayKey, ev);
  notify();
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
  // Same event doc, new dayKey — a single upsert reflects the move.
  backend.upsertEvent(toKey, ev);
  notify();
}

// Filter is ephemeral UI state: it does not persist, only re-renders.
export function setFilter(str) {
  state.ui.filter = str || "";
  notify();
}

export function clearAll() {
  state = emptyState();
  backend.clear();
  notify();
}

// Replace the whole trip from imported data (already raw/legacy tolerant).
export function replaceAll(raw) {
  setState(normalize(raw));
  if (backend.replace) backend.replace(state);
  else {
    backend.saveMeta(state.trip);
    for (const [dayKey, list] of Object.entries(state.days)) {
      for (const ev of list) backend.upsertEvent(dayKey, ev);
    }
  }
  notify();
}

// Force listeners to render current state (used once after all inits).
export function refresh() {
  notify();
}
