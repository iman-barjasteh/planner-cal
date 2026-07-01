// Pure date helpers. No DOM, no state — trivially testable and portable.

export const WEEKDAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
export const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "YYYY-MM-DD" -> local Date (midnight, no timezone drift).
export function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Date -> "YYYY-MM-DD".
export function keyOf(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayKey() {
  return keyOf(new Date());
}

// Inclusive list of Date objects between two "YYYY-MM-DD" strings.
export function eachDay(startStr, endStr) {
  const out = [];
  let cur = parseDate(startStr);
  const end = parseDate(endStr);
  while (cur <= end) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

// Inclusive list of day keys between two "YYYY-MM-DD" strings.
export function eachDayKey(startStr, endStr) {
  return eachDay(startStr, endStr).map(keyOf);
}

// "HH:MM" (24h) -> "H:MM AM/PM".
export function formatTime(t) {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, "0")} ${ap}`;
}

// "YYYY-MM-DD" -> "Mon, Jan 3, 2026".
export function prettyDate(str) {
  const d = parseDate(str);
  return `${WEEKDAYS[d.getDay()].slice(0, 3)}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// Sort comparator: timed events first (chronological), untimed last.
export function sortEvents(a, b) {
  if (a.time && b.time) return a.time.localeCompare(b.time);
  if (a.time) return -1;
  if (b.time) return 1;
  return 0;
}
