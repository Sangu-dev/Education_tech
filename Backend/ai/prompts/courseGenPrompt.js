/**
 * Prompt template for AI course generation from PDF text
 */

export const buildCourseGenerationPrompt = (pdfText, options = {}) => {
  const { numChapters = 4, difficulty = 'auto' } = options;

  // Trim text to avoid token limits (6000 chars ≈ ~1500 tokens, leaves room for output)
  const maxTextLength = 6000;
  const trimmedText = pdfText.length > maxTextLength
    ? pdfText.substring(0, maxTextLength) + '\n\n[Content truncated for length...]'
    : pdfText;

  return [
    {
      role: 'system',
      content: `You are an expert educational content designer and instructional design specialist. 
Your task is to analyze educational content and structure it into a comprehensive, pedagogically sound e-learning course.
Always respond with valid JSON only. No markdown, no explanation outside JSON.`,
    },
    {
      role: 'user',
      content: `Analyze the following educational content and generate a complete, structured course.

=== EDUCATIONAL CONTENT ===
${trimmedText}
=== END CONTENT ===

Generate a JSON course structure with EXACTLY this format:
{
  "title": "Engaging course title",
  "description": "Comprehensive description (2-3 paragraphs)",
  "difficulty": "${difficulty === 'auto' ? 'Beginner|Intermediate|Advanced' : difficulty}",
  "estimatedTime": "X hours Y minutes",
  "learningObjectives": ["objective 1", "objective 2", "objective 3", "objective 4", "objective 5"],
  "prerequisites": ["prerequisite 1", "prerequisite 2"],
  "tags": ["tag1", "tag2", "tag3"],
  "chapters": [
    {
      "title": "Chapter title",
      "description": "Chapter overview",
      "order": 1,
      "topics": [
        {
          "title": "Topic title",
          "order": 1,
          "lessons": [
            {
              "title": "Lesson title",
              "order": 1,
              "estimatedTime": 8,
              "content": "Comprehensive lesson content with detailed explanation (minimum 300 words). Include context, theory, and practical application.",
              "summary": "2-3 sentence summary of key points",
              "keyTakeaways": ["takeaway 1", "takeaway 2", "takeaway 3"],
              "importantNotes": ["important note 1", "important note 2"],
              "examples": [
                {
                  "title": "Example title",
                  "description": "Detailed, concrete example with explanation"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}

Requirements:
- Generate exactly ${numChapters} chapters
- Each chapter must have 2 topics
- Each topic must have 2 lessons
- Lesson content must be clear and educational (100-150 words each)
- Keep key takeaways concise (1 sentence each)
- Examples should be brief and practical
- Do NOT include any text outside the JSON object`
    },
  ];
};

export const buildLessonEnrichmentPrompt = (lessonTitle, context) => {
  return [
    {
      role: 'system',
      content: 'You are an expert educator. Enrich lesson content with deeper explanations, examples, and insights. Respond in JSON only.',
    },
    {
      role: 'user',
      content: `Enrich this lesson based on the context provided.

Lesson Title: ${lessonTitle}
Context from PDF: ${context.substring(0, 3000)}

Return JSON:
{
  "additionalContent": "Extended explanation...",
  "practiceExercises": ["exercise 1", "exercise 2"],
  "furtherReading": ["topic 1", "topic 2"]
}`,
    },
  ];
};
