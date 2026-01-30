document.addEventListener("DOMContentLoaded", () => {
  const activitiesListEl = document.getElementById("activities-list");
  const activitySelectEl = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageEl = document.getElementById("message");

  let activities = {};

  function showMessage(text, type = "info", timeout = 4000) {
    messageEl.className = `message ${type}`;
    messageEl.textContent = text;
    messageEl.classList.remove("hidden");
    if (timeout) setTimeout(() => (messageEl.classList.add("hidden")), timeout);
  }

  function createParticipantsSection(participants) {
    if (!participants || participants.length === 0) {
      return `<div class="participants-section"><span class="section-title">Participants</span><div class="no-participants">No participants yet.</div></div>`;
    }
    const items = participants
      .map((email) => `<li><span class="participant-email">${escapeHtml(email)}</span><button class="participant-remove" data-email="${escapeHtml(email)}" aria-label="Remove participant">✖</button></li>`)
      .join("");
    return `<div class="participants-section"><span class="section-title">Participants</span><ul class="participants-list">${items}</ul></div>`;
  }

  // handle remove participant clicks (event delegation)
  activitiesListEl.addEventListener("click", async (event) => {
    const btn = event.target.closest(".participant-remove");
    if (!btn) return;
    const card = btn.closest(".activity-card");
    if (!card) return;
    const activityName = card.dataset.activityName;
    const email = btn.dataset.email;
    if (!activityName || !email) return;
    try {
      const res = await fetch(`/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) {
        showMessage(body.detail || "Unregister failed", "error");
        return;
      }
      const idx = activities[activityName].participants.indexOf(email);
      if (idx !== -1) activities[activityName].participants.splice(idx, 1);
      updateActivityCardParticipants(activityName);
      showMessage(`Unregistered ${email} from ${activityName}`, "success");
    } catch (err) {
      showMessage(`Unregister error: ${err.message}`, "error");
    }
  });
  function escapeHtml(text) {
    return text.replace(/[&<>"'`=\/]/g, (s) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;", "=": "&#61;", "/": "&#47;" }[s]));
  }

  function renderActivities() {
    activitiesListEl.innerHTML = "";
    Object.entries(activities).forEach(([name, info]) => {
      const card = document.createElement("div");
      card.className = "activity-card";
      card.dataset.activityName = name;
      card.innerHTML = `
        <h4>${escapeHtml(name)}</h4>
        <p>${escapeHtml(info.description)}</p>
        <p><strong>Schedule:</strong> ${escapeHtml(info.schedule)}</p>
        <p><strong>Max Participants:</strong> ${escapeHtml(String(info.max_participants))}</p>
        ${createParticipantsSection(info.participants)}
      `;
      activitiesListEl.appendChild(card);
    });
  }

  function populateSelect() {
    // keep first option placeholder; then add options
    // remove existing non-placeholder options
    Array.from(activitySelectEl.querySelectorAll("option"))
      .forEach((opt) => { if (opt.value) opt.remove(); });

    Object.keys(activities).forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      activitySelectEl.appendChild(opt);
    });
  }

  async function loadActivities(silent = false) {
    if (!silent) activitiesListEl.innerHTML = "<p>Loading activities...</p>";
    try {
      const res = await fetch("/activities");
      if (!res.ok) throw new Error(`Failed to load activities (${res.status})`);
      activities = await res.json();
      renderActivities();
      populateSelect();
    } catch (err) {
      if (!silent) activitiesListEl.innerHTML = `<p class="error">Unable to load activities. ${escapeHtml(err.message)}</p>`;
    }
  }

  async function signup(event) {
    event.preventDefault();
    const email = document.getElementById("email").value.trim();
    const activityName = activitySelectEl.value;
    if (!email || !activityName) {
      showMessage("Please provide your email and select an activity.", "error");
      return;
    }

    const url = `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`;
    try {
      const res = await fetch(url, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        showMessage(body.detail || "Signup failed", "error");
        return;
      }

      // update in-memory activities and UI
      if (!activities[activityName].participants) activities[activityName].participants = [];
      activities[activityName].participants.push(email);
      updateActivityCardParticipants(activityName);
      // refresh activities silently so UI reflects server state (handles concurrent signups)
      await loadActivities(true);
      showMessage(`Signed up ${email} for ${activityName}`, "success");
      signupForm.reset();
    } catch (err) {
      showMessage(`Signup error: ${err.message}`, "error");
    }
  }

  function updateActivityCardParticipants(activityName) {
    const card = activitiesListEl.querySelector(`.activity-card[data-activity-name="${CSS.escape(activityName)}"]`);
    if (!card) return;
    const participantsSection = card.querySelector(".participants-section");
    if (participantsSection) {
      // replace section
      const newSectionHtml = createParticipantsSection(activities[activityName].participants);
      participantsSection.outerHTML = newSectionHtml;
      card.classList.add("updated");
      setTimeout(() => card.classList.remove("updated"), 800);
    } else {
      // append if missing
      card.insertAdjacentHTML("beforeend", createParticipantsSection(activities[activityName].participants));
    }
  }

  signupForm.addEventListener("submit", signup);
  loadActivities();
});
