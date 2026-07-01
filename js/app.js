// Application bootstrap: load state, wire features, render once.

import * as store from "./core/store.js";
import * as tripPanel from "./features/tripPanel.js";
import * as datePicker from "./features/datePicker.js";
import * as timePicker from "./features/timePicker.js";
import * as eventModal from "./features/eventModal.js";
import * as calendar from "./features/calendar.js";
import * as backlog from "./features/backlog.js";
import * as stats from "./features/stats.js";
import * as toolbar from "./features/toolbar.js";
import * as clocks from "./features/clocks.js";

function init() {
  store.init();

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

  // Initial paint now that everything is subscribed.
  store.refresh();
}

document.addEventListener("DOMContentLoaded", init);
