// Backend selection + share-link (trip id) helpers.
// The trip id lives in the URL *fragment* (#trip=...) so the secret is never
// sent to servers, analytics, or Referer headers.

import { isConfigured } from "../firebaseConfig.js";
import { createLocalBackend } from "./localBackend.js";
import { createFirestoreBackend } from "./firestoreBackend.js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"; // no look-alikes

// 12 random characters ≈ 71 bits of entropy — unguessable capability id.
export function randomTripId() {
  const n = 12;
  const out = [];
  const buf = new Uint32Array(n);
  (globalThis.crypto || window.crypto).getRandomValues(buf);
  for (let i = 0; i < n; i++) out.push(ALPHABET[buf[i] % ALPHABET.length]);
  return out.join("");
}

export function getTripIdFromHash() {
  const m = /(?:^#|&)trip=([^&]+)/.exec(location.hash);
  return m ? decodeURIComponent(m[1]) : null;
}

export function setTripIdInHash(id) {
  location.hash = "trip=" + encodeURIComponent(id);
}

export function shareUrl(id) {
  const base = location.origin + location.pathname;
  return `${base}#trip=${encodeURIComponent(id)}`;
}

export const cloudEnabled = isConfigured;

// Decide which backend to use at startup.
export function selectBackend() {
  if (isConfigured()) {
    let tripId = getTripIdFromHash();
    if (!tripId) {
      tripId = randomTripId();
      setTripIdInHash(tripId);
    }
    return { mode: "cloud", tripId, backend: createFirestoreBackend(tripId) };
  }
  return { mode: "local", tripId: null, backend: createLocalBackend() };
}
