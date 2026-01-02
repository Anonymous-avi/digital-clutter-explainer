const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// 🔒 ABSOLUTE upload directory (LOCKED)
const uploadDir = path.resolve(__dirname, "uploads");

console.log("Upload directory:", uploadDir);

// ✅ Ensure directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 🔧 Multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });
function getRecommendation(score) {
  if (score <= 30) {
    return "Do Not Delete";
  }
  if (score <= 70) {
    return "Review Manually";
  }
  return "Safe to Delete";
}


// Routes
app.get("/", (req, res) => {
  res.send("Backend running");
});

function calculateSafetyScore(file) {
  let score = 50;

  const name = file.originalName.toLowerCase();

  // Screenshots are usually safe to delete
  if (name.includes("screenshot") || name.includes("screen") || name.includes("img_")) {
    score += 30;
  }

  // Very old files
  if (file.ageInDays > 180) {
    score += 20;
  }

  // Recent files are risky to delete
  if (file.ageInDays < 3) {
    score -= 40;
  }

  // Personal photos
  if (file.type.startsWith("image") && file.sizeKB > 1024) {
    score -= 30;
  }

  // PDFs are usually important
  if (file.type === "application/pdf") {
    score -= 10;
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  return score;
}

function analyzeImportance(file) {
  const name = file.originalName.toLowerCase();

  if (file.type.startsWith("image") && file.sizeKB > 1024) {
    return {
      category: "Personal Photo",
      risk: "High",
      explanation: "This appears to be a personal photo and is relatively large."
    };
  }

  if (name.includes("screenshot") || name.includes("screen") || name.includes("img_")) {
    return {
      category: "Screenshot",
      risk: "Low",
      explanation: "This looks like a screenshot, which is often safe to delete."
    };
  }

  if (file.type === "application/pdf" && file.ageInDays > 180) {
    return {
      category: "Old Document",
      risk: "Medium",
      explanation: "This is an older PDF document that may be reference material."
    };
  }

  if (file.ageInDays < 3) {
    return {
      category: "Recent File",
      risk: "High",
      explanation: "This file was modified very recently."
    };
  }

  return {
    category: "Unknown",
    risk: "Medium",
    explanation: "Not enough information to determine importance."
  };
}


app.post("/upload", upload.array("files", 100), (req, res) => {
  const analyzedFiles = req.files.map(file => {
    const stats = fs.statSync(file.path);

    const analysis = analyzeImportance({
  originalName: file.originalname,
  type: file.mimetype,
  sizeKB: file.size / 1024,
  ageInDays: Math.floor(
    (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24)
  )
});

const safetyScore = calculateSafetyScore({
  originalName: file.originalname,
  type: file.mimetype,
  sizeKB: file.size / 1024,
  ageInDays: Math.floor(
    (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24)
  )
});
const recommendation = getRecommendation(safetyScore);



    return {
      originalName: file.originalname,
      storedName: file.filename,
      sizeKB: (file.size / 1024).toFixed(2),
      type: file.mimetype,
      lastModified: stats.mtime,
      ageInDays: Math.floor(
        (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24)
      ),
      category: analysis.category,
      risk: analysis.risk,
      explanation: analysis.explanation,
      safetyScore: safetyScore,
      recommendation: recommendation



    };
  });

  res.json({
    message: "Analysis complete",
    files: analyzedFiles
  });
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
