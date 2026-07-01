// Persistence boundary. This is the ONLY module that touches localStorage.
// To port to another platform (e.g. an iOS app via Capacitor Preferences or a
// native bridge), swap this adapter's implementation and nothing else changes.

const backend = window.localStorage;

export const storage = {
  get(key) {
    try {
      const raw = backend.getItem(key);
      return raw == null ? null : JSON.parse(raw);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      backend.setItem(key, JSON.stringify(value));
    } catch {
      /* quota or private-mode errors are non-fatal */
    }
  },
  getString(key) {
    try {
      return backend.getItem(key);
    } catch {
      return null;
    }
  },
  setString(key, value) {
    try {
      backend.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
  remove(key) {
    try {
      backend.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
