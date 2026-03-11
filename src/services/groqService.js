/**
 * groqService.js — AI Question Generation via Groq API
 * Uses llama-3.3-70b-versatile model for fast, high-quality MCQ generation
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

/**
 * Generate MCQ questions using Groq AI
 * @param {object} options
 * @param {string} options.topic        - Subject / topic to generate questions for
 * @param {string} options.difficulty   - 'Easy' | 'Medium' | 'Hard'
 * @param {number} options.count        - Number of questions (1-20)
 * @param {string} options.className    - Class/Grade context (optional)
 * @param {string} options.language     - 'Hindi' | 'English' (default English)
 * @returns {Promise<Array>} Array of question objects
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

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) throw new Error('Empty response from Groq AI.');

  // Extract JSON array from response (handle markdown code blocks if present)
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Could not parse AI response as JSON. Try again.');

  const questions = JSON.parse(jsonMatch[0]);

  // Validate structure
  return questions.map(q => ({
    text: q.text || '',
    options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ['', '', '', ''],
    correctAnswer: q.correctAnswer || '',
    explanation: q.explanation || '',
  }));
}
