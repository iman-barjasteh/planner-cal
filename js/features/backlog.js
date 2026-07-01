// "Things to do" backlog: unscheduled ideas, addable and drop-target.

import { $, toast } from "../utils/dom.js";
import {
  getState,
  subscribe,
  toggleDone,
  deleteEvent,
  moveEvent,
} from "../core/store.js";
import { BACKLOG_KEY } from "../core/models.js";
import { sortEvents } from "../utils/dates.js";
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

function render() {
  const state = getState();
  const hasTrip = state.trip.start && state.trip.end;
  $("#backlogSection").classList.toggle("hidden", !hasTrip);
  if (!hasTrip) return;

  const wrap = $("#backlogEvents");
  const filter = (state.ui.filter || "").trim().toLowerCase();
  const items = (state.days[BACKLOG_KEY] || []).slice().sort(sortEvents);
  const visible = filter ? items.filter((e) => matchesFilter(e, filter)) : items;
  wrap.innerHTML = "";
  if (visible.length === 0) {
    wrap.innerHTML = `<div class="empty">${filter ? "No matching ideas" : "No ideas yet — add things you want to do but haven't scheduled."}</div>`;
  } else {
    visible.forEach((ev) => wrap.appendChild(renderEvent(BACKLOG_KEY, ev, handlers)));
  }
}

function handleDrop(json) {
  let src;
  try {
    src = JSON.parse(json);
  } catch {
    return;
  }
  if (src.dk === BACKLOG_KEY) return;
  moveEvent(src.dk, src.id, BACKLOG_KEY);
  toast("Moved to ideas");
}

export function init() {
  $("#backlogAdd").addEventListener("click", () => openEventModal(BACKLOG_KEY, null));
  const bl = $("#backlogSection");
  bl.addEventListener("dragover", (e) => {
    e.preventDefault();
    bl.classList.add("dragover");
  });
  bl.addEventListener("dragleave", () => bl.classList.remove("dragover"));
  bl.addEventListener("drop", (e) => {
    e.preventDefault();
    bl.classList.remove("dragover");
    const data = e.dataTransfer.getData("text/plain");
    if (data) handleDrop(data);
  });
  subscribe(render);
}
