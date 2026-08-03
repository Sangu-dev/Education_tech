/**
 * Prompt templates for the AI chatbot with RAG context
 */

export const buildChatSystemPrompt = (courseTitle, courseDifficulty) => {
  return `You are an intelligent, friendly, and highly knowledgeable AI tutor for the course "${courseTitle}" (${courseDifficulty} level).

Your capabilities:
- Explain concepts clearly using the course material provided
- Answer questions based ONLY on the retrieved context
- Generate examples and analogies to aid understanding
- Create practice exercises on request
- Summarize lessons concisely
- Suggest what to study next
- Generate mini quizzes on specific topics

Communication style:
- Be encouraging and supportive
- Use clear, structured responses with headers and bullet points when helpful
- Adjust complexity based on the student's questions
- If a question is outside the course material, say so honestly

IMPORTANT: Base your answers primarily on the retrieved context below. If the context doesn't contain enough information to answer confidently, say so and provide general knowledge with a clear disclaimer.`;
};

export const buildChatPrompt = (userMessage, retrievedContext, chatHistory = []) => {
  const contextSection = retrievedContext.length > 0
    ? `\n\n=== RETRIEVED COURSE MATERIAL ===\n${retrievedContext.join('\n\n---\n\n')}\n=== END MATERIAL ===\n`
    : '\n\n[No specific material retrieved for this query]\n';

  const messages = [
    ...chatHistory.slice(-8), // Keep last 8 messages for context
    {
      role: 'user',
      content: `${contextSection}\n\nStudent question: ${userMessage}`,
    },
  ];

  return messages;
};

export const buildSummarizationPrompt = (lessonContent, lessonTitle) => {
  return [
    {
      role: 'system',
      content: 'You are an expert at creating concise, memorable lesson summaries. Be structured and clear.',
    },
    {
      role: 'user',
      content: `Create a comprehensive summary of this lesson.

Lesson Title: ${lessonTitle}

Content:
${lessonContent.substring(0, 5000)}

Format your response as:
## Summary
[2-3 paragraph summary]

## Key Points
- Point 1
- Point 2
- Point 3

## Remember
[One memorable sentence that captures the essence]`,
    },
  ];
};

export const buildFollowUpQuestionsPrompt = (userMessage, assistantResponse) => {
  return [
    {
      role: 'system',
      content: 'Generate helpful follow-up questions a curious student might ask. Respond in JSON only.',
    },
    {
      role: 'user',
      content: `Based on this Q&A exchange, generate 3 helpful follow-up questions.

Student asked: "${userMessage}"
AI responded: "${assistantResponse.substring(0, 500)}"

Return JSON:
{
  "followUpQuestions": [
    "Follow-up question 1?",
    "Follow-up question 2?",
    "Follow-up question 3?"
  ]
}`,
    },
  ];
};
