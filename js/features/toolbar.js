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
import {
  cloudEnabled,
  shareUrl,
  getTripIdFromHash,
} from "../core/backends/index.js";

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

async function shareTrip() {
  if (!cloudEnabled()) {
    toast("Add your Firebase config to enable sharing");
    return;
  }
  const url = shareUrl(getTripIdFromHash());
  try {
    await navigator.clipboard.writeText(url);
    toast("Share link copied ✓");
  } catch {
    // Clipboard blocked (e.g. non-secure context) — surface the link instead.
    window.prompt("Copy this share link:", url);
  }
}

export function init() {
  $("#searchBox").addEventListener("input", (e) => setFilter(e.target.value));
  $("#shareBtn").addEventListener("click", shareTrip);
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
