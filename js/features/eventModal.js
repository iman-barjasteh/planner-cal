// Add / edit event modal. Uses the time-picker widget and mutates via the store.

import { $, toast } from "../utils/dom.js";
import { CATEGORIES, BACKLOG_KEY, DEFAULT_CATEGORY } from "../core/models.js";
import { parseDate, WEEKDAYS, MONTHS_SHORT } from "../utils/dates.js";
import { getState, addEvent, updateEvent } from "../core/store.js";
import * as timePicker from "./timePicker.js";

const editing = { dayKey: null, eventId: null, cat: DEFAULT_CATEGORY };

function buildCatChips() {
  const row = $("#catRow");
  row.innerHTML = "";
  CATEGORIES.forEach((c) => {
    const chip = document.createElement("div");
    chip.className = "cat-chip" + (c.id === editing.cat ? " active" : "");
    chip.dataset.cat = c.id;
    chip.innerHTML = `${c.icon} ${c.label}`;
    chip.addEventListener("click", () => {
      editing.cat = c.id;
      row
        .querySelectorAll(".cat-chip")
        .forEach((x) => x.classList.toggle("active", x.dataset.cat === c.id));
    });
    row.appendChild(chip);
  });
}

export function openEventModal(dayKey, eventId) {
  editing.dayKey = dayKey;
  editing.eventId = eventId || null;
  const isBacklog = dayKey === BACKLOG_KEY;
  const ev = eventId
    ? (getState().days[dayKey] || []).find((e) => e.id === eventId)
    : null;
  editing.cat = ev ? ev.cat : DEFAULT_CATEGORY;
  $("#modalTitle").textContent = ev
    ? "Edit event"
    : isBacklog
    ? "Add idea"
    : "Add event";
  if (isBacklog) {
    $("#modalSub").textContent = "💡 Unplanned idea — drag it onto a day later";
  } else {
    const date = parseDate(dayKey);
    $("#modalSub").textContent = `${WEEKDAYS[date.getDay()]}, ${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
  }
  $("#evTime").value = ev ? ev.time || "" : "";
  timePicker.setValue(ev ? ev.time || "" : "");
  timePicker.close();
  $("#evText").value = ev ? ev.text : "";
  $("#evLink").value = ev ? ev.link || "" : "";
  $("#timeField").classList.toggle("hidden", isBacklog);
  buildCatChips();
  $("#overlay").classList.add("open");
  setTimeout(() => $("#evText").focus(), 50);
}

export function closeModal() {
  $("#overlay").classList.remove("open");
}

function saveModal(keepOpen) {
  const text = $("#evText").value.trim();
  if (!text) {
    toast("Please enter what's planned");
    $("#evText").focus();
    return;
  }
  const dk = editing.dayKey;
  const isBacklog = dk === BACKLOG_KEY;
  const time = isBacklog ? "" : timePicker.getValue();
  const link = $("#evLink").value.trim();

  if (editing.eventId) {
    updateEvent(dk, editing.eventId, { text, time, cat: editing.cat, link });
  } else {
    addEvent(dk, { text, time, cat: editing.cat, link });
  }

  if (keepOpen) {
    editing.eventId = null;
    $("#modalTitle").textContent = isBacklog ? "Add idea" : "Add event";
    $("#evText").value = "";
    $("#evLink").value = "";
    $("#evTime").value = "";
    timePicker.setValue("");
    timePicker.close();
    toast("Added ✓ — add another");
    setTimeout(() => $("#evText").focus(), 30);
  } else {
    closeModal();
    toast("Saved ✓");
  }
}

export function init() {
  $("#saveBtn").addEventListener("click", () => saveModal(false));
  $("#saveAddBtn").addEventListener("click", () => saveModal(true));
  $("#cancelBtn").addEventListener("click", closeModal);
  $("#overlay").addEventListener("click", (e) => {
    if (e.target === $("#overlay")) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Enter" &&
      (e.ctrlKey || e.metaKey) &&
      $("#overlay").classList.contains("open")
    ) {
      saveModal(e.shiftKey);
    }
  });
}
