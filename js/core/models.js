// Event categories and domain helpers. Pure — safe to reuse on any platform.

export const BACKLOG_KEY = "backlog";

export const CATEGORIES = [
  { id: "sightseeing", label: "Sightseeing", color: "#6c8bff", icon: "📸" },
  { id: "food", label: "Food", color: "#ff7eb6", icon: "🍜" },
  { id: "transport", label: "Transport", color: "#38d6c4", icon: "🚆" },
  { id: "departure", label: "Flight Departure", color: "#5e9bf0", icon: "🛫" },
  { id: "flight", label: "Flight Landing", color: "#4cc9f0", icon: "🛬" },
  { id: "checkin", label: "Check-in", color: "#43d49a", icon: "🛎️" },
  { id: "checkout", label: "Check-out", color: "#f4a261", icon: "🧳" },
  { id: "lodging", label: "Lodging", color: "#ffb86c", icon: "🏨" },
  { id: "activity", label: "Activity", color: "#a16bff", icon: "🎟️" },
  { id: "other", label: "Other", color: "#9aa0c7", icon: "📌" },
];

export const DEFAULT_CATEGORY = "sightseeing";

export function getCategory(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES.find((c) => c.id === "other");
}

// Collision-resistant id for a new event.
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Ensure a link has a protocol so it opens correctly.
export function normalizeLink(url) {
  const v = (url || "").trim();
  if (!v) return "";
  return /^https?:\/\//i.test(v) ? v : "https://" + v;
}

// Factory for a new event, filling in sensible defaults.
export function createEvent({ time = "", text = "", cat = DEFAULT_CATEGORY, link = "" } = {}) {
  return { id: uid(), time, text, cat, done: false, link: normalizeLink(link) };
}
