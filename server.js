const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();

// Render provides PORT automatically.
// Locally, it will use port 3000.
const PORT = process.env.PORT || 3000;

// ======================================================
// ADMIN LOGIN
// ======================================================

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "change-this-password";

// Admin authentication middleware
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.setHeader(
      "WWW-Authenticate",
      'Basic realm="Admin Area"'
    );

    return res.status(401).send("Admin login required.");
  }

  const encodedCredentials = authHeader.split(" ")[1];

  let decodedCredentials;

  try {
    decodedCredentials = Buffer
      .from(encodedCredentials, "base64")
      .toString("utf8");
  } catch (error) {
    res.setHeader(
      "WWW-Authenticate",
      'Basic realm="Admin Area"'
    );

    return res.status(401).send("Invalid authentication.");
  }

  const separatorIndex = decodedCredentials.indexOf(":");

  if (separatorIndex === -1) {
    res.setHeader(
      "WWW-Authenticate",
      'Basic realm="Admin Area"'
    );

    return res.status(401).send("Invalid authentication.");
  }

  const username = decodedCredentials.substring(
    0,
    separatorIndex
  );

  const password = decodedCredentials.substring(
    separatorIndex + 1
  );

  if (
    username !== ADMIN_USER ||
    password !== ADMIN_PASSWORD
  ) {
    res.setHeader(
      "WWW-Authenticate",
      'Basic realm="Admin Area"'
    );

    return res
      .status(401)
      .send("Invalid username or password.");
  }

  next();
}

// ======================================================
// DIRECTORIES
// ======================================================

const dataDir = path.join(__dirname, "data");
const uploadsDir = path.join(__dirname, "uploads");
const postersDir = path.join(uploadsDir, "posters");
const moviesDir = path.join(uploadsDir, "movies");

[dataDir, uploadsDir, postersDir, moviesDir].forEach(
  (dir) => {
    fs.mkdirSync(dir, { recursive: true });
  }
);

// ======================================================
// MOVIE DATABASE
// ======================================================

const dbFile = path.join(dataDir, "movies.json");

if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, "[]", "utf8");
}

// ======================================================
// MULTER STORAGE
// ======================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "poster") {
      cb(null, postersDir);
    } else if (file.fieldname === "movie") {
      cb(null, moviesDir);
    } else {
      cb(new Error("Invalid upload field."));
    }
  },

  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );

    cb(null, Date.now() + "-" + safeName);
  }
});

// ======================================================
// UPLOAD CONFIGURATION
// ======================================================

const upload = multer({
  storage: storage,

  // Maximum upload size: 2 GB
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024
  }
});

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(express.json());
app.use(
  express.urlencoded({
    extended: true
  })
);

// ======================================================
// PROTECTED ADMIN PAGE
// ======================================================

app.get("/admin", adminAuth, (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "admin.html")
  );
});

app.get("/admin.html", adminAuth, (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "admin.html")
  );
});

// ======================================================
// PUBLIC WEBSITE
// ======================================================

app.use(
  express.static(path.join(__dirname, "public"))
);

// Uploaded posters and movies remain public
app.use(
  "/uploads",
  express.static(uploadsDir)
);

// ======================================================
// DATABASE FUNCTIONS
// ======================================================

function readMovies() {
  try {
    const data = fs.readFileSync(
      dbFile,
      "utf8"
    );

    return JSON.parse(data);
  } catch (error) {
    console.error(
      "Error reading movies database:",
      error
    );

    return [];
  }
}

function writeMovies(movies) {
  fs.writeFileSync(
    dbFile,
    JSON.stringify(movies, null, 2),
    "utf8"
  );
}

// ======================================================
// GET ALL MOVIES
// ======================================================

// Public - everyone can view movies
app.get("/api/movies", (req, res) => {
  res.json(readMovies());
});

// ======================================================
// ADD MOVIE
// ======================================================

// Protected - only admin can upload
app.post(
  "/api/movies",
  adminAuth,
  upload.fields([
    {
      name: "poster",
      maxCount: 1
    },
    {
      name: "movie",
      maxCount: 1
    }
  ]),
  (req, res) => {
    try {
      if (!req.files?.movie?.[0]) {
        return res.status(400).json({
          error: "Movie file is required."
        });
      }

      const movieFile =
        req.files.movie[0];

      const posterFile =
        req.files.poster?.[0];

      const movie = {
        id: Date.now().toString(),

        title:
          req.body.title ||
          "Untitled Movie",

        year:
          req.body.year || "",

        language:
          req.body.language || "",

        genre:
          req.body.genre || "",

        description:
          req.body.description || "",

        poster: posterFile
          ? "/uploads/posters/" +
            posterFile.filename
          : "",

        movieUrl:
          "/uploads/movies/" +
          movieFile.filename,

        createdAt:
          new Date().toISOString()
      };

      const movies = readMovies();

      movies.unshift(movie);

      writeMovies(movies);

      res.status(201).json(movie);

    } catch (error) {
      console.error(
        "Upload error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to upload movie."
      });
    }
  }
);

// ======================================================
// DELETE MOVIE
// ======================================================

// Protected - only admin can delete
app.delete(
  "/api/movies/:id",
  adminAuth,
  (req, res) => {
    try {
      const movies = readMovies();

      const movie = movies.find(
        (item) =>
          item.id === req.params.id
      );

      if (!movie) {
        return res.status(404).json({
          error: "Movie not found."
        });
      }

      const filesToDelete = [
        movie.poster,
        movie.movieUrl
      ];

      for (const url of filesToDelete) {
        if (!url) continue;

        const filePath = path.join(
          __dirname,
          url.replace(/^\//, "")
        );

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      const updatedMovies =
        movies.filter(
          (item) =>
            item.id !== req.params.id
        );

      writeMovies(updatedMovies);

      res.json({
        success: true
      });

    } catch (error) {
      console.error(
        "Delete error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to delete movie."
      });
    }
  }
);

// ======================================================
// START SERVER
// ======================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `Movie website running on port ${PORT}`
    );
  }
);