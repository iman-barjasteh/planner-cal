// Gemini API key storage. Bring-your-own-key: the key lives only in this
// browser's localStorage and is sent only to Google's API, never to us or
// any other backend. Mirrors the optional-cloud-feature pattern used for
// Firebase — the app works fully without it, and unlocks AI extraction once
// a key is present.

const STORAGE_KEY = "wanderlust.ai.geminiKey";

export function getApiKey() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function setApiKey(key) {
  try {
    const v = (key || "").trim();
    if (v) localStorage.setItem(STORAGE_KEY, v);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (e.g. private mode) — silently no-op.
  }
}

export function isAiConfigured() {
  return !!getApiKey();
}
