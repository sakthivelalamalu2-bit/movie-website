const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();

// Render provides PORT automatically.
// Locally, it will use port 3000.
const PORT = process.env.PORT || 3000;

// Directories
const dataDir = path.join(__dirname, "data");
const uploadsDir = path.join(__dirname, "uploads");
const postersDir = path.join(uploadsDir, "posters");
const moviesDir = path.join(uploadsDir, "movies");

// Create required directories
[dataDir, uploadsDir, postersDir, moviesDir].forEach((dir) => {
  fs.mkdirSync(dir, { recursive: true });
});

// Movie database file
const dbFile = path.join(dataDir, "movies.json");

if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, "[]", "utf8");
}

// Multer storage configuration
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

// Upload configuration
const upload = multer({
  storage: storage,

  // Maximum upload size: 2 GB
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Website files
app.use(express.static(path.join(__dirname, "public")));

// Uploaded files
app.use("/uploads", express.static(uploadsDir));

// Read movies from JSON database
function readMovies() {
  try {
    const data = fs.readFileSync(dbFile, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading movies database:", error);
    return [];
  }
}

// Write movies to JSON database
function writeMovies(movies) {
  fs.writeFileSync(
    dbFile,
    JSON.stringify(movies, null, 2),
    "utf8"
  );
}

// Get all movies
app.get("/api/movies", (req, res) => {
  res.json(readMovies());
});

// Add a movie
app.post(
  "/api/movies",
  upload.fields([
    { name: "poster", maxCount: 1 },
    { name: "movie", maxCount: 1 }
  ]),
  (req, res) => {
    try {
      // Movie file is required
      if (!req.files?.movie?.[0]) {
        return res.status(400).json({
          error: "Movie file is required."
        });
      }

      const movieFile = req.files.movie[0];
      const posterFile = req.files.poster?.[0];

      const movie = {
        id: Date.now().toString(),

        title: req.body.title || "Untitled Movie",

        year: req.body.year || "",

        language: req.body.language || "",

        genre: req.body.genre || "",

        description: req.body.description || "",

        poster: posterFile
          ? "/uploads/posters/" + posterFile.filename
          : "",

        movieUrl:
          "/uploads/movies/" + movieFile.filename,

        createdAt: new Date().toISOString()
      };

      const movies = readMovies();

      movies.unshift(movie);

      writeMovies(movies);

      res.status(201).json(movie);

    } catch (error) {
      console.error("Upload error:", error);

      res.status(500).json({
        error: "Failed to upload movie."
      });
    }
  }
);

// Delete a movie
app.delete("/api/movies/:id", (req, res) => {
  try {
    const movies = readMovies();

    const movie = movies.find(
      (item) => item.id === req.params.id
    );

    if (!movie) {
      return res.status(404).json({
        error: "Movie not found."
      });
    }

    // Delete poster and movie files
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

    // Remove movie from database
    const updatedMovies = movies.filter(
      (item) => item.id !== req.params.id
    );

    writeMovies(updatedMovies);

    res.json({
      success: true
    });

  } catch (error) {
    console.error("Delete error:", error);

    res.status(500).json({
      error: "Failed to delete movie."
    });
  }
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Movie website running on port ${PORT}`
  );
});