/**
 * AI Teacher Scene Planner & Pedagogical Explanation Prompt
 * Transforms lesson concepts into a clean, structured programmatic slide blueprint.
 * All visuals are rendered with code (no external images or raw PDF pages).
 */

export const buildTeacherScenePrompt = (contentContext, options = {}) => {
  const {
    topicTitle = 'Educational Topic',
    learningLevel = 'beginner',
    videoStyle = 'technical',
    targetDurationSec = 60,
  } = options;

  const levelInstructions = {
    beginner: 'Use simple, friendly language, rich everyday analogies, and clear step-by-step intuition.',
    school: 'Use clear foundational terminology, relatable examples, and easy-to-follow diagrams.',
    college: 'Provide solid conceptual grounding, formal definitions, and systematic flowcharts.',
    intermediate: 'Balance practical mechanics, architectural trade-offs, and technical precision.',
    advanced: 'Dive deep into architectural nuances, algorithmic details, and underlying mechanics.',
  };

  const selectedLevel = levelInstructions[learningLevel.toLowerCase()] || levelInstructions.beginner;

  return [
    {
      role: 'system',
      content: `You are an elite AI Teacher, educational video architect, and programmatic slide designer.
Your mission is to explain the provided educational material through a structured, animated slide presentation.

CRITICAL INSTRUCTIONS:
1. Do NOT summarize or dump raw document text. Explain the topic conversationally as a master teacher.
2. Every scene MUST correspond to a PROGRAMMATIC SLIDE that will be rendered using code (NOT images, NOT PDF screenshots).
3. Every scene MUST specify a valid "slide_type":
   - "cloud_architecture": For cloud concepts, networks, distributed nodes, servers, databases.
   - "process_flow": For multi-stage pipelines, sequences (e.g., 3 connected stages with arrows).
   - "bullet_list": For key features, core properties, or layered bulleted reveals.
   - "comparison": For comparing two approaches (e.g. On-Premise vs Cloud, Old vs New).
4. "on_screen_text" MUST be punchy and strictly MAX 5 TO 7 WORDS.
5. "bullet_points" MUST be 2 to 3 concise takeaways (under 8 words each).
6. "diagram_data" MUST provide structured semantic labels for the diagram (e.g. stage names or node names).
7. "narration" MUST be natural spoken voiceover text (2-3 sentences).

Always return valid, well-formed JSON ONLY. No markdown wrapper outside the JSON.`
    },
    {
      role: 'user',
      content: `Topic: "${topicTitle}"
Learning Level: ${learningLevel} (${selectedLevel})
Visual Style: ${videoStyle}

SOURCE MATERIAL SUMMARY:
${contentContext.substring(0, 4000)}

Generate 4 to 5 structured educational scenes teaching "${topicTitle}".
Return JSON strictly in this structure:
{
  "title": "Clear educational lesson title",
  "topic": "${topicTitle}",
  "learningLevel": "${learningLevel}",
  "videoStyle": "${videoStyle}",
  "totalEstimatedDuration": 40,
  "scenes": [
    {
      "scene_id": 1,
      "title": "Scene Heading",
      "slide_type": "cloud_architecture",
      "on_screen_text": "Short Punchy Text (5-7 Words)",
      "bullet_points": [
        "First key takeaway point",
        "Second key takeaway point",
        "Third key takeaway point"
      ],
      "diagram_data": {
        "primary_icon": "cloud",
        "nodes": ["Storage", "Compute", "Database"],
        "stages": ["Input", "Process", "Output"],
        "left_title": "Traditional",
        "left_points": ["Point 1", "Point 2"],
        "right_title": "Modern Cloud",
        "right_points": ["Point 1", "Point 2"]
      },
      "narration": "Conversational teacher voiceover spoken aloud (2-3 sentences).",
      "duration_estimate": 9.0
    }
  ]
}`
    }
  ];
};

/**
 * Prompt to regenerate a single scene if the user requests refinement
 */
export const buildSingleSceneRegeneratePrompt = (scene, lessonContext, options = {}) => {
  const { learningLevel = 'beginner', videoStyle = 'technical', feedback = '' } = options;

  return [
    {
      role: 'system',
      content: `You are an expert AI Teacher and video slide designer. Regenerate and improve this single slide scene.
Enforce valid "slide_type" ("cloud_architecture", "process_flow", "bullet_list", "comparison"), "on_screen_text" (MAX 5-7 words), "bullet_points" (2-3 items), and natural teacher narration.
Always respond with valid JSON for that single scene only.`
    },
    {
      role: 'user',
      content: `Context: ${lessonContext.substring(0, 2500)}
Current Scene: ${JSON.stringify(scene)}
Refinement Goal: ${feedback || 'Make it cleaner, more engaging, with crisp punchy text and code-drawn diagrams'}
Level: ${learningLevel}

Return JSON with exactly this single scene structure:
{
  "scene_id": ${scene.scene_id || 1},
  "title": "${scene.title || 'Scene Headline'}",
  "slide_type": "${scene.slide_type || 'process_flow'}",
  "on_screen_text": "Punchy Concept (5-7 Words)",
  "bullet_points": ["Point 1", "Point 2", "Point 3"],
  "diagram_data": {
    "nodes": ["Node A", "Node B", "Node C"],
    "stages": ["Stage 1", "Stage 2", "Stage 3"]
  },
  "narration": "Natural teacher narration to be spoken.",
  "duration_estimate": ${scene.duration_estimate || scene.duration || 9.0}
}`
    }
  ];
};


