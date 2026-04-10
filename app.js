const agenda = document.getElementById("agenda");
const wishlistList = document.getElementById("wishlistList");
const agendaView = document.getElementById("agendaView");
const wishlistView = document.getElementById("wishlistView");
const search = document.getElementById("search");
const typeFilter = document.getElementById("typeFilter");
const sessionCount = document.getElementById("sessionCount");
const wishlistCount = document.getElementById("wishlistCount");
const dayTabs = document.getElementById("dayTabs");
const exportCsvBtn = document.getElementById("exportCsv");
const printPdfBtn = document.getElementById("printPdf");
const agendaToolbar = document.getElementById("agendaToolbar");
const viewTabs = document.querySelectorAll(".view-tab");
const tpl = document.getElementById("sessionTemplate");
const wishlistTpl = document.getElementById("wishlistTemplate");

let allSessions = [];
let activeDay = "";
let activeView = "agenda";
const wishlistKey = "ai-agenda-wishlist-v1";

function loadWishlist() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(wishlistKey) || "[]").map(String));
  } catch {
    return new Set();
  }
}

function saveWishlist(set) {
  sessionStorage.setItem(wishlistKey, JSON.stringify([...set]));
}

let wishlist = loadWishlist();

function applyTheme() {
  const root = document.documentElement;
  root.style.setProperty("--accent", "#1f6f78");
  root.style.setProperty("--bg", "#f6f1e8");
  root.style.setProperty("--card", "rgba(255, 255, 255, 0.9)");
}

function formatDay(value) {
  if (!value) return "Unscheduled";
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTimeRange(session) {
  if (!session.start_label) return "Time unavailable";
  const dayLabel = session.start_label.split(",")[0];
  const start = session.start_time_only || "";
  const end = session.end_time_only || "";
  return end ? `${dayLabel}, ${start} - ${end}` : `${dayLabel}, ${start}`;
}

function matches(session, query, type) {
  const haystack = [session.session_id, session.title, session.type, session.submitter, session.citation, session.location, session.primary_area, session.secondary_area].join(" ").toLowerCase();
  return (!query || haystack.includes(query)) && (!type || session.type === type);
}

function groupedFilteredSessions() {
  const query = search.value.trim().toLowerCase();
  const type = typeFilter.value;
  return allSessions.filter((s) => matches(s, query, type));
}

function updateWishlistCount() {
  wishlistCount.textContent = wishlist.size;
}

function renderWishlist() {
  wishlistList.innerHTML = "";
  const items = allSessions.filter((s) => wishlist.has(String(s.session_id)));
  updateWishlistCount();

  if (!items.length) {
    wishlistList.innerHTML = '<div class="empty">No saved sessions yet.</div>';
    return;
  }

  for (const session of items) {
    const node = wishlistTpl.content.cloneNode(true);
    node.querySelector('[data-field="time"]').textContent = formatTimeRange(session);
    node.querySelector('[data-field="title"]').textContent = session.title;
    node.querySelector('[data-field="type"]').textContent = `${session.type} - ${session.location || "TBD"}`;
    node.querySelector('[data-action="remove"]').addEventListener("click", () => {
      wishlist.delete(String(session.session_id));
      saveWishlist(wishlist);
      render();
    });
    wishlistList.appendChild(node);
  }
}

function renderAgenda() {
  const filtered = groupedFilteredSessions();
  sessionCount.textContent = filtered.length;

  const groups = new Map();
  const order = [];
  for (const session of filtered) {
    const key = session.start_iso ? session.start_iso.slice(0, 10) : "Unscheduled";
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key).push(session);
  }

  if (!activeDay || !groups.has(activeDay)) {
    activeDay = order[0] || "";
  }

  dayTabs.innerHTML = "";
  for (const day of order) {
    const button = document.createElement("button");
    button.className = `tab${day === activeDay ? " active" : ""}`;
    button.type = "button";
    button.textContent = day === "Unscheduled" ? day : formatDay(`${day}T00:00:00`);
    button.addEventListener("click", () => {
      activeDay = day;
      renderAgenda();
    });
    dayTabs.appendChild(button);
  }

  agenda.innerHTML = "";
  if (!filtered.length) {
    agenda.innerHTML = '<div class="empty">No sessions match your filters.</div>';
    return;
  }

  const sessions = groups.get(activeDay) || [];
  const section = document.createElement("section");
  section.className = "day";
  section.innerHTML = `<h3>${activeDay === "Unscheduled" ? activeDay : formatDay(`${activeDay}T00:00:00`)}</h3>`;
  for (const session of sessions) {
    const node = tpl.content.cloneNode(true);
    const sessionId = String(session.session_id);
    node.querySelector('[data-field="time"]').textContent = formatTimeRange(session);
    node.querySelector('[data-field="title"]').textContent = session.title;
    node.querySelector('[data-field="type"]').textContent = session.type;
    node.querySelector('[data-field="session_id"]').textContent = session.session_id;
    node.querySelector('[data-field="submitter"]').textContent = session.submitter;
    node.querySelector('[data-field="location"]').textContent = session.location || "TBD";
    node.querySelector('[data-field="primary_area"]').textContent = session.primary_area;
    node.querySelector('[data-field="secondary_area"]').textContent = session.secondary_area;
    node.querySelector('[data-field="citation"]').textContent = session.citation;

    const saveBtn = node.querySelector('[data-action="save"]');
    const syncLabel = () => {
      saveBtn.textContent = wishlist.has(sessionId) ? "Saved" : "Save to agenda";
      saveBtn.classList.toggle("saved", wishlist.has(sessionId));
    };
    syncLabel();
    saveBtn.addEventListener("click", () => {
      if (wishlist.has(sessionId)) {
        wishlist.delete(sessionId);
      } else {
        wishlist.add(sessionId);
      }
      saveWishlist(wishlist);
      syncLabel();
      renderWishlist();
      updateWishlistCount();
    });

    section.appendChild(node);
  }
  agenda.appendChild(section);
}

function render() {
  renderAgenda();
  renderWishlist();
}

function exportCsv() {
  const items = allSessions.filter((s) => wishlist.has(String(s.session_id)));
  const header = ["Session ID", "Title", "Type", "Main submitter", "Citation", "Location", "Time", "Primary area", "Secondary area"];
  const rows = items.map((s) => [
    s.session_id,
    s.title,
    s.type,
    s.submitter,
    s.citation,
    s.location,
    formatTimeRange(s),
    s.primary_area,
    s.secondary_area,
  ]);
  const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = [header.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))].join("\r\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "my-ai-agenda.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function openPrintWindow() {
  const items = allSessions.filter((s) => wishlist.has(String(s.session_id)));
  const rows = items
    .map(
      (s) => `
        <article class="print-item">
          <h2>${escapeHtml(s.title)}</h2>
          <p>${escapeHtml(formatTimeRange(s))}</p>
          <p>${escapeHtml(s.type)} - ${escapeHtml(s.location || "TBD")}</p>
          <p>${escapeHtml(s.submitter)}</p>
          <p>${escapeHtml(s.citation)}</p>
        </article>
      `
    )
    .join("");

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>My AI Agenda</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
          h1 { margin: 0 0 16px; }
          .print-item { page-break-inside: avoid; margin: 0 0 18px; padding-bottom: 18px; border-bottom: 1px solid #ccc; }
          .print-item h2 { margin: 0 0 8px; font-size: 18px; }
          .print-item p { margin: 4px 0; }
        </style>
      </head>
      <body>
        <h1>My AI Agenda</h1>
        ${rows || "<p>No saved sessions.</p>"}
        <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300); };</script>
      </body>
    </html>
  `;

  const win = window.open("", "_blank", "width=900,height=700");
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setView(view) {
  activeView = view;
  viewTabs.forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  const agendaVisible = view === "agenda";
  agendaToolbar.hidden = !agendaVisible;
  agendaView.hidden = !agendaVisible;
  wishlistView.hidden = agendaVisible;
  if (agendaVisible) renderAgenda();
  else renderWishlist();
}

viewTabs.forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

fetch("data/ai_sessions.json")
  .then((r) => r.json())
  .then((data) => {
    allSessions = data.sessions || [];
    const types = [...new Set(allSessions.map((s) => s.type).filter(Boolean))].sort();
    for (const type of types) {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = type;
      typeFilter.appendChild(option);
    }
    sessionCount.textContent = allSessions.length;
    activeDay = allSessions[0]?.start_iso ? allSessions[0].start_iso.slice(0, 10) : "Unscheduled";
    applyTheme();
    setView("agenda");
    updateWishlistCount();
  });

search.addEventListener("input", renderAgenda);
typeFilter.addEventListener("change", renderAgenda);
exportCsvBtn.addEventListener("click", exportCsv);
printPdfBtn.addEventListener("click", openPrintWindow);
