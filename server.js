const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

const dataDir = path.join(__dirname, "data");
const uploadsDir = path.join(__dirname, "uploads");
const postersDir = path.join(uploadsDir, "posters");
const moviesDir = path.join(uploadsDir, "movies");

[dataDir, uploadsDir, postersDir, moviesDir].forEach(d => fs.mkdirSync(d, { recursive: true }));

const dbFile = path.join(dataDir, "movies.json");
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, "[]");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, file.fieldname === "poster" ? postersDir : moviesDir);
  },
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, Date.now() + "-" + safe);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(uploadsDir));

function readMovies() {
  return JSON.parse(fs.readFileSync(dbFile, "utf8"));
}

function writeMovies(movies) {
  fs.writeFileSync(dbFile, JSON.stringify(movies, null, 2));
}

app.get("/api/movies", (req, res) => {
  res.json(readMovies());
});

app.post("/api/movies", upload.fields([
  { name: "poster", maxCount: 1 },
  { name: "movie", maxCount: 1 }
]), (req, res) => {
  if (!req.files?.movie?.[0]) {
    return res.status(400).json({ error: "Movie file is required." });
  }

  const movie = {
    id: Date.now().toString(),
    title: req.body.title || "Untitled Movie",
    year: req.body.year || "",
    language: req.body.language || "",
    genre: req.body.genre || "",
    description: req.body.description || "",
    poster: req.files.poster?.[0]
      ? "/uploads/posters/" + req.files.poster[0].filename
      : "",
    movieUrl: "/uploads/movies/" + req.files.movie[0].filename,
    createdAt: new Date().toISOString()
  };

  const movies = readMovies();
  movies.unshift(movie);
  writeMovies(movies);
  res.json(movie);
});

app.delete("/api/movies/:id", (req, res) => {
  const movies = readMovies();
  const movie = movies.find(m => m.id === req.params.id);
  if (!movie) return res.status(404).json({ error: "Movie not found." });

  for (const url of [movie.poster, movie.movieUrl]) {
    if (url) {
      const file = path.join(__dirname, url.replace(/^\//, ""));
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  }

  writeMovies(movies.filter(m => m.id !== req.params.id));
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Movie website running at http://localhost:${PORT}`);
});
