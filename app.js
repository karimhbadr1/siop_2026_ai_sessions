const agenda = document.getElementById("agenda");
const search = document.getElementById("search");
const typeFilter = document.getElementById("typeFilter");
const sessionCount = document.getElementById("sessionCount");
const dayTabs = document.getElementById("dayTabs");
const tpl = document.getElementById("sessionTemplate");

let allSessions = [];
let activeDay = "";

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

function render() {
  const query = search.value.trim().toLowerCase();
  const type = typeFilter.value;
  const filtered = allSessions.filter((s) => matches(s, query, type));
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
      render();
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
    node.querySelector('[data-field="time"]').textContent = formatTimeRange(session);
    node.querySelector('[data-field="title"]').textContent = session.title;
    node.querySelector('[data-field="type"]').textContent = session.type;
    node.querySelector('[data-field="session_id"]').textContent = session.session_id;
    node.querySelector('[data-field="submitter"]').textContent = session.submitter;
    node.querySelector('[data-field="location"]').textContent = session.location || "TBD";
    node.querySelector('[data-field="primary_area"]').textContent = session.primary_area;
    node.querySelector('[data-field="secondary_area"]').textContent = session.secondary_area;
    node.querySelector('[data-field="citation"]').textContent = session.citation;
    section.appendChild(node);
  }
  agenda.appendChild(section);
}

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
    render();
  });

search.addEventListener("input", render);
typeFilter.addEventListener("change", render);
