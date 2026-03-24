import { configDotenv } from "dotenv";
import express from "express";
import Groq from "groq-sdk";

configDotenv();
const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post("/analyze", async (req, res) => {
  if (req.headers["x-extension-key"] !== process.env.EXTENSION_KEY) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  try {
    const { resume, jobDescription } = req.body;

    if (!resume || !jobDescription) {
      return res
        .status(400)
        .json({ message: "Resume and job description are required" });
    }

    const prompt = `You are a strict career advisor. Analyze how well this candidate matches the job description based purely on their resume.

RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

Scoring rules you MUST follow:
- Read the candidate's actual experience level from their resume
- If the job requires more years of experience than the candidate has, reduce score significantly
- If the job requires specific skills the candidate doesn't have, reduce score significantly
- If the candidate meets or exceeds the experience and skill requirements, score high
- Be honest and strict — do not inflate scores to be encouraging
- Score should reflect realistic chances of getting an interview, not just partial skill overlap

Respond in this exact JSON format:
{
  "score": <number from 0 to 100>,
  "verdict": "<one of: Strong Match, Good Match, Partial Match, Weak Match>",
  "reasons": ["<reason 1>", "<reason 2>", "<reason 3>"],
  "missingSkills": ["<skill 1>", "<skill 2>", "<skill 3>"],
  "summary": "<one sentence overall assessment>",
  "company": "<extract company name from job description, or empty string if not found>"
}

Only respond with the JSON. No extra text.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const text = completion.choices[0].message.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    const result = JSON.parse(jsonMatch[0]);

    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error("ANALYZE ERROR:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/verify", async (req, res) => {
  if (req.headers["x-extension-key"] !== process.env.EXTENSION_KEY) {
    return res.status(403).json({ message: "Unauthorized" });
  }
  try {
    const { company } = req.body;
    if (!company)
      return res.status(400).json({ message: "Company name required" });

    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(company)}`;
    const wikiRes = await fetch(wikiUrl);
    const wikiData = await wikiRes.json();

    const found =
      wikiData.type === "standard" || wikiData.type === "disambiguation";
    const summary = wikiData.extract?.slice(0, 250) || "";
    const location = extractLocation(summary);

    res.status(200).json({
      success: true,
      result: {
        found,
        summary,
        location,
        glassdoorUrl: `https://www.glassdoor.co.in/Search/results.htm?keyword=${encodeURIComponent(company)}`,
        linkedinUrl: `https://www.linkedin.com/company/${encodeURIComponent(company.toLowerCase().replace(/ /g, "-"))}`,
        googleUrl: `https://www.google.com/search?q=${encodeURIComponent(company + " company reviews site:glassdoor.com OR site:ambitionbox.com")}`,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

function extractLocation(text) {
  const patterns = [
    /headquartered in ([^,.]+)/i,
    /based in ([^,.]+)/i,
    /located in ([^,.]+)/i,
    /founded in ([^,.]+)/i,
    /offices in ([^,.]+)/i,
    /company in ([^,.]+)/i,
    /corporation in ([^,.]+)/i,
    /organisation in ([^,.]+)/i,
    /organization in ([^,.]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return "";
}

export default router;
