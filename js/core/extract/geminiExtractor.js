// Calls the Gemini API to extract itinerary events from free-form pasted
// text (flight confirmations, hotel bookings, plain descriptions, ...).
// Client-side only — the user's own API key never leaves the browser except
// to talk directly to Google's endpoint.

import { getApiKey } from "../aiConfig.js";
import { CATEGORIES } from "../models.js";

const GEMINI_MODEL = "gemini-flash-latest";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    events: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          date: { type: "STRING" },
          time: { type: "STRING" },
          text: { type: "STRING" },
          category: { type: "STRING" },
          link: { type: "STRING" },
        },
        required: ["text"],
      },
    },
  },
  required: ["events"],
};

function buildPrompt(text, { validDayKeys, todayKey }) {
  const catIds = CATEGORIES.map((c) => c.id).join(", ");
  const days = validDayKeys.length
    ? validDayKeys.join(", ")
    : "(no trip built yet — leave date empty)";
  return `You extract travel itinerary events from raw pasted text: emails, booking confirmations, boarding passes, or plain free-form notes.

Trip day range available: ${days}
Today's date: ${todayKey}

Allowed category ids (use one id, exactly as spelled): ${catIds}

Find every distinct, concrete event in the text below. A single flight confirmation
usually contains TWO events (departure and landing); a hotel booking usually
contains TWO events (check-in and check-out). Split them out separately.

For each event return:
- date: "YYYY-MM-DD". Resolve relative/partial dates using today's date as context.
  If you cannot confidently determine a date, or it falls outside the trip day
  range above, return an empty string "".
- time: 24-hour "HH:MM" local time if mentioned, else "".
- text: a short, human-readable one-line description (e.g. "Flight AA123 to
  Tokyo Narita (NRT)"), rewritten for clarity — do not just copy raw text.
- category: the single best-fitting id from the allowed list above.
- link: a relevant URL from the text (booking/confirmation/boarding pass link)
  if present, else "".

Only extract real events actually present in the text. Do not invent details.

TEXT:
"""
${text}
"""`;
}

// Returns an array of { date, time, text, category, link }. Throws with a
// human-readable message on any failure (missing key, network, bad response).
export async function extractEvents(text, { validDayKeys = [], todayKey }) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("No Gemini API key configured");
  const trimmed = (text || "").trim();
  if (!trimmed) throw new Error("Paste some text first");

  const prompt = buildPrompt(trimmed, { validDayKeys, todayKey });

  let res;
  try {
    res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.2,
        },
      }),
    });
  } catch {
    throw new Error("Network error reaching Gemini — check your connection");
  }

  if (!res.ok) {
    let detail = "";
    try {
      const errBody = await res.json();
      detail = errBody?.error?.message || "";
    } catch {
      /* ignore */
    }
    if (res.status === 400 || res.status === 403) {
      throw new Error("Gemini rejected the request — check your API key. " + detail);
    }
    if (res.status === 429) {
      throw new Error("Gemini rate limit hit — wait a moment and try again");
    }
    throw new Error(`Gemini API error ${res.status}${detail ? ": " + detail : ""}`);
  }

  const data = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) {
    const blockReason = data?.promptFeedback?.blockReason;
    throw new Error(blockReason ? `Gemini blocked the request (${blockReason})` : "Empty response from Gemini");
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Gemini returned malformed data");
  }
  return Array.isArray(parsed.events) ? parsed.events : [];
}
