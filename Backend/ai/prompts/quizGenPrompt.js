/**
 * Prompt templates for quiz generation
 */

export const buildQuizGenerationPrompt = (chapterTitle, lessonContents, options = {}) => {
  const { numQuestions = 10, difficulty = 'medium' } = options;

  const contentSummary = lessonContents
    .map((l, i) => `Lesson ${i + 1}: ${l.title}\n${l.content ? l.content.substring(0, 2000) : ''}`)
    .join('\n\n---\n\n');

  return [
    {
      role: 'system',
      content: `You are an expert quiz designer and educator. Create challenging, educational quiz questions that test understanding. You MUST generate EXACTLY ${numQuestions} questions in the questions array. Always respond with valid JSON only.`,
    },
    {
      role: 'user',
      content: `Generate a comprehensive quiz for the following chapter content.

Chapter: ${chapterTitle}

=== LESSON CONTENT ===
${contentSummary.substring(0, 12000)}
=== END CONTENT ===

Generate a JSON object with EXACTLY ${numQuestions} questions in the "questions" array.
Format:
{
  "title": "${chapterTitle} — Quiz",
  "description": "Test your understanding of ${chapterTitle}",
  "questions": [
    {
      "type": "mcq",
      "question": "Sample multiple choice question?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Brief explanation of the correct answer",
      "difficulty": "${difficulty}",
      "points": 1
    },
    {
      "type": "true_false",
      "question": "Sample true or false statement?",
      "options": ["True", "False"],
      "correctAnswer": "True",
      "explanation": "Brief explanation why this statement is true",
      "difficulty": "easy",
      "points": 1
    }
  ]
}

CRITICAL Requirements:
1. The "questions" array MUST contain EXACTLY ${numQuestions} complete question objects.
2. Question types MUST be either "mcq" (Multiple Choice) or "true_false".
3. EVERY question MUST have non-empty "options" array (4 choices for MCQ, ["True", "False"] for true_false).
4. "correctAnswer" MUST be an exact string match to one of the entries in the "options" array.
5. Explanations must be concise (1-2 sentences).
6. Vary difficulty: 30% easy, 50% medium, 20% hard.
7. Do NOT include any markdown or text outside the JSON object.`,
    },
  ];
};

