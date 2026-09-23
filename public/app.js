const grid = document.getElementById("movieGrid");
const empty = document.getElementById("empty");
const search = document.getElementById("search");
let movies = [];

async function loadMovies() {
  movies = await fetch("/api/movies").then(r => r.json());
  render();
}

function render() {
  const q = (search.value || "").toLowerCase();
  const filtered = movies.filter(m =>
    `${m.title} ${m.language} ${m.genre}`.toLowerCase().includes(q)
  );

  grid.innerHTML = filtered.map(m => `
    <article class="card">
      ${m.poster ? `<img src="${m.poster}" alt="">` : `<div class="poster-placeholder">🎬</div>`}
      <div class="card-body">
        <h3>${escapeHtml(m.title)}</h3>
        <p>${escapeHtml([m.year, m.language, m.genre].filter(Boolean).join(" • "))}</p>
        <p class="desc">${escapeHtml(m.description || "No description.")}</p>
        <a class="btn small" href="${m.movieUrl}" download>Download</a>
      </div>
    </article>
  `).join("");

  empty.style.display = filtered.length ? "none" : "block";
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

search.addEventListener("input", render);
loadMovies();
