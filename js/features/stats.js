// Trip statistics bar (days, planned events, completed, progress %).

import { $ } from "../utils/dom.js";
import { getState, subscribe } from "../core/store.js";
import { eachDay, keyOf } from "../utils/dates.js";

function render() {
  const state = getState();
  const hasTrip = state.trip.start && state.trip.end;
  $("#statsSection").classList.toggle("hidden", !hasTrip);
  if (!hasTrip) return;

  const days = eachDay(state.trip.start, state.trip.end);
  let total = 0;
  let done = 0;
  days.forEach((date) => {
    const events = state.days[keyOf(date)] || [];
    total += events.length;
    done += events.filter((e) => e.done).length;
  });

  $("#statDays").textContent = days.length;
  $("#statEvents").textContent = total;
  $("#statDone").textContent = done;
  const pct = total ? Math.round((done / total) * 100) : 0;
  $("#statPct").textContent = pct + "%";
  $("#progressFill").style.width = pct + "%";
}

export function init() {
  subscribe(render);
}
