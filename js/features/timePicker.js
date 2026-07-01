// Time picker popup widget (hour / minute / AM-PM, no seconds).
// Owns its DOM (#timepicker and triggers) and exposes a small imperative API.

import { $ } from "../utils/dom.js";
import { formatTime } from "../utils/dates.js";

const tp = { hour: null, min: null, ampm: null }; // hour 1-12, min 0-59

function option(label, selected, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "tp-opt" + (selected ? " sel" : "");
  b.textContent = label;
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  return b;
}

function commit() {
  if (tp.hour == null || tp.min == null || !tp.ampm) return; // need all parts
  let h = tp.hour % 12;
  if (tp.ampm === "PM") h += 12;
  const val = `${String(h).padStart(2, "0")}:${String(tp.min).padStart(2, "0")}`;
  $("#evTime").value = val;
  $("#timeDisplay").value = formatTime(val);
}

function render() {
  const hours = $("#tpHours");
  const mins = $("#tpMins");
  const ampm = $("#tpAmpm");
  hours.innerHTML = "";
  mins.innerHTML = "";
  ampm.innerHTML = "";
  for (let h = 1; h <= 12; h++) {
    hours.appendChild(
      option(String(h), tp.hour === h, () => {
        tp.hour = h;
        if (!tp.ampm) tp.ampm = "AM";
        if (tp.min == null) tp.min = 0;
        commit();
        render();
      })
    );
  }
  for (let m = 0; m < 60; m += 5) {
    mins.appendChild(
      option(String(m).padStart(2, "0"), tp.min === m, () => {
        tp.min = m;
        if (!tp.ampm) tp.ampm = "AM";
        if (tp.hour == null) tp.hour = 12;
        commit();
        render();
      })
    );
  }
  ["AM", "PM"].forEach((a) => {
    ampm.appendChild(
      option(a, tp.ampm === a, () => {
        tp.ampm = a;
        if (tp.hour == null) tp.hour = 12;
        if (tp.min == null) tp.min = 0;
        commit();
        render();
      })
    );
  }
  );
}

export function setValue(val24) {
  if (val24) {
    $("#timeDisplay").value = formatTime(val24);
    const [h, m] = val24.split(":").map(Number);
    tp.ampm = h >= 12 ? "PM" : "AM";
    tp.hour = h % 12 === 0 ? 12 : h % 12;
    tp.min = m;
  } else {
    $("#timeDisplay").value = "";
    tp.hour = tp.min = tp.ampm = null;
  }
}

export function getValue() {
  return $("#evTime").value;
}

export function open() {
  render();
  $("#timepicker").classList.add("open");
  $("#timeTrigger").classList.add("active");
  ["#tpHours", "#tpMins", "#tpAmpm"].forEach((sel) => {
    const chosen = $(sel).querySelector(".sel");
    if (chosen) chosen.scrollIntoView({ block: "center" });
  });
}

export function close() {
  $("#timepicker").classList.remove("open");
  $("#timeTrigger").classList.remove("active");
}

export function clear() {
  setValue("");
  $("#evTime").value = "";
  render();
}

export function init() {
  $("#timeTrigger").addEventListener("click", (e) => {
    if (e.target.closest("#timeClear")) return;
    $("#timepicker").classList.contains("open") ? close() : open();
  });
  $("#timeClear").addEventListener("click", (e) => {
    e.stopPropagation();
    clear();
  });
}
