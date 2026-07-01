// Application bootstrap: pick a persistence backend, wire features, render.

import * as store from "./core/store.js";
import { selectBackend } from "./core/backends/index.js";
import * as tripPanel from "./features/tripPanel.js";
import * as datePicker from "./features/datePicker.js";
import * as timePicker from "./features/timePicker.js";
import * as eventModal from "./features/eventModal.js";
import * as calendar from "./features/calendar.js";
import * as backlog from "./features/backlog.js";
import * as stats from "./features/stats.js";
import * as toolbar from "./features/toolbar.js";
import * as clocks from "./features/clocks.js";

async function init() {
  const { backend, mode } = selectBackend();

  // Widgets and independent features.
  clocks.init();
  datePicker.init();
  timePicker.init();
  eventModal.init();

  // Store-driven feature views (each subscribes to the store).
  tripPanel.init();
  stats.init();
  toolbar.init();
  backlog.init();
  calendar.init();

  // Global shortcut: Escape closes the modal and the date picker.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      eventModal.closeModal();
      datePicker.close();
    }
  });

  // Load persisted/remote data, then paint. Cloud backends keep pushing updates.
  // A cloud/network failure must not leave a blank page — always render.
  try {
    await store.init(backend);
  } catch (e) {
    console.error("Backend init failed; starting empty.", e);
  }
  store.refresh();

  // Opening a different shared trip link → reinitialize cleanly.
  window.addEventListener("hashchange", () => {
    if (mode === "cloud") location.reload();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
