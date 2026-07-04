
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");

const form = document.getElementById("uploadForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();   // ✅ VERY IMPORTANT
  console.log("Analyze button clicked");

  const files = fileInput.files;

  if (!files.length) {
    alert("Please select at least one file");
    return;
  }

  // UI feedback
  uploadBtn.innerText = "Analyzing...";
  uploadBtn.disabled = true;

  const formData = new FormData();
  const fileMeta = [];
  for (let file of files) {
    formData.append("files", file);
    fileMeta.push({
      name: file.name,
      lastModified: file.lastModified,
      size: file.size,
      type: file.type,
    });
  }
  formData.append("fileMeta", JSON.stringify(fileMeta));

  try {
    const response = await fetch("https://digital-clutter-explainer.onrender.com/upload", {
      method: "POST",
      body: formData,

    });

    const data = await response.json();
    console.log("FULL RESPONSE:", data);


    console.log("Backend response:", data);

const resultsSection = document.getElementById("results");
const resultsContainer = document.getElementById("resultsContainer");

resultsContainer.innerHTML = "";
resultsSection.classList.remove("hidden");
resultsSection.style.display = "block";
resultsSection.scrollIntoView({ behavior: "smooth" });


console.log("Rendering", data.files.length, "files");

data.files.forEach(file => {
  let badgeClass = "review";

  if (file.recommendation === "Safe to Delete") badgeClass = "safe";
  if (file.recommendation === "Do Not Delete") badgeClass = "danger";

  const card = document.createElement("div");
  card.className = `result-card ${badgeClass}`;


  card.innerHTML = `
    <div class="file-name">${file.originalName}</div>
    <div class="explanation">${file.explanation}</div>
    <div class="score">${file.safetyScore}</div>
    <span class="badge ${badgeClass}">${file.recommendation}</span>
  `;

  resultsContainer.appendChild(card);
});
  


    

  } catch (error) {
    console.error("Upload error:", error);
    alert("Something went wrong while uploading files.");
  } finally {
    uploadBtn.innerText = "Analyze Files";
    uploadBtn.disabled = false;
  }
});
