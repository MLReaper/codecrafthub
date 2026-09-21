const API = "/api/courses";

const form         = document.getElementById("course-form");
const formTitle    = document.getElementById("form-title");
const formSubtitle = document.getElementById("form-subtitle");
const submitLabel  = document.getElementById("submit-label");
const submitBtn    = document.getElementById("submit-btn");
const cancelBtn    = document.getElementById("cancel-btn");
const formError    = document.getElementById("form-error");
const courseList   = document.getElementById("courses");
const emptyState   = document.getElementById("empty-state");
const countBadge   = document.getElementById("count");
const headerCount  = document.getElementById("header-count");
const statsEl      = document.getElementById("stats");
const toast        = document.getElementById("toast");

const STATUS_CLASS = {
  "Not Started": "not-started",
  "In Progress": "in-progress",
  "Completed":   "completed",
};
const CARD_CLASS = {
  "Not Started": "s-not-started",
  "In Progress": "s-in-progress",
  "Completed":   "s-completed",
};

let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => (toast.hidden = true), 250);
  }, 2800);
}

function showError(msg) { formError.textContent = msg; formError.hidden = false; }
function clearError()   { formError.hidden = true; formError.textContent = ""; }

function formatDate(str) {
  if (!str) return "—";
  const [y, m, d] = str.split("-").map(Number);
  if (!y) return str;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

async function fetchJSON(url, opts) {
  const res  = await fetch(url, opts);
  const isJ  = res.headers.get("content-type")?.includes("application/json");
  const body = isJ ? await res.json() : null;
  if (!res.ok) throw new Error(body?.error || body?.message || `Error ${res.status}`);
  return body;
}

/* ── Stats ── */
function renderStats(s) {
  statsEl.innerHTML = `
    <div class="stat-card total">
      <div class="stat-icon-wrap"><span class="stat-icon">&#9783;</span></div>
      <div class="stat-body"><div class="stat-value">${s.total}</div><div class="stat-label">Total</div></div>
    </div>
    <div class="stat-card not-started">
      <div class="stat-icon-wrap"><span class="stat-icon">&#9675;</span></div>
      <div class="stat-body"><div class="stat-value">${s["Not Started"]}</div><div class="stat-label">Not Started</div></div>
    </div>
    <div class="stat-card in-progress">
      <div class="stat-icon-wrap"><span class="stat-icon">&#9654;</span></div>
      <div class="stat-body"><div class="stat-value">${s["In Progress"]}</div><div class="stat-label">In Progress</div></div>
    </div>
    <div class="stat-card completed">
      <div class="stat-icon-wrap"><span class="stat-icon">&#10003;</span></div>
      <div class="stat-body"><div class="stat-value">${s["Completed"]}</div><div class="stat-label">Completed</div></div>
    </div>
  `;
}

async function loadStats() {
  try {
    renderStats(await fetchJSON(`${API}/stats`));
  } catch { /* keep defaults */ }
}

/* ── Courses ── */
function renderCourses(courses) {
  countBadge.textContent = courses.length;
  headerCount.textContent = `${courses.length} course${courses.length === 1 ? "" : "s"}`;
  if (courses.length === 0) {
    courseList.innerHTML = "";
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;
  courseList.innerHTML = courses.map((c, i) => {
    const sc = STATUS_CLASS[c.status] || "not-started";
    const cc = CARD_CLASS[c.status]   || "s-not-started";
    const added = c.created_at
      ? `Added ${new Date(c.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
      : "";
    return `
      <article class="course-card ${cc}" data-id="${c.id}" style="animation-delay:${i * 40}ms">
        <div class="course-top">
          <div class="course-name">${escapeHtml(c.name)}</div>
          <span class="badge ${sc}">${escapeHtml(c.status)}</span>
        </div>
        <p class="course-desc">${escapeHtml(c.description)}</p>
        <div class="course-footer">
          <div class="course-meta-info">
            <div>Target: <strong>${escapeHtml(formatDate(c.target_date))}</strong></div>
            ${added ? `<div>${added}</div>` : ""}
          </div>
          <div class="card-actions">
            <button class="btn btn-icon edit"   data-action="edit">Edit</button>
            <button class="btn btn-icon delete" data-action="delete">Delete</button>
          </div>
        </div>
      </article>`;
  }).join("");
}

async function loadCourses() {
  try {
    renderCourses(await fetchJSON(API));
  } catch (err) {
    courseList.innerHTML = "";
    emptyState.hidden = false;
    document.querySelector(".empty-hint").textContent = `Could not load courses: ${err.message}`;
  }
}

/* ── Form ── */
function resetForm() {
  form.reset();
  document.getElementById("course-id").value = "";
  formTitle.textContent    = "Add a course";
  formSubtitle.textContent = "Fill in the details below";
  submitLabel.textContent  = "Add course";
  cancelBtn.hidden = true;
  clearError();
}

function fillForm(course) {
  document.getElementById("course-id").value    = course.id;
  document.getElementById("name").value         = course.name;
  document.getElementById("description").value  = course.description;
  document.getElementById("target_date").value = course.target_date;
  document.getElementById("status").value       = course.status;
  formTitle.textContent    = "Edit course";
  formSubtitle.textContent = "Update the details below";
  submitLabel.textContent  = "Save changes";
  cancelBtn.hidden = false;
  clearError();
  document.querySelector(".sidebar").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ── Events ── */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const id = document.getElementById("course-id").value;
  const payload = {
    name:        document.getElementById("name").value.trim(),
    description: document.getElementById("description").value.trim(),
    target_date: document.getElementById("target_date").value,
    status:      document.getElementById("status").value,
  };

  if (!payload.name || !payload.description || !payload.target_date) {
    showError("Please fill in the name, description, and target date.");
    return;
  }

  submitBtn.disabled = true;
  try {
    if (id) {
      await fetchJSON(`${API}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      showToast("Course updated");
    } else {
      await fetchJSON(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      showToast("Course added");
    }
    resetForm();
    await Promise.all([loadCourses(), loadStats()]);
  } catch (err) {
    showError(err.message);
  } finally {
    submitBtn.disabled = false;
  }
});

cancelBtn.addEventListener("click", resetForm);

courseList.addEventListener("click", async (e) => {
  const card = e.target.closest(".course-card");
  if (!card) return;
  const id     = card.dataset.id;
  const action = e.target.dataset.action;
  if (!action) return;

  if (action === "edit") {
    try { fillForm(await fetchJSON(`${API}/${id}`)); }
    catch (err) { showToast(err.message); }
  } else if (action === "delete") {
    if (!confirm("Delete this course? This cannot be undone.")) return;
    try {
      await fetchJSON(`${API}/${id}`, { method: "DELETE" });
      showToast("Course deleted");
      await Promise.all([loadCourses(), loadStats()]);
    } catch (err) { showToast(err.message); }
  }
});

loadCourses();
loadStats();
