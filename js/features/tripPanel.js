// Trip control panel: name input, date fields, and the build button.

import { $, toast } from "../utils/dom.js";
import { getState, subscribe, buildTrip } from "../core/store.js";
import { parseDate } from "../utils/dates.js";
import * as datePicker from "./datePicker.js";

function syncFromState() {
  const { trip } = getState();
  if ($("#tripName").value !== (trip.name || "")) {
    $("#tripName").value = trip.name || "";
  }
  const range = datePicker.getRange();
  if (range.start !== (trip.start || "") || range.end !== (trip.end || "")) {
    datePicker.setRange(trip.start, trip.end);
  }
}

function build() {
  const { start, end } = datePicker.getRange();
  if (!start || !end) {
    toast("Pick both start and end dates");
    return;
  }
  if (parseDate(end) < parseDate(start)) {
    toast("End date must be after start date");
    return;
  }
  buildTrip({ name: $("#tripName").value.trim(), start, end });
  toast("Calendar ready — start planning! 🎉");
}

export function init() {
  $("#buildBtn").addEventListener("click", build);
  subscribe(syncFromState);
}
