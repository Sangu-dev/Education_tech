/**
 * Node.js Pipeline Integration Test
 * Verifies animationService.js renderCompleteLessonVideo using the new MoviePy/Pillow Animation Engine
 */
import path from 'path';
import fs from 'fs';
import { renderCompleteLessonVideo } from '../services/animationService.js';
import logger from '../utils/logger.js';

async function runNodeIntegrationTest() {
  console.log('='.repeat(70));
  console.log('>> NODE.JS ANIMATION INTEGRATION TEST');
  console.log('='.repeat(70));

  const mockLesson = {
    _id: 'test_lesson_' + Date.now(),
    title: 'Distributed Systems & Microservices',
    learningLevel: 'intermediate',
    videoStyle: 'technical',
  };

  const mockScenes = [
    {
      scene_id: 1,
      title: 'Introduction to Distributed Architecture',
      narration: 'In distributed systems, individual services collaborate across network boundaries to deliver scalable application capabilities.',
      visual_prompt: 'A sleek terminal interface presenting distributed system definitions with typewriter text.',
      animation_type: 'text_typewriter',
      duration_estimate: 7.0,
      important_keywords: ['Microservices', 'Distributed', 'Resilience'],
      on_screen_text: ['Network Boundaries', 'Horizontal Scale'],
    },
    {
      scene_id: 2,
      title: 'Request Routing & Load Balancing',
      narration: 'Requests arrive through an API gateway, get routed across healthy worker nodes, and return unified responses.',
      visual_prompt: 'A progressive flowchart drawing showing gateway, load balancer, and service replicas with animated data arrows.',
      animation_type: 'shape_drawing',
      duration_estimate: 7.5,
      diagram_data: {
        steps: ['API Gateway', 'Load Balancer', 'Service Cluster'],
      },
      important_keywords: ['Gateway', 'Balancing', 'Workers'],
      on_screen_text: ['Step 1: Ingress', 'Step 2: Dispatch', 'Step 3: Execution'],
    },
  ];

  try {
    const progressUpdates = [];
    const onProgress = (step, pct) => {
      console.log(`[Progress ${pct}%] ${step}`);
      progressUpdates.push({ step, pct });
    };

    const result = await renderCompleteLessonVideo(mockLesson, mockScenes, {
      lang: 'en',
      videoStyle: 'technical',
      onProgress,
    });

    console.log('='.repeat(70));
    console.log('>> NODE PIPELINE TEST COMPLETED SUCCESSFULLY!');
    console.log('Video URL:', result.videoUrl);
    console.log('Rendered Scenes:', result.scenes.length);

    for (const sc of result.scenes) {
      console.log(`  - Scene #${sc.scene_id}: Duration ${sc.duration.toFixed(2)}s | Audio: ${sc.audioUrl} | Clip: ${sc.videoClipUrl}`);
    }

    const fullPath = path.resolve(import.meta.dirname, '..', result.videoUrl.replace(/^\//, ''));
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      console.log(`Final File Exists: YES | Size: ${stats.size.toLocaleString()} bytes`);
    } else {
      console.log(`Warning: file not found at ${fullPath}`);
    }
    console.log('='.repeat(70));
  } catch (error) {
    console.error('Test Failed:', error);
    process.exit(1);
  }
}

runNodeIntegrationTest();
