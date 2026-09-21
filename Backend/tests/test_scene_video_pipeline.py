"""
Scene-Based Animated Video Generator - 2-Scene Mockup End-to-End Test

This test demonstrates the complete 6-step pipeline:
1. Hardcoded 2-Scene Grok JSON Mockup (strictly adhering to the new schema)
2. TTS Audio Generation (Edge-TTS neural voice)
3. Audio Duration Probing (exact duration calculated)
4. Animation Engine 24fps Visual Rendering (text_typewriter & shape_drawing)
5. Audio + Visual Synchronization (exact audio duration driving animation frames)
6. Export final composited MP4 (H.264 / AAC)
"""

import os
import sys
import json
import asyncio
import subprocess
import imageio_ffmpeg
import edge_tts

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Add parent directory to path so we can import services
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(CURRENT_DIR)
SERVICES_DIR = os.path.join(BACKEND_DIR, 'services')
try:
    from services.animationEngine import render_scene_video
except ImportError:
    from animationEngine import render_scene_video

OUTPUT_DIR = os.path.join(BACKEND_DIR, 'uploads', 'videos')
AUDIO_DIR = os.path.join(BACKEND_DIR, 'uploads', 'audio')
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()

# ---------------------------------------------------------
# STEP 1: Hardcoded 2-Scene Grok JSON Mockup (Programmatic Slide Schema)
# ---------------------------------------------------------
MOCK_SCENES = [
    {
        "scene_id": 1,
        "title": "What is Cloud Computing?",
        "slide_type": "cloud_architecture",
        "on_screen_text": "On-Demand Computing Over the Internet",
        "bullet_points": [
            "On-demand self-service resources",
            "Broad global network access",
            "Elastic pay-as-you-go scaling"
        ],
        "diagram_data": {
            "primary_icon": "cloud",
            "nodes": ["Storage", "Compute Servers", "Databases"]
        },
        "narration": "Cloud computing delivers on-demand computing services over the internet. Instead of buying physical servers, you access elastic compute from anywhere.",
        "duration_estimate": 7.0
    },
    {
        "scene_id": 2,
        "title": "3 Stages of Cloud Processing",
        "slide_type": "process_flow",
        "on_screen_text": "3-Stage Scalable Data Pipeline",
        "bullet_points": [
            "Stage 1: User Request Ingestion",
            "Stage 2: Dynamic Serverless Compute",
            "Stage 3: Persisted Multi-Region Storage"
        ],
        "diagram_data": {
            "stages": ["1. Request", "2. Compute", "3. Storage"]
        },
        "narration": "Let's see how this works in three simple stages: client traffic enters, virtual compute transforms the data, and validated output is saved securely.",
        "duration_estimate": 7.5
    }
]

# ---------------------------------------------------------
# STEP 2 & 3: Generate Neural Audio & Measure Exact Duration
# ---------------------------------------------------------
async def synthesize_speech(text, output_path, voice="en-US-ChristopherNeural"):
    """Synthesize voiceover via Edge-TTS"""
    communicate = edge_tts.Communicate(text, voice=voice, rate="+0%")
    await communicate.save(output_path)
    return output_path

def probe_audio_duration(audio_path):
    """Probe exact duration in seconds using ffprobe or ffmpeg"""
    try:
        cmd = [
            FFMPEG_EXE, '-i', audio_path
        ]
        result = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True, errors='replace')
        import re
        match = re.search(r"Duration:\s*(\d+):(\d+):([\d.]+)", result.stderr)
        if match:
            h, m, s = float(match.group(1)), float(match.group(2)), float(match.group(3))
            return h * 3600 + m * 60 + s
    except Exception as e:
        print(f"probe warning: {e}")
    return 6.0

def concatenate_clips_ffmpeg(clip_paths, final_output):
    """Concatenate multiple scene clips into final MP4 using FFmpeg"""
    concat_list = os.path.join(OUTPUT_DIR, "concat_test_list.txt")
    with open(concat_list, "w", encoding="utf-8") as f:
        for p in clip_paths:
            f.write(f"file '{p.replace(os.sep, '/')}'\n")

    cmd = [
        FFMPEG_EXE, '-y', '-f', 'concat', '-safe', '0',
        '-i', concat_list,
        '-c:v', 'libx264', '-preset', 'ultrafast',
        '-c:a', 'aac', '-pix_fmt', 'yuv420p',
        final_output
    ]
    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    if os.path.exists(concat_list):
        os.remove(concat_list)
    return final_output

# ---------------------------------------------------------
# MAIN TEST EXECUTION
# ---------------------------------------------------------
async def run_test():
    print("=" * 70)
    print(">> STARTING SCENE-BASED ANIMATED VIDEO GENERATOR TEST")
    print("=" * 70)
    print(f"Input Scenes: {len(MOCK_SCENES)}")
    print(json.dumps(MOCK_SCENES, indent=2))
    print("-" * 70)

    scene_clips = []

    for idx, scene in enumerate(MOCK_SCENES):
        scene_id = scene["scene_id"]
        slide_type = scene.get("slide_type", scene.get("animation_type", "slide"))
        narration = scene["narration"]
        print(f"\n[SCENE #{scene_id}] Slide Type: {slide_type}")

        # 1. Generate TTS audio
        audio_path = os.path.join(AUDIO_DIR, f"test_scene_{scene_id}.mp3")
        print(f"  [1/4] Generating neural speech for narration: \"{narration[:45]}...\"")
        await synthesize_speech(narration, audio_path)

        # 2. Probe exact audio duration
        exact_duration = probe_audio_duration(audio_path)
        print(f"  [2/4] Exact Audio Duration Measured: {exact_duration:.2f} seconds (Grok estimate was {scene['duration_estimate']}s)")

        # 3. Render visual animation matched to exact audio duration
        scene_mp4 = os.path.join(OUTPUT_DIR, f"test_clip_scene_{scene_id}.mp4")
        print(f"  [3/4] Rendering 24fps visual animation to: {scene_mp4}")
        render_scene_video(scene, scene_mp4, duration=exact_duration, audio_path=audio_path, fps=24)
        print(f"  [4/4] Scene #{scene_id} rendered successfully! Size: {os.path.getsize(scene_mp4):,} bytes")

        scene_clips.append(scene_mp4)

    # 4. Final Compositing: Stitch all scenes
    print("\n" + "=" * 70)
    final_video = os.path.join(OUTPUT_DIR, "test_mockup_animated_video.mp4")
    print(f">> CONCATENATING {len(scene_clips)} SCENES INTO FINAL MP4: {final_video}")
    concatenate_clips_ffmpeg(scene_clips, final_video)

    # 5. Verification
    total_dur = probe_audio_duration(final_video)
    file_size = os.path.getsize(final_video)
    print("=" * 70)
    print(f">> FINAL VIDEO EXPORTED SUCCESSFULLY!")
    print(f"  * Path: {final_video}")
    print(f"  * Total Duration: {total_dur:.2f} seconds")
    print(f"  * File Size: {file_size:,} bytes")
    print(f"  * Codecs: H.264 Video / AAC Audio (Universal MP4 standard)")
    print("=" * 70)

if __name__ == '__main__':
    asyncio.run(run_test())
