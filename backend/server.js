const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5000;

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

function getAgeInDaysFromMetadata(meta, fallbackMtimeMs) {
  const timestamp = Number(meta?.lastModified) || fallbackMtimeMs;
  return Math.max(0, Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24)));
}

function getFileNameHints(originalName) {
  const name = originalName.toLowerCase();

  return {
    isScreenshot: name.includes("screenshot") || name.includes("screen") || name.includes("img_"),
    isDocumentLike:
      name.includes("chapter") ||
      name.includes("assignment") ||
      name.includes("report") ||
      name.includes("notes") ||
      name.includes("thesis") ||
      name.includes("paper") ||
      name.includes("lecture") ||
      name.includes("syllabus") ||
      name.includes("resume") ||
      name.includes("cv") ||
      name.includes("invoice") ||
      name.includes("receipt") ||
      name.includes("document") ||
      name.includes("doc"),
  };
}

function calculateSafetyScore(file) {
  let score = 50;

  const name = file.originalName.toLowerCase();
  const hints = getFileNameHints(file.originalName);

  // Screenshots are usually safe to delete
  if (hints.isScreenshot) {
    score += 30;
  }

  if (hints.isDocumentLike) {
    score += 15;
  }

  // Very old files
  if (file.ageInDays > 180) {
    score += 20;
  }

  // Recent files are risky to delete
  if (file.ageInDays < 3) {
    score -= 10;
  }

  // Personal photos
  if (file.type.startsWith("image") && file.sizeKB > 1024) {
    score -= 30;
  }

  // PDFs are usually important
  if (file.type === "application/pdf") {
    score += 5;
  }

  if ((file.type === "application/pdf" || file.type.includes("document")) && hints.isDocumentLike) {
    score += 5;
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  return score;
}

function analyzeImportance(file) {
  const name = file.originalName.toLowerCase();
  const hints = getFileNameHints(file.originalName);

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

  if (hints.isDocumentLike && file.type === "application/pdf") {
    return {
      category: "Document",
      risk: file.ageInDays < 3 ? "Medium" : "Low",
      explanation: "This looks like a document or study file, so it is safer to review before deleting."
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
      risk: "Medium",
      explanation: "This file was modified very recently, so it should be reviewed instead of deleted immediately."
    };
  }

  return {
    category: "Unknown",
    risk: "Medium",
    explanation: "Not enough information to determine importance."
  };
}


app.post("/upload", upload.array("files", 100), (req, res) => {
  let fileMeta = [];

  if (req.body?.fileMeta) {
    try {
      fileMeta = JSON.parse(req.body.fileMeta);
    } catch (error) {
      fileMeta = [];
    }
  }

  const analyzedFiles = req.files.map((file, index) => {
    const stats = fs.statSync(file.path);
    const ageInDays = getAgeInDaysFromMetadata(fileMeta[index], stats.mtimeMs);

    const analysis = analyzeImportance({
  originalName: file.originalname,
  type: file.mimetype,
  sizeKB: file.size / 1024,
  ageInDays: ageInDays
});

const safetyScore = calculateSafetyScore({
  originalName: file.originalname,
  type: file.mimetype,
  sizeKB: file.size / 1024,
  ageInDays: ageInDays
});
const recommendation = getRecommendation(safetyScore);



    return {
      originalName: file.originalname,
      storedName: file.filename,
      sizeKB: (file.size / 1024).toFixed(2),
      type: file.mimetype,
      lastModified: stats.mtime,
      ageInDays: ageInDays,
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
