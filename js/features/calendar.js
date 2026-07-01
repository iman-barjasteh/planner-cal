// Calendar grid: one card per day, with add button and drag/drop targets.

import { $, toast } from "../utils/dom.js";
import {
  getState,
  subscribe,
  toggleDone,
  deleteEvent,
  moveEvent,
} from "../core/store.js";
import { eachDay, keyOf, sortEvents, WEEKDAYS, MONTHS_SHORT } from "../utils/dates.js";
import { renderEvent, matchesFilter } from "./eventView.js";
import { openEventModal } from "./eventModal.js";

const handlers = {
  onToggle: toggleDone,
  onEdit: openEventModal,
  onDelete: (dk, id) => {
    deleteEvent(dk, id);
    toast("Event deleted");
  },
};

function handleDrop(json, targetKey) {
  let src;
  try {
    src = JSON.parse(json);
  } catch {
    return;
  }
  if (src.dk === targetKey) return;
  moveEvent(src.dk, src.id, targetKey);
  toast(targetKey === "backlog" ? "Moved to ideas" : "Event moved");
}

function render() {
  const state = getState();
  const cal = $("#calendar");
  const hasTrip = state.trip.start && state.trip.end;
  $("#placeholder").classList.toggle("hidden", hasTrip);
  cal.innerHTML = "";
  if (!hasTrip) return;

  const days = eachDay(state.trip.start, state.trip.end);
  const filter = (state.ui.filter || "").trim().toLowerCase();

  days.forEach((date, idx) => {
    const dk = keyOf(date);
    const events = (state.days[dk] || []).slice().sort(sortEvents);
    const visible = filter ? events.filter((e) => matchesFilter(e, filter)) : events;

    const card = document.createElement("div");
    card.className = "day-card";
    card.dataset.key = dk;
    card.innerHTML = `
      <div class="day-head">
        <div class="day-badge">${idx + 1}</div>
        <div class="day-title">
          <div class="dow">${WEEKDAYS[date.getDay()]}</div>
          <div class="date">${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}</div>
        </div>
        <button class="add-btn" data-key="${dk}" title="Add event">＋ Add</button>
      </div>
      <div class="events" data-key="${dk}"></div>
      <div class="day-foot"><span class="day-note">${events.length} item${events.length === 1 ? "" : "s"}</span></div>
    `;

    const evWrap = card.querySelector(".events");
    if (visible.length === 0) {
      evWrap.innerHTML = `<div class="empty">${filter ? "No matching events" : "Nothing planned yet — add your first event!"}</div>`;
    } else {
      visible.forEach((ev) => evWrap.appendChild(renderEvent(dk, ev, handlers)));
    }

    card.addEventListener("dragover", (e) => {
      e.preventDefault();
      card.classList.add("dragover");
    });
    card.addEventListener("dragleave", () => card.classList.remove("dragover"));
    card.addEventListener("drop", (e) => {
      e.preventDefault();
      card.classList.remove("dragover");
      const data = e.dataTransfer.getData("text/plain");
      if (data) handleDrop(data, dk);
    });

    cal.appendChild(card);
  });
}

export function init() {
  $("#calendar").addEventListener("click", (e) => {
    const add = e.target.closest(".add-btn");
    if (add) openEventModal(add.dataset.key, null);
  });
  subscribe(render);
}
