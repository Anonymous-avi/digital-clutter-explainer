const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");

uploadBtn.addEventListener("click", async () => {
  const files = fileInput.files;

  if (!files.length) {
    alert("Please select at least one file");
    return;
  }

  // UI feedback
  uploadBtn.innerText = "Analyzing...";
  uploadBtn.disabled = true;

  const formData = new FormData();
  for (let file of files) {
    formData.append("files", file);
  }

  try {
    const response = await fetch("http://localhost:5000/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    console.log("Backend response:", data);

const resultsSection = document.getElementById("results");
const resultsContainer = document.getElementById("resultsContainer");

resultsContainer.innerHTML = "";
resultsSection.classList.remove("hidden");
resultsSection.style.display = "block";

console.log("Rendering", data.files.length, "files");

data.files.forEach(file => {
  let badgeClass = "review";

  if (file.recommendation === "Safe to Delete") badgeClass = "safe";
  if (file.recommendation === "Do Not Delete") badgeClass = "danger";

  const card = document.createElement("div");
  card.className = "result-card";

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
