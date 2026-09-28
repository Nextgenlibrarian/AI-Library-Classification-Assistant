const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Test server
app.get("/", (req, res) => {
    res.send("AI Library Assistant Server is Running!");
});


// Function to call Gemini with automatic retry
async function callGemini(prompt) {

    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {

        try {

            const response = await fetch(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" +
                process.env.GEMINI_API_KEY,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    {
                                        text: prompt
                                    }
                                ]
                            }
                        ]
                    })
                }
            );

            const responseText = await response.text();

            // Success
            if (response.ok) {
                return JSON.parse(responseText);
            }

            // Temporary errors: retry
            if (response.status === 503 || response.status === 429) {

                console.log(
                    `Gemini temporary error ${response.status}. Retry ${attempt}/${maxRetries}`
                );

                if (attempt < maxRetries) {

                    // Wait 2 seconds, then 4 seconds, then 8 seconds
                    const waitTime = Math.pow(2, attempt) * 1000;

                    console.log(
                        `Waiting ${waitTime / 1000} seconds before retry...`
                    );

                    await new Promise(resolve =>
                        setTimeout(resolve, waitTime)
                    );

                    continue;
                }
            }

            // Other errors should not be retried
            console.error("Gemini API Error:", responseText);

            throw new Error(
                `Gemini API request failed with status ${response.status}`
            );

        } catch (error) {

            if (attempt === maxRetries) {
                throw error;
            }

            console.error(
                `Gemini connection error. Retry ${attempt}/${maxRetries}`
            );

            const waitTime = Math.pow(2, attempt) * 1000;

            await new Promise(resolve =>
                setTimeout(resolve, waitTime)
            );
        }
    }

    throw new Error("Gemini API request failed after multiple attempts.");
}


// AI Classification Route
app.post("/classify", async (req, res) => {

    try {

        const { title, author, isbn } = req.body;

        if (!title || !author) {

            return res.status(400).json({
                error: "Book title and author are required."
            });

        }

        const prompt = `
You are an experienced school librarian and library classification expert.

Analyze the following book details and provide a suggested Dewey Decimal Classification (DDC) number.

Book Title: ${title}
Author: ${author}
ISBN: ${isbn || "Not provided"}

Provide your response in the following format:

DDC Classification Number:
Suggested Class Name:
Subject Headings:
Classification Rationale:
Confidence Level:
Verification Note:

Important instructions:
1. Suggest the most appropriate DDC number based on the available information.
2. Do not invent bibliographic information.
3. If the information is insufficient, clearly mention that further verification is required.
4. The suggested classification must be verified against the latest DDC schedules before actual library cataloguing.
5. Keep the explanation suitable for school librarians.
`;

        const data = await callGemini(prompt);

        const resultText =
            data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!resultText) {

            return res.status(500).json({
                error: "No classification response received from Gemini."
            });

        }

        res.json({

            message: "AI classification generated successfully!",

            book: {
                title: title,
                author: author,
                isbn: isbn || "Not provided"
            },

            classification: resultText

        });

    } catch (error) {

        console.error("Server Error:", error);

        res.status(503).json({
            error: "Gemini is temporarily busy. Please try again in a moment."
        });

    }

});


// Start server
app.listen(PORT, "0.0.0.0", () => {

    console.log(`Server running on port ${PORT}`);

});