/**
 * groqService.js — AI Question Generation via Groq API
 * Uses llama-3.3-70b-versatile model for fast, high-quality MCQ generation
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

/**
 * Generate MCQ questions using Groq AI from a topic
 */
export async function generateQuestions({ topic, difficulty = 'Medium', count = 5, className = '', language = 'English' }) {
  if (!GROQ_API_KEY) throw new Error('Groq API key not configured. Add VITE_GROQ_API_KEY to .env');

  const prompt = `You are an expert school exam question creator. Generate exactly ${count} multiple-choice questions (MCQ) in ${language}.

Topic: ${topic}
Difficulty: ${difficulty}
${className ? `Class/Grade: ${className}` : ''}

STRICT JSON FORMAT — return ONLY a valid JSON array, no extra text:
[
  {
    "text": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "explanation": "Brief explanation why this is correct."
  }
]

Rules:
- Exactly 4 options per question
- correctAnswer must be exactly one of the options (copy it exactly)
- Make questions educational and accurate
- ${difficulty === 'Easy' ? 'Simple language, basic concepts' : difficulty === 'Hard' ? 'Advanced concepts, analytical thinking required' : 'Moderate language and concepts'}
- Return ONLY the JSON array, nothing else`;

  return await callGroq(prompt, 0.7, 4096);
}

/**
 * Extract / generate MCQ questions from raw PDF text using Groq AI
 * @param {string} pdfText   - Raw text extracted from the PDF
 * @param {number} count     - Max questions to extract or generate
 * @param {string} language  - 'English' | 'Hindi'
 */
export async function extractQuestionsFromPdfText(pdfText, count = 10, language = 'English') {
  if (!GROQ_API_KEY) throw new Error('Groq API key not configured. Add VITE_GROQ_API_KEY to .env');

  // Truncate huge PDFs to avoid token overflow (~12000 chars ≈ ~3000 tokens)
  const truncated = pdfText.length > 12000
    ? pdfText.slice(0, 12000) + '\n...[content truncated for length]'
    : pdfText;

  const prompt = `You are an expert exam paper analyst. Read the following content extracted from a PDF and:
1. If the PDF contains existing MCQ questions — extract them EXACTLY as written, preserving original wording.
2. If the PDF contains study material / notes / chapters — GENERATE ${count} MCQ questions based on the content.

Language output: ${language}

PDF CONTENT:
---
${truncated}
---

Return ONLY a valid JSON array (no markdown, no extra text):
[
  {
    "text": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "explanation": "Brief reason why this answer is correct."
  }
]

Rules:
- Each question MUST have exactly 4 options
- correctAnswer must be copied EXACTLY from one of the 4 options
- Extract/generate up to ${count} questions total
- If the PDF has an answer key, use it to set correctAnswer
- Return ONLY the JSON array, no extra text`;

  return await callGroq(prompt, 0.3, 6000);
}

/* ── shared fetch helper ── */
async function callGroq(prompt, temperature, max_tokens) {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty response from Groq AI.');

  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Could not parse AI response as JSON. Try again.');

  const questions = JSON.parse(jsonMatch[0]);
  return questions.map(q => ({
    text: q.text || '',
    options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ['', '', '', ''],
    correctAnswer: q.correctAnswer || '',
    explanation: q.explanation || '',
  }));
}
