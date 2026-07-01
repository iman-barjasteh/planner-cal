// Dual world clocks with searchable time-zone comboboxes. Independent of the
// trip store; persists the two chosen zones via the storage adapter.

import { $, toast } from "../utils/dom.js";
import { storage } from "../core/storage.js";
import { TIMEZONES } from "../data/timezones.js";

const TZ_KEY1 = "wl_tz1";
const TZ_KEY2 = "wl_tz2";

// Local working copy so we can prepend the user's detected zone if missing.
const zones = TIMEZONES.slice();

function tzShort(zone) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "short",
    }).formatToParts(new Date());
    const tn = parts.find((p) => p.type === "timeZoneName");
    return tn ? tn.value : "";
  } catch {
    return "";
  }
}

function tzInfo(zone) {
  return (
    zones.find((d) => d.zone === zone) || {
      zone,
      city: zone.split("/").pop().replace(/_/g, " "),
      country: "Local",
    }
  );
}

function comboLabel(zone) {
  const i = tzInfo(zone);
  return `${i.city}, ${i.country}`;
}

function clockParts(zone) {
  const now = new Date();
  const t = now.toLocaleTimeString("en-US", {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const m = t.match(/(.*)\s(AM|PM)$/i);
  return {
    time: m ? m[1] : t,
    ampm: m ? m[2] : "",
    date: now.toLocaleDateString("en-US", {
      timeZone: zone,
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
  };
}

function paintClock(timeId, dateId, zone) {
  if (!zone) return;
  const p = clockParts(zone);
  const i = tzInfo(zone);
  const sh = tzShort(zone);
  $(timeId).innerHTML = `${p.time}<span class="ampm">${p.ampm}</span>`;
  $(dateId).textContent = `${i.city} · ${p.date}${sh ? " · " + sh : ""}`;
}

function localZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
  } catch {
    return "America/New_York";
  }
}

let combo1;
let combo2;

function tick() {
  if (combo1) paintClock("#time1", "#date1", combo1.get());
  if (combo2) paintClock("#time2", "#date2", combo2.get());
}

function makeCombo(idx, initialZone, onChange) {
  const input = $(`#tz${idx}Input`);
  const list = $(`#tz${idx}List`);
  let selected = initialZone;
  let active = -1;

  function commit(zone) {
    selected = zone;
    input.value = comboLabel(zone);
    onChange(zone);
  }
  function renderList(filter) {
    const f = (filter || "").trim().toLowerCase();
    const items = zones.filter(
      (d) =>
        !f ||
        d.city.toLowerCase().includes(f) ||
        d.country.toLowerCase().includes(f) ||
        d.zone.toLowerCase().includes(f)
    );
    list.innerHTML = "";
    active = -1;
    if (!items.length) {
      list.innerHTML = `<div class="tz-empty">No matches</div>`;
      return;
    }
    items.forEach((d) => {
      const el = document.createElement("div");
      el.className = "tz-item" + (d.zone === selected ? " sel" : "");
      el.dataset.zone = d.zone;
      el.innerHTML = `<span>${d.city}</span><span class="tz-c">${d.country} · ${tzShort(d.zone)}</span>`;
      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        commit(d.zone);
        close();
      });
      list.appendChild(el);
    });
  }
  function open() {
    renderList("");
    list.classList.add("open");
  }
  function close() {
    list.classList.remove("open");
    input.value = comboLabel(selected);
  }
  function move(dir) {
    const opts = [...list.querySelectorAll(".tz-item")];
    if (!opts.length) return;
    active = (active + dir + opts.length) % opts.length;
    opts.forEach((o, i) => o.classList.toggle("active", i === active));
    opts[active].scrollIntoView({ block: "nearest" });
  }

  input.addEventListener("focus", () => {
    input.value = "";
    open();
  });
  input.addEventListener("input", () => {
    renderList(input.value);
    list.classList.add("open");
  });
  input.addEventListener("blur", () => setTimeout(close, 150));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!list.classList.contains("open")) open();
      else move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opts = [...list.querySelectorAll(".tz-item")];
      const pick = active >= 0 ? opts[active] : opts[0];
      if (pick) {
        commit(pick.dataset.zone);
        close();
        input.blur();
      }
    } else if (e.key === "Escape") {
      close();
      input.blur();
    }
  });

  input.value = comboLabel(selected);
  return { get: () => selected, set: commit };
}

export function init() {
  const local = localZone();
  if (!zones.some((d) => d.zone === local)) {
    zones.unshift({
      zone: local,
      city: local.split("/").pop().replace(/_/g, " "),
      country: "Your location",
    });
  }
  const ensure = (z, fb) => (zones.some((d) => d.zone === z) ? z : fb);
  const z1 = ensure(storage.getString(TZ_KEY1) || "America/New_York", "America/New_York");
  const z2 = ensure(storage.getString(TZ_KEY2) || local, local);
  combo1 = makeCombo(1, z1, (z) => {
    storage.setString(TZ_KEY1, z);
    tick();
  });
  combo2 = makeCombo(2, z2, (z) => {
    storage.setString(TZ_KEY2, z);
    tick();
  });
  $("#tzAuto").addEventListener("click", () => {
    combo2.set(local);
    toast("Using your local time zone");
  });
  tick();
  setInterval(tick, 1000);
}
