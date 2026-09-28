const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Render provides the PORT environment variable
const PORT = process.env.PORT || 3000;

// Test server
app.get("/", (req, res) => {
    res.send("AI Library Assistant Server is Running!");
});

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

        // Call Google Gemini API
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

        // Read response only once
        const responseText = await response.text();

        if (!response.ok) {

            console.error("Gemini API Error:", responseText);

            return res.status(response.status).json({
                error: "Gemini API request failed. Check the server logs."
            });
        }

        const data = JSON.parse(responseText);

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

        res.status(500).json({
            error: "Something went wrong while generating classification."
        });

    }

});

// Start server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});