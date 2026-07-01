// LocalBackend — persistence in the browser via localStorage.
// Preserves the original offline, single-device behavior. All granular hooks
// simply re-persist the whole state, which is cheap at trip scale.

import { storage } from "../storage.js";

const STORE_KEY = "wanderlust_trip_v2";
const LEGACY_KEY = "wanderlust_trip_v1";
const EXPORT_VERSION = 2;

export function createLocalBackend() {
  let getState = () => ({ trip: {}, days: {} });

  function persist() {
    const s = getState();
    storage.set(STORE_KEY, { version: EXPORT_VERSION, trip: s.trip, days: s.days });
  }

  return {
    mode: "local",

    attach(ctx) {
      getState = ctx.getState;
    },

    async start() {
      let raw = storage.get(STORE_KEY);
      if (!raw) {
        const legacy = storage.get(LEGACY_KEY);
        if (legacy) raw = legacy; // one-time migration from the old monolith key
      }
      return raw; // store.normalize() handles v1/v2/partial shapes
    },

    saveMeta() {
      persist();
    },
    upsertEvent() {
      persist();
    },
    removeEvent() {
      persist();
    },
    replace() {
      persist();
    },
    clear() {
      storage.remove(STORE_KEY);
    },
  };
}
