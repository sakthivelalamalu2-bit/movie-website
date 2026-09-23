const form = document.getElementById("movieForm");
const status = document.getElementById("status");
const list = document.getElementById("adminList");

async function loadAdmin() {
  const movies = await fetch("/api/movies").then(r => r.json());
  list.innerHTML = movies.length ? movies.map(m => `
    <div class="admin-row">
      <div><strong>${escapeHtml(m.title)}</strong><span>${escapeHtml(m.year || "")}</span></div>
      <button class="danger" onclick="removeMovie('${m.id}')">Delete</button>
    </div>
  `).join("") : `<p class="muted">No movies yet.</p>`;
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  status.textContent = "Uploading...";
  const result = await fetch("/api/movies", {
    method: "POST",
    body: new FormData(form)
  });
  const data = await result.json();

  if (!result.ok) {
    status.textContent = data.error || "Upload failed.";
    return;
  }

  form.reset();
  status.textContent = "Movie uploaded successfully.";
  loadAdmin();
});

async function removeMovie(id) {
  if (!confirm("Delete this movie?")) return;
  await fetch("/api/movies/" + id, { method: "DELETE" });
  loadAdmin();
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

loadAdmin();
