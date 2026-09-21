/**
 * AI Teacher Scene Planner & Pedagogical Explanation Prompt
 * Transforms PDF / lesson content into a structured educational video plan
 * with conversational teacher narration, diagrams, and synchronized animation steps.
 */

export const buildTeacherScenePrompt = (contentContext, options = {}) => {
  const {
    topicTitle = 'Educational Topic',
    learningLevel = 'beginner',
    videoStyle = 'technical',
    targetDurationSec = 60,
  } = options;

  const levelInstructions = {
    beginner: 'Use simple, friendly language, rich everyday analogies, and clear step-by-step logic without overwhelming jargon.',
    school: 'Use clear foundational terminology, relatable examples, engaging questions, and easy-to-follow diagrams.',
    college: 'Provide solid conceptual grounding, formal definitions, systematic flowcharts, and academic depth.',
    intermediate: 'Balance practical mechanics, architectural trade-offs, real-world industry use cases, and technical precision.',
    advanced: 'Dive deep into architectural nuances, algorithmic details, edge cases, underlying mechanics, and complex relationships.',
  };

  const styleInstructions = {
    whiteboard: 'Emphasize sketch-like progression, drawing steps out sequentially, handwritten-style keyword highlights.',
    infographic: 'Emphasize sleek metric cards, clean process flows, bold statistics, and modern visual badges.',
    technical: 'Emphasize node-link architecture, neural network layers, data pipelines, flowcharts, and state transitions.',
    classroom: 'Emphasize structured board presentation, clear bulleted reveals, key definition callouts, and checkpoint questions.',
    storytelling: 'Frame the explanation as a journey: introducing a relatable challenge, exploring how things work, and reaching the "aha!" moment.',
  };

  const selectedLevel = levelInstructions[learningLevel.toLowerCase()] || levelInstructions.beginner;
  const selectedStyle = styleInstructions[videoStyle.toLowerCase()] || styleInstructions.technical;

  return [
    {
      role: 'system',
      content: `You are an elite AI Teacher, educational video architect, and master animator.
Your mission is to understand the provided educational material and teach it through a dynamic, scene-by-scene animated video plan.

PEDAGOGICAL TEACHING RULES:
1. Do NOT simply read or copy the text. Explain concepts conversationally like a great teacher.
2. Use conversational phrases such as:
   - "Let's understand this with a simple example."
   - "Imagine that you are..."
   - "Now let's see what happens step by step."
   - "This is important because..."
   - "Notice how the data flows from here to there."
   - "Here's an easy way to remember this."
3. Every scene MUST have a purposeful visual diagram — NO long static walls of text.
4. Target learning level: ${learningLevel.toUpperCase()} (${selectedLevel}).
5. Target visual style: ${videoStyle.toUpperCase()} (${selectedStyle}).
6. Divide the explanation into 5 to 7 logical scenes (Introduction, Core Concept, Visual Diagram/Process, Analogy/Example, Deep Dive/Misconception, Recap/Check).

SUPPORTED DIAGRAM TYPES:
- "neural_network": Input Layer → Hidden Layers → Output Layer with pulsing synapses
- "ml_pipeline": Dataset → Training → Model → Prediction flow
- "process": Step-by-step sequential nodes with animated data transfer
- "flowchart": Decision points, branch logic, directional arrows
- "comparison": Side-by-side features, pros vs cons, table comparison
- "sorting": Animated elements/bars being compared, swapped, ordered
- "timeline": Chronological milestone nodes with dates and events
- "architecture": Client-server, database, components, and API relations
- "code_execution": Code block with line-by-line highlight and output preview
- "concept_map": Central hub node with radiating branches and keyword tags
- "formula": Mathematical equation breakdown with highlighted terms

DIAGRAM DATA SPECIFICATION:
Provide a rich "diagram_data" object for each scene so both Manim and frontend canvas can animate it.
Example for "ml_pipeline":
{
  "steps": ["Dataset", "Training", "Model", "Prediction"],
  "activeStep": 2,
  "description": "Data enters training algorithm to produce model"
}
Example for "neural_network":
{
  "layers": [
    {"name": "Input", "neurons": 3},
    {"name": "Hidden", "neurons": 4},
    {"name": "Output", "neurons": 2}
  ],
  "dataFlow": "forward"
}
Example for "process" / "flowchart":
{
  "nodes": [{"id": 1, "label": "Start"}, {"id": 2, "label": "Analyze"}, {"id": 3, "label": "Result"}],
  "edges": [{"from": 1, "to": 2, "label": "Feed"}, {"from": 2, "to": 3, "label": "Output"}]
}
Example for "comparison":
{
  "left": {"title": "Option A", "points": ["Fast", "Simple"]},
  "right": {"title": "Option B", "points": ["Scalable", "Robust"]}
}
Example for "concept_map":
{
  "central": "Machine Learning",
  "branches": ["Supervised", "Unsupervised", "Reinforcement"]
}

Always return strict, valid JSON ONLY. No markdown formatting outside the JSON.`
    },
    {
      role: 'user',
      content: `Topic: "${topicTitle}"
Learning Level: ${learningLevel}
Visual Style: ${videoStyle}

CONTENT TO TEACH:
${contentContext.substring(0, 5000)}

Create the complete structured lesson plan with 5 to 7 scenes.
Return JSON strictly in this structure:
{
  "title": "Clear educational lesson title",
  "topic": "${topicTitle}",
  "learningLevel": "${learningLevel}",
  "videoStyle": "${videoStyle}",
  "totalEstimatedDuration": 60,
  "scenes": [
    {
      "scene_id": 1,
      "title": "Scene headline",
      "duration": 10,
      "narration": "Natural, conversational teacher narration (2-3 sentences)",
      "visual_description": "Precise description of what animates on screen",
      "animation_steps": [
        "First step of animation",
        "Second step of animation",
        "Final step of animation"
      ],
      "on_screen_text": ["Key 1", "Key 2", "Key 3"],
      "important_keywords": ["Keyword1", "Keyword2"],
      "diagram_type": "ml_pipeline",
      "diagram_data": {
        "steps": ["Dataset", "Training", "Model", "Prediction"],
        "activeStep": 1,
        "description": "Raw data collected and prepared"
      },
      "transition": "fade",
      "educational_purpose": "introduce_concept"
    }
  ]
}`
    }
  ];
};

/**
 * Prompt to regenerate a single scene if the user wants an improved explanation
 */
export const buildSingleSceneRegeneratePrompt = (scene, lessonContext, options = {}) => {
  const { learningLevel = 'beginner', videoStyle = 'technical', feedback = '' } = options;

  return [
    {
      role: 'system',
      content: `You are an expert AI Teacher. Regenerate and improve this single video scene.
Keep the narration conversational, dynamic, and educational. Provide clear diagram instructions.
Always respond with valid JSON for that single scene only.`
    },
    {
      role: 'user',
      content: `Context: ${lessonContext.substring(0, 3000)}
Current Scene: ${JSON.stringify(scene)}
User Feedback / Refinement Goal: ${feedback || 'Make it even clearer, more engaging, with intuitive diagram steps'}
Level: ${learningLevel}
Style: ${videoStyle}

Return JSON with exactly this single scene structure:
{
  "scene_id": ${scene.scene_id},
  "title": "Scene headline",
  "duration": 12,
  "narration": "Improved conversational narration",
  "visual_description": "Improved visual description",
  "animation_steps": ["Step 1", "Step 2", "Step 3"],
  "on_screen_text": ["Key 1", "Key 2"],
  "important_keywords": ["Keyword1"],
  "diagram_type": "process",
  "diagram_data": { ... },
  "transition": "fade",
  "educational_purpose": "explain_concept"
}`
    }
  ];
};
