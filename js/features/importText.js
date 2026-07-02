// "Smart Add" — paste an email/confirmation/plain text, extract events via
// Gemini, then let the user review/edit each candidate before committing.

import { $, $all, toast, escapeHtml } from "../utils/dom.js";
import { CATEGORIES, DEFAULT_CATEGORY, BACKLOG_KEY } from "../core/models.js";
import { getState, addEvent } from "../core/store.js";
import { eachDayKey, prettyDate, todayKey } from "../utils/dates.js";
import { getApiKey, setApiKey, isAiConfigured } from "../core/aiConfig.js";
import { extractEvents } from "../core/extract/geminiExtractor.js";

let drafts = []; // { date, time, text, cat, link }
let loading = false;

function validDayKeys() {
  const { trip } = getState();
  if (!trip.start || !trip.end) return [];
  return eachDayKey(trip.start, trip.end);
}

function dayOptionsHtml(selected) {
  const days = validDayKeys();
  const opts = days.map(
    (dk) => `<option value="${dk}"${dk === selected ? " selected" : ""}>${escapeHtml(prettyDate(dk))}</option>`
  );
  opts.push(
    `<option value="${BACKLOG_KEY}"${selected === BACKLOG_KEY ? " selected" : ""}>💡 Things to do (unscheduled)</option>`
  );
  return opts.join("");
}

function catOptionsHtml(selected) {
  return CATEGORIES.map(
    (c) => `<option value="${c.id}"${c.id === selected ? " selected" : ""}>${c.icon} ${c.label}</option>`
  ).join("");
}

function mapDate(rawDate) {
  const days = validDayKeys();
  if (rawDate && days.includes(rawDate)) return rawDate;
  return BACKLOG_KEY;
}

function updateKeyUi() {
  const configured = isAiConfigured();
  $("#aiKeyField").classList.toggle("hidden", configured);
  $("#aiKeySaved").classList.toggle("hidden", !configured);
}

function renderResults() {
  const list = $("#aiResultsList");
  list.innerHTML = "";
  if (drafts.length === 0) {
    list.innerHTML = `<div class="empty">No events left — add a key/text and extract again, or close this.</div>`;
    $("#aiResultsHead").textContent = "No events to add";
    return;
  }
  $("#aiResultsHead").textContent = `Review extracted events (${drafts.length})`;
  drafts.forEach((d, i) => {
    const row = document.createElement("div");
    row.className = "ai-item";
    row.dataset.idx = String(i);
    const isBacklog = d.date === BACKLOG_KEY;
    row.innerHTML = `
      <div class="ai-item-grid">
        <select class="ai-day" data-field="date">${dayOptionsHtml(d.date)}</select>
        <input class="ai-time" data-field="time" type="time" value="${escapeHtml(d.time || "")}" ${isBacklog ? "disabled" : ""} />
        <select class="ai-cat" data-field="cat">${catOptionsHtml(d.cat)}</select>
        <button class="icon-btn ai-remove" title="Remove">🗑</button>
      </div>
      <input class="ai-text" data-field="text" type="text" value="${escapeHtml(d.text)}" placeholder="What's the plan?" />
      <input class="ai-link" data-field="link" type="url" value="${escapeHtml(d.link || "")}" placeholder="Link (optional)" />
    `;
    list.appendChild(row);
  });
}

function readDraftsFromDom() {
  $all("#aiResultsList .ai-item").forEach((row) => {
    const idx = Number(row.dataset.idx);
    const d = drafts[idx];
    if (!d) return;
    d.date = row.querySelector(".ai-day").value;
    d.time = row.querySelector(".ai-time").value;
    d.cat = row.querySelector(".ai-cat").value;
    d.text = row.querySelector(".ai-text").value;
    d.link = row.querySelector(".ai-link").value;
  });
}

function showStep(step) {
  // step: "input" | "results"
  $("#aiTextField").classList.toggle("hidden", step !== "input");
  $("#aiExtractActions").classList.toggle("hidden", step !== "input");
  $("#aiResults").classList.toggle("hidden", step !== "results");
}

function resetModal() {
  drafts = [];
  loading = false;
  $("#aiText").value = "";
  showStep("input");
  updateKeyUi();
  setExtractLoading(false);
}

export function openImportModal() {
  resetModal();
  $("#aiOverlay").classList.add("open");
  setTimeout(() => {
    if (!isAiConfigured()) $("#aiKeyInput").focus();
    else $("#aiText").focus();
  }, 50);
}

export function closeImportModal() {
  $("#aiOverlay").classList.remove("open");
}

function setExtractLoading(on) {
  loading = on;
  const btn = $("#aiExtractBtn");
  btn.disabled = on;
  btn.textContent = on ? "Extracting…" : "✨ Extract events";
}

async function runExtract() {
  if (loading) return;
  if (!isAiConfigured()) {
    toast("Save your Gemini API key first");
    $("#aiKeyInput").focus();
    return;
  }
  const text = $("#aiText").value.trim();
  if (!text) {
    toast("Paste some text first");
    return;
  }
  setExtractLoading(true);
  try {
    const found = await extractEvents(text, {
      validDayKeys: validDayKeys(),
      todayKey: todayKey(),
    });
    if (found.length === 0) {
      toast("No events found in that text");
      return;
    }
    drafts = found.map((f) => ({
      date: mapDate((f.date || "").trim()),
      time: /^\d{2}:\d{2}$/.test(f.time || "") ? f.time : "",
      text: (f.text || "").trim() || "Untitled event",
      cat: CATEGORIES.some((c) => c.id === f.category) ? f.category : DEFAULT_CATEGORY,
      link: (f.link || "").trim(),
    }));
    renderResults();
    showStep("results");
  } catch (err) {
    toast(err.message || "Extraction failed");
  } finally {
    setExtractLoading(false);
  }
}

function addAllDrafts() {
  readDraftsFromDom();
  let count = 0;
  drafts.forEach((d) => {
    if (!d.text.trim()) return;
    addEvent(d.date, {
      text: d.text.trim(),
      time: d.date === BACKLOG_KEY ? "" : d.time,
      cat: d.cat,
      link: d.link,
    });
    count++;
  });
  closeImportModal();
  toast(count ? `Added ${count} event${count === 1 ? "" : "s"} ✓` : "Nothing to add");
}

export function init() {
  $("#aiImportBtn").addEventListener("click", openImportModal);
  $("#aiCancelBtn").addEventListener("click", closeImportModal);
  $("#aiOverlay").addEventListener("click", (e) => {
    if (e.target === $("#aiOverlay")) closeImportModal();
  });

  $("#aiKeySaveBtn").addEventListener("click", () => {
    const key = $("#aiKeyInput").value.trim();
    if (!key) {
      toast("Paste a key first");
      return;
    }
    setApiKey(key);
    $("#aiKeyInput").value = "";
    updateKeyUi();
    toast("Gemini key saved ✓");
    $("#aiText").focus();
  });
  $("#aiKeyChangeBtn").addEventListener("click", () => {
    $("#aiKeyInput").value = getApiKey();
    $("#aiKeyField").classList.remove("hidden");
    $("#aiKeySaved").classList.add("hidden");
    $("#aiKeyInput").focus();
  });

  $("#aiExtractBtn").addEventListener("click", runExtract);
  $("#aiBackBtn").addEventListener("click", () => {
    readDraftsFromDom();
    showStep("input");
  });
  $("#aiAddAllBtn").addEventListener("click", addAllDrafts);

  $("#aiResultsList").addEventListener("click", (e) => {
    const btn = e.target.closest(".ai-remove");
    if (!btn) return;
    readDraftsFromDom();
    const row = btn.closest(".ai-item");
    const idx = Number(row.dataset.idx);
    drafts.splice(idx, 1);
    renderResults();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && $("#aiOverlay").classList.contains("open")) {
      closeImportModal();
    }
  });
}
