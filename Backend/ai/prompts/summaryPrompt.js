/**
 * Prompt templates for content summarization
 */

export const buildCourseSummaryPrompt = (courseData) => {
  return [
    {
      role: 'system',
      content: 'You are an expert at synthesizing educational content into clear summaries.',
    },
    {
      role: 'user',
      content: `Create a concise summary of this course for the dashboard.

Course Title: ${courseData.title}
Description: ${courseData.description}
Chapters: ${courseData.chapters?.map(c => c.title).join(', ')}
Learning Objectives: ${courseData.learningObjectives?.join(', ')}

Return a 2-3 sentence engaging summary that would make a student excited to start learning.`,
    },
  ];
};

export const buildPDFSummaryPrompt = (pdfText, pdfName) => {
  const trimmed = pdfText.substring(0, 20000);
  return [
    {
      role: 'system',
      content: 'You are an expert at analyzing documents and extracting key insights.',
    },
    {
      role: 'user',
      content: `Analyze this PDF document and provide a structured overview.

Document: ${pdfName}

Content:
${trimmed}

Provide:
1. What this document is about (2-3 sentences)
2. Main topics covered (bullet points)
3. Who would benefit from this document
4. Estimated reading/learning difficulty (Beginner/Intermediate/Advanced)`,
    },
  ];
};

export const buildSummarizationPrompt = (lessonContent, lessonTitle) => {
  return [
    {
      role: 'system',
      content: 'You are an expert at creating concise, memorable educational lesson summaries. Be structured, intuitive, and clear.',
    },
    {
      role: 'user',
      content: `Create a comprehensive, beautifully structured summary of this lesson.

Lesson Title: ${lessonTitle}

Content:
${lessonContent.substring(0, 20000)}

Format your response strictly as Markdown:
## 📌 Summary
[2-3 intuitive, educational paragraphs explaining the core concept clearly]

## 💡 Key Takeaways
- **Point 1**: Core insight
- **Point 2**: Mechanism explanation
- **Point 3**: Practical implication

## 🎯 Remember
> [One memorable, foundational sentence that captures the exact intuition of the lesson]`,
    },
  ];
};

