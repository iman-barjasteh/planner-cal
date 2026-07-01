// Renders a single event card. Shared by the calendar and the backlog.

import { getCategory } from "../core/models.js";
import { formatTime } from "../utils/dates.js";
import { escapeHtml } from "../utils/dom.js";

// handlers: { onToggle(dayKey, id), onEdit(dayKey, id), onDelete(dayKey, id) }
export function renderEvent(dayKey, ev, handlers) {
  const c = getCategory(ev.cat);
  const el = document.createElement("div");
  el.className = "event" + (ev.done ? " done" : "");
  el.style.borderLeftColor = c.color;
  el.draggable = true;
  el.dataset.id = ev.id;
  el.dataset.key = dayKey;
  el.innerHTML = `
    <span class="cat-emoji">${c.icon}</span>
    <div class="ev-body">
      ${ev.time ? `<div class="ev-time">${formatTime(ev.time)}</div>` : ""}
      <div class="ev-text">${escapeHtml(ev.text)}</div>
      <div class="ev-cat">${c.label}${ev.link ? ` · <a class="ev-link" href="${escapeHtml(ev.link)}" target="_blank" rel="noopener" title="${escapeHtml(ev.link)}">🔗 link</a>` : ""}</div>
    </div>
    <div class="ev-actions">
      <button class="icon-btn" data-act="toggle" title="Mark done">✓</button>
      <button class="icon-btn" data-act="edit" title="Edit">✏️</button>
      <button class="icon-btn" data-act="del" title="Delete">🗑</button>
    </div>`;

  el.addEventListener("dragstart", (e) =>
    e.dataTransfer.setData("text/plain", JSON.stringify({ dk: dayKey, id: ev.id }))
  );
  el.querySelector(".ev-link")?.addEventListener("click", (e) => e.stopPropagation());
  el.querySelectorAll(".icon-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const act = btn.dataset.act;
      if (act === "toggle") handlers.onToggle(dayKey, ev.id);
      else if (act === "edit") handlers.onEdit(dayKey, ev.id);
      else if (act === "del") handlers.onDelete(dayKey, ev.id);
    });
  });
  return el;
}

// Filter predicate matching the monolith: matches text OR category label.
export function matchesFilter(ev, filter) {
  if (!filter) return true;
  const f = filter.toLowerCase();
  return (
    ev.text.toLowerCase().includes(f) ||
    getCategory(ev.cat).label.toLowerCase().includes(f)
  );
}
