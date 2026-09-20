const API = "/api/courses";

const form = document.getElementById("course-form");
const formTitle = document.getElementById("form-title");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const formError = document.getElementById("form-error");
const courseList = document.getElementById("courses");
const emptyState = document.getElementById("empty-state");
const countBadge = document.getElementById("count");
const statsContainer = document.getElementById("stats");
const toast = document.getElementById("toast");

const statusClass = {
  "Not Started": "not-started",
  "In Progress": "in-progress",
  "Completed": "completed",
};

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add("show"));
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => (toast.hidden = true), 250);
  }, 2500);
}

function showError(msg) {
  formError.textContent = msg;
  formError.hidden = false;
}
function clearError() {
  formError.hidden = true;
  formError.textContent = "";
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : null;
  if (!res.ok) {
    const msg = body?.error || body?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return body;
}

async function loadStats() {
  try {
    const stats = await fetchJSON(`${API}/stats`);
    statsContainer.innerHTML = `
      <div class="stat-card total"><div class="stat-value">${stats.total}</div><div class="stat-label">Total</div></div>
      <div class="stat-card not-started"><div class="stat-value">${stats["Not Started"]}</div><div class="stat-label">Not Started</div></div>
      <div class="stat-card in-progress"><div class="stat-value">${stats["In Progress"]}</div><div class="stat-label">In Progress</div></div>
      <div class="stat-card completed"><div class="stat-value">${stats["Completed"]}</div><div class="stat-label">Completed</div></div>
    `;
  } catch {
    statsContainer.innerHTML = "";
  }
}

function renderCourses(courses) {
  countBadge.textContent = courses.length;
  if (courses.length === 0) {
    courseList.innerHTML = "";
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;
  courseList.innerHTML = courses
    .map(
      (c) => `
      <article class="course-card" data-id="${c.id}">
        <div class="course-name">${escapeHtml(c.name)}</div>
        <p class="course-desc">${escapeHtml(c.description)}</p>
        <div class="course-meta">
          <span>Target: ${escapeHtml(c.target_date)}</span>
          <span class="badge ${statusClass[c.status] || "not-started"}">${escapeHtml(c.status)}</span>
        </div>
        <div class="course-meta">
          <span>Added ${formatDate(c.created_at)}</span>
        </div>
        <div class="card-actions">
          <button class="btn btn-edit" data-action="edit">Edit</button>
          <button class="btn btn-delete" data-action="delete">Delete</button>
        </div>
      </article>`
    )
    .join("");
}

async function loadCourses() {
  try {
    const courses = await fetchJSON(API);
    renderCourses(courses);
  } catch (err) {
    courseList.innerHTML = "";
    emptyState.hidden = false;
    emptyState.textContent = `Could not load courses: ${err.message}`;
  }
}

function resetForm() {
  form.reset();
  document.getElementById("course-id").value = "";
  formTitle.textContent = "Add a new course";
  submitBtn.textContent = "Add course";
  cancelBtn.hidden = true;
  clearError();
}

function fillForm(course) {
  document.getElementById("course-id").value = course.id;
  document.getElementById("name").value = course.name;
  document.getElementById("description").value = course.description;
  document.getElementById("target_date").value = course.target_date;
  document.getElementById("status").value = course.status;
  formTitle.textContent = "Edit course";
  submitBtn.textContent = "Save changes";
  cancelBtn.hidden = false;
  clearError();
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const id = document.getElementById("course-id").value;
  const payload = {
    name: document.getElementById("name").value.trim(),
    description: document.getElementById("description").value.trim(),
    target_date: document.getElementById("target_date").value,
    status: document.getElementById("status").value,
  };

  if (!payload.name || !payload.description || !payload.target_date) {
    showError("Please fill in name, description, and target date.");
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
  const id = card.dataset.id;
  const action = e.target.dataset.action;
  if (!action) return;

  if (action === "edit") {
    try {
      const course = await fetchJSON(`${API}/${id}`);
      fillForm(course);
    } catch (err) {
      showToast(err.message);
    }
  } else if (action === "delete") {
    if (!confirm("Delete this course?")) return;
    try {
      await fetchJSON(`${API}/${id}`, { method: "DELETE" });
      showToast("Course deleted");
      await Promise.all([loadCourses(), loadStats()]);
    } catch (err) {
      showToast(err.message);
    }
  }
});

loadCourses();
loadStats();
