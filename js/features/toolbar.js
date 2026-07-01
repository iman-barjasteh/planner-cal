// Toolbar: search filter, export/import JSON, print, and clear-all.

import { $, toast } from "../utils/dom.js";
import {
  getState,
  subscribe,
  setFilter,
  clearAll,
  replaceAll,
  EXPORT_VERSION,
} from "../core/store.js";

function render() {
  const state = getState();
  const hasTrip = state.trip.start && state.trip.end;
  $("#toolbar").classList.toggle("hidden", !hasTrip);
}

function exportJSON() {
  const { trip, days } = getState();
  const payload = { version: EXPORT_VERSION, trip, days };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (trip.name || "trip").replace(/\s+/g, "_") + ".json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      replaceAll(data);
      toast("Trip imported ✓");
    } catch {
      toast("Invalid trip file");
    }
  };
  reader.readAsText(file);
}

export function init() {
  $("#searchBox").addEventListener("input", (e) => setFilter(e.target.value));
  $("#exportBtn").addEventListener("click", exportJSON);
  $("#importBtn").addEventListener("click", () => $("#importFile").click());
  $("#importFile").addEventListener("change", (e) => {
    if (e.target.files[0]) importJSON(e.target.files[0]);
    e.target.value = "";
  });
  $("#printBtn").addEventListener("click", () => window.print());
  $("#clearBtn").addEventListener("click", () => {
    if (confirm("Clear the entire trip and all events?")) {
      clearAll();
      toast("Cleared");
    }
  });
  subscribe(render);
}
