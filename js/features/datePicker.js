// Range date-picker popup. Writes the trip's start/end into the hidden inputs
// and display fields, exactly like the original monolith.

import { $ } from "../utils/dom.js";
import { parseDate, keyOf, eachDay, prettyDate, MONTHS_LONG } from "../utils/dates.js";

const dp = {
  view: new Date(), // month currently shown
  start: null, // "YYYY-MM-DD"
  end: null,
  pick: "start", // which end we pick next
};

function syncFields() {
  $("#startDate").value = dp.start || "";
  $("#endDate").value = dp.end || "";
  $("#startDateDisplay").value = dp.start ? prettyDate(dp.start) : "";
  $("#endDateDisplay").value = dp.end ? prettyDate(dp.end) : "";
}

function cell(date, muted, todayK) {
  const btn = document.createElement("button");
  btn.className = "dp-cell";
  btn.textContent = date.getDate();
  if (muted) {
    btn.classList.add("muted");
    return btn;
  }
  const k = keyOf(date);
  if (k === todayK) btn.classList.add("today");
  if (dp.start && dp.end) {
    if (k === dp.start && k === dp.end) btn.classList.add("single");
    else if (k === dp.start) btn.classList.add("range-start");
    else if (k === dp.end) btn.classList.add("range-end");
    else if (k > dp.start && k < dp.end) btn.classList.add("in-range");
  } else if (dp.start && k === dp.start) {
    btn.classList.add("single");
  }
  btn.addEventListener("click", () => select(k));
  return btn;
}

function render() {
  $("#dpMonth").textContent = `${MONTHS_LONG[dp.view.getMonth()]} ${dp.view.getFullYear()}`;
  const grid = $("#dpGrid");
  grid.innerHTML = "";
  const year = dp.view.getFullYear();
  const month = dp.view.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayK = keyOf(new Date());

  const prevDays = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    grid.appendChild(cell(new Date(year, month - 1, prevDays - i), true));
  }
  for (let d = 1; d <= daysInMonth; d++) {
    grid.appendChild(cell(new Date(year, month, d), false, todayK));
  }
  const total = startOffset + daysInMonth;
  const trailing = (7 - (total % 7)) % 7;
  for (let d = 1; d <= trailing; d++) {
    grid.appendChild(cell(new Date(year, month + 1, d), true));
  }

  const hint = $("#dpHint");
  if (!dp.start) hint.textContent = "Pick a start date";
  else if (!dp.end) hint.textContent = "Pick an end date";
  else {
    const nights = eachDay(dp.start, dp.end).length - 1;
    hint.textContent = `${nights + 1} days · ${nights} night${nights === 1 ? "" : "s"}`;
  }
}

function select(k) {
  if (dp.pick === "start" || (dp.start && k < dp.start)) {
    dp.start = k;
    dp.end = null;
    dp.pick = "end";
  } else {
    dp.end = k;
    dp.pick = "start";
  }
  syncFields();
  render();
  if (dp.start && dp.end) setTimeout(close, 250);
}

function open(which) {
  dp.start = $("#startDate").value || null;
  dp.end = $("#endDate").value || null;
  dp.pick = which === "end" && dp.start ? "end" : "start";
  dp.view =
    which === "end" && dp.end
      ? parseDate(dp.end)
      : dp.start
      ? parseDate(dp.start)
      : new Date();
  render();
  const el = $("#datepicker");
  el.classList.add("open");
  $("#startTrigger").classList.add("active");
  $("#endTrigger").classList.add("active");
  const anchor = which === "end" ? $("#endTrigger") : $("#startTrigger");
  const r = anchor.getBoundingClientRect();
  el.style.top = window.scrollY + r.bottom + 8 + "px";
  el.style.left = window.scrollX + r.left + "px";
}

export function close() {
  $("#datepicker").classList.remove("open");
  $("#startTrigger").classList.remove("active");
  $("#endTrigger").classList.remove("active");
}

function clearRange() {
  dp.start = null;
  dp.end = null;
  dp.pick = "start";
  syncFields();
  render();
}

// Sync the picker + fields to an external range (used on load / import / clear).
export function setRange(start, end) {
  dp.start = start || null;
  dp.end = end || null;
  dp.pick = "start";
  syncFields();
}

export function getRange() {
  return { start: $("#startDate").value, end: $("#endDate").value };
}

export function init() {
  $("#startTrigger").addEventListener("click", () => open("start"));
  $("#endTrigger").addEventListener("click", () => open("end"));
  $("#dpPrev").addEventListener("click", (e) => {
    e.stopPropagation();
    dp.view = new Date(dp.view.getFullYear(), dp.view.getMonth() - 1, 1);
    render();
  });
  $("#dpNext").addEventListener("click", (e) => {
    e.stopPropagation();
    dp.view = new Date(dp.view.getFullYear(), dp.view.getMonth() + 1, 1);
    render();
  });
  $("#dpClear").addEventListener("click", (e) => {
    e.stopPropagation();
    clearRange();
  });
  document.addEventListener("click", (e) => {
    if (
      $("#datepicker").classList.contains("open") &&
      !e.target.closest("#datepicker") &&
      !e.target.closest("#startTrigger") &&
      !e.target.closest("#endTrigger")
    ) {
      close();
    }
  });
}
