const form = document.getElementById("movieForm");
const status = document.getElementById("status");
const list = document.getElementById("adminList");

/* ================================
   LOAD MOVIES
================================ */

async function loadAdmin() {
  try {
    const response = await fetch("/api/movies");

    if (!response.ok) {
      throw new Error("Failed to load movies");
    }

    const movies = await response.json();

    list.innerHTML = movies.length
      ? movies
          .map(
            (m) => `
              <div class="admin-row">
                <div>
                  <strong>${escapeHtml(m.title)}</strong>
                  <span>${escapeHtml(m.year || "")}</span>
                </div>

                <button
                  class="danger"
                  onclick="removeMovie('${m.id}')"
                >
                  Delete
                </button>
              </div>
            `
          )
          .join("")
      : `<p class="muted">No movies yet.</p>`;
  } catch (error) {
    console.error(error);

    list.innerHTML = `
      <p class="error">
        Failed to load movies.
      </p>
    `;
  }
}

/* ================================
   UPLOAD MOVIE
================================ */

form.addEventListener("submit", function (e) {
  e.preventDefault();

  const formData = new FormData(form);

  const movieFile = form.querySelector(
    'input[name="movie"]'
  ).files[0];

  if (!movieFile) {
    status.innerHTML = `
      <p class="error">
        ❌ Please select a movie file.
      </p>
    `;
    return;
  }

  const totalMB = (
    movieFile.size /
    1024 /
    1024
  ).toFixed(2);

  /* Show upload interface */

  status.innerHTML = `
    <div id="uploadInfo">

      <strong>Uploading...</strong>

      <div id="uploadPercent">
        0%
      </div>

      <div class="progress-container">
        <div id="progressBar"></div>
      </div>

      <div id="uploadDetails">
        Uploaded: 0 MB / ${totalMB} MB
      </div>

      <div id="remaining">
        Remaining: 100%
      </div>

    </div>
  `;

  const progressBar =
    document.getElementById("progressBar");

  const uploadPercent =
    document.getElementById("uploadPercent");

  const uploadDetails =
    document.getElementById("uploadDetails");

  const remaining =
    document.getElementById("remaining");

  /* Create XMLHttpRequest */

  const xhr = new XMLHttpRequest();

  xhr.open(
    "POST",
    "/api/movies",
    true
  );

  /* ================================
     UPLOAD PROGRESS
  ================================ */

  xhr.upload.addEventListener(
    "progress",
    function (event) {
      if (event.lengthComputable) {
        const percent = Math.round(
          (event.loaded / event.total) * 100
        );

        const remainingPercent =
          100 - percent;

        const uploadedMB = (
          event.loaded /
          1024 /
          1024
        ).toFixed(2);

        const totalMBCurrent = (
          event.total /
          1024 /
          1024
        ).toFixed(2);

        /* Update progress bar */

        progressBar.style.width =
          percent + "%";

        /* Update percentage */

        uploadPercent.textContent =
          percent + "% uploaded";

        /* Update MB information */

        uploadDetails.textContent =
          `Uploaded: ${uploadedMB} MB / ${totalMBCurrent} MB`;

        /* Update remaining percentage */

        remaining.textContent =
          `Remaining: ${remainingPercent}%`;
      }
    }
  );

  /* ================================
     UPLOAD SUCCESS / SERVER RESPONSE
  ================================ */

  xhr.onload = function () {
    if (
      xhr.status >= 200 &&
      xhr.status < 300
    ) {
      let data = {};

      try {
        data = JSON.parse(
          xhr.responseText
        );
      } catch (error) {
        console.log(
          "Response was not JSON."
        );
      }

      /* Make sure progress reaches 100% */

      progressBar.style.width = "100%";

      uploadPercent.textContent =
        "100% uploaded";

      remaining.textContent =
        "Remaining: 0%";

      /* Show success */

      status.innerHTML += `
        <p class="success">
          ✅ Movie uploaded successfully!
        </p>
      `;

      /* Clear form */

      form.reset();

      /* Reload movie list */

      loadAdmin();
    } else {
      let data = {};

      try {
        data = JSON.parse(
          xhr.responseText
        );
      } catch (error) {
        console.log(
          "Error response was not JSON."
        );
      }

      status.innerHTML = `
        <p class="error">
          ❌ ${escapeHtml(
            data.error || "Upload failed."
          )}
        </p>
      `;
    }
  };

  /* ================================
     NETWORK ERROR
  ================================ */

  xhr.onerror = function () {
    status.innerHTML = `
      <p class="error">
        ❌ Upload failed.
        Please check your internet connection.
      </p>
    `;
  };

  /* ================================
     UPLOAD CANCELLED
  ================================ */

  xhr.onabort = function () {
    status.innerHTML = `
      <p class="error">
        ❌ Upload cancelled.
      </p>
    `;
  };

  /* Start upload */

  xhr.send(formData);
});

/* ================================
   DELETE MOVIE
================================ */

async function removeMovie(id) {
  if (
    !confirm(
      "Delete this movie?"
    )
  ) {
    return;
  }

  try {
    const response = await fetch(
      "/api/movies/" + id,
      {
        method: "DELETE"
      }
    );

    if (!response.ok) {
      throw new Error(
        "Delete failed"
      );
    }

    loadAdmin();
  } catch (error) {
    console.error(error);

    status.innerHTML = `
      <p class="error">
        ❌ Failed to delete movie.
      </p>
    `;
  }
}

/* ================================
   HTML ESCAPE
================================ */

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[c]
  );
}

/* ================================
   INITIAL LOAD
================================ */

loadAdmin();