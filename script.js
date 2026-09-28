document
  .getElementById("classifyButton")
  .addEventListener("click", async function () {

    const title = document.getElementById("title").value.trim();
    const author = document.getElementById("author").value.trim();
    const isbn = document.getElementById("isbn").value.trim();

    const resultDiv = document.getElementById("result");
    const button = document.getElementById("classifyButton");

    if (!title || !author) {
      resultDiv.innerHTML = `
        <p class="error-message">
          ⚠️ Please enter both Book Title and Author.
        </p>
      `;
      return;
    }

    resultDiv.innerHTML = `
      <p class="loading-message">
        ⏳ Generating classification. Please wait...
      </p>
    `;

    button.disabled = true;
    button.innerText = "⏳ Processing...";

    try {

      const response = await fetch(
        "https://ai-library-classification-assistant.onrender.com/classify",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            title: title,
            author: author,
            isbn: isbn
          })
        }
      );

      const responseText = await response.text();

      console.log("Server response:", responseText);

      let data;

      try {
        data = JSON.parse(responseText);
      } catch (error) {
        throw new Error(
          "Invalid server response: " + responseText
        );
      }

      if (!response.ok || data.error) {
        throw new Error(
          data.error || "Unable to generate classification."
        );
      }

      let classification = data.classification || "";

      // Clean the AI response
      classification = classification
        .replace(/\\n/g, "\n")
        .replace(/\r/g, "")
        .replace(/\*\*/g, "")
        .replace(/^\s*\*\s*/gm, "")
        .trim();

      // Extract classification information
      const ddcNumber = extractValue(classification, [
        "DDC Number",
        "DDC Classification Number"
      ]);

      const className = extractValue(classification, [
        "Class Name",
        "Suggested Class Name"
      ]);

      const subjectHeadings = extractValue(classification, [
        "Subject Headings"
      ]);

      const rationale = extractValue(classification, [
        "Rationale",
        "Classification Rationale"
      ]);

      const note = extractValue(classification, [
        "Note",
        "Verification Note",
        "Confidence Level"
      ]);

      resultDiv.innerHTML = `
        <h3>📚 Classification Result</h3>

        <div class="result-card">
          <strong>DDC Number:</strong>
          <span>${escapeHTML(ddcNumber || "Not provided")}</span>
        </div>

        <div class="result-card">
          <strong>Class Name:</strong>
          <span>${escapeHTML(className || "Not provided")}</span>
        </div>

        <div class="result-card">
          <strong>Subject Headings:</strong>
          <span>${escapeHTML(subjectHeadings || "Not provided")}</span>
        </div>

        <div class="result-card">
          <strong>Rationale:</strong>
          <span>${escapeHTML(rationale || "Not provided")}</span>
        </div>

        <div class="result-card">
          <strong>Note:</strong>
          <span>${escapeHTML(note || "Verify before final cataloguing.")}</span>
        </div>

        <p class="verification-note">
          ⚠️ Verify the suggested classification before final cataloguing.
        </p>
      `;

    } catch (error) {

      console.error("FULL ERROR:", error);

      resultDiv.innerHTML = `
        <p class="error-message">
          ❌ ${escapeHTML(error.message)}
        </p>
      `;

    } finally {

      button.disabled = false;
      button.innerText = "🔍 Generate Classification";

    }

  });


// Extract information from the AI response
function extractValue(text, labels) {

  for (const label of labels) {

    const escapedLabel = label.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const pattern = new RegExp(
      "(?:^|\\n)\\s*" +
      escapedLabel +
      "\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*[A-Za-z][A-Za-z ]*\\s*:|$)",
      "i"
    );

    const match = text.match(pattern);

    if (match && match[1]) {
      return match[1].trim();
    }

  }

  return "";
}


// Prevent HTML injection
function escapeHTML(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}