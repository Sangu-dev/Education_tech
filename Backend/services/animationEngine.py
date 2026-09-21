import os
import sys
import json
import math
import argparse
import numpy as np
from PIL import Image, ImageDraw, ImageFont

# Import MoviePy with fallback across version 1.x and 2.x
try:
    from moviepy import VideoClip, AudioFileClip
except ImportError:
    import importlib
    try:
        mp_editor = importlib.import_module("moviepy.editor")
        VideoClip = getattr(mp_editor, "VideoClip")
        AudioFileClip = getattr(mp_editor, "AudioFileClip")
    except Exception as e:
        sys.stderr.write(f"MoviePy import error: {e}\n")
        raise

# ---------------------------------------------------------
# Typography and Styling Configurations
# ---------------------------------------------------------
WIDTH, HEIGHT = 1280, 720
FPS = 24

def get_font(size=20, bold=False):
    """
    Cross-platform modern sans-serif font loader (Segoe UI, Arial, Roboto, DejaVu)
    """
    candidates = []
    if sys.platform == 'win32':
        windir = os.environ.get('WINDIR', 'C:\\Windows')
        if bold:
            candidates.extend([
                os.path.join(windir, 'Fonts', 'segoeuib.ttf'),
                os.path.join(windir, 'Fonts', 'arialbd.ttf'),
                os.path.join(windir, 'Fonts', 'calibrib.ttf'),
            ])
        else:
            candidates.extend([
                os.path.join(windir, 'Fonts', 'segoeui.ttf'),
                os.path.join(windir, 'Fonts', 'arial.ttf'),
                os.path.join(windir, 'Fonts', 'calibri.ttf'),
            ])
    else:
        if bold:
            candidates.extend([
                '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
                '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
            ])
        else:
            candidates.extend([
                '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
                '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
            ])

    for font_path in candidates:
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, size)
            except Exception:
                pass

    try:
        font_name = 'arialbd.ttf' if bold else 'arial.ttf'
        return ImageFont.truetype(font_name, size)
    except Exception:
        return ImageFont.load_default()

FONT_TITLE = get_font(28, bold=True)
FONT_HEADING = get_font(22, bold=True)
FONT_PUNCHY = get_font(26, bold=True)
FONT_BODY = get_font(18, bold=False)
FONT_BADGE = get_font(13, bold=True)
FONT_SMALL = get_font(14, bold=False)

# ---------------------------------------------------------
# 1. Clean Studio Background & Moving Ambient Shapes
# ---------------------------------------------------------
def draw_floating_ambient_background(draw, t, duration):
    """
    Deep modern cinematic gradient (no glitchy textures)
    with smoothly drifting and gently pulsing geometric ambient orbs.
    """
    # Smooth vertical gradient
    for y in range(0, HEIGHT, 2):
        ratio = y / HEIGHT
        r = int(10 + ratio * 8)
        g = int(15 + ratio * 12)
        b = int(29 + ratio * 20)
        draw.line([(0, y), (WIDTH, y)], fill=(r, g, b), width=2)

    # Floating, gently pulsing ambient geometric rings
    ambient_orbs = [
        (180, 160, 95, 0.35, (30, 41, 75)),
        (1120, 190, 130, 0.45, (25, 38, 70)),
        (560, 590, 150, 0.30, (20, 32, 60)),
        (960, 610, 85, 0.50, (30, 41, 75)),
    ]
    for ox, oy, base_r, speed, color in ambient_orbs:
        drift_x = int(ox + 16 * math.cos(t * speed))
        drift_y = int(oy + 12 * math.sin(t * speed * 1.3))
        pulse = 1.0 + 0.07 * math.sin(t * speed * 2.0)
        cur_r = int(base_r * pulse)
        draw.ellipse([drift_x - cur_r, drift_y - cur_r, drift_x + cur_r, drift_y + cur_r],
                     outline=color, width=1)

# ---------------------------------------------------------
# 2. Animated Slide-in Header
# ---------------------------------------------------------
def draw_animated_header(draw, title, scene_id, t):
    """
    Top banner with scene badge, clean title, and glowing accent underline
    animated to slide down smoothly into place.
    """
    slide_p = min(1.0, t / 0.45)
    header_y = int(-40 + slide_p * 75)  # Eases from -40 down to 35

    # Badge Pill
    draw.rounded_rectangle([60, header_y, 280, header_y + 34], radius=8,
                           fill=(30, 27, 75), outline=(99, 102, 241), width=1)
    draw.text((75, header_y + 8), f"• SCENE {scene_id}  |  EXPLAINER", fill=(165, 180, 252), font=FONT_BADGE)

    # Title
    clean_title = (title or "Educational Lesson")[:55]
    draw.text((60, header_y + 45), clean_title, fill=(56, 189, 248), font=FONT_TITLE)

    # Expanding accent line
    line_progress = min(1.0, max(0.0, (t - 0.2) / 0.5))
    line_w = int(line_progress * 620)
    if line_w > 0:
        draw.line([(60, header_y + 88), (60 + line_w, header_y + 88)], fill=(129, 140, 248), width=3)

# ---------------------------------------------------------
# 3. Visual Area Diagram: Code-Drawn Cloud Architecture
# ---------------------------------------------------------
def draw_cloud_diagram(draw, t, duration, diagram_data):
    """
    Draws a programmatic vector Cloud shape with connected satellite nodes
    (Storage, Compute, Database) and animated traveling pulse signals.
    """
    cx, cy = 340, 260
    cloud_color = (20, 34, 64)
    cloud_border = (56, 189, 248)

    # Draw cloud body using overlapping geometric circles and a rounded base
    draw.rounded_rectangle([cx - 130, cy + 10, cx + 130, cy + 80], radius=35, fill=cloud_color, outline=cloud_border, width=3)
    draw.ellipse([cx - 100, cy - 30, cx - 10, cy + 60], fill=cloud_color, outline=cloud_border, width=3)
    draw.ellipse([cx - 20, cy - 60, cx + 70, cy + 30], fill=cloud_color, outline=cloud_border, width=3)
    draw.ellipse([cx + 30, cy - 20, cx + 110, cy + 60], fill=cloud_color, outline=cloud_border, width=3)
    
    # Fill internal overlap to clear inner borders
    draw.ellipse([cx - 95, cy - 25, cx - 15, cy + 55], fill=cloud_color)
    draw.ellipse([cx - 15, cy - 55, cx + 65, cy + 25], fill=cloud_color)
    draw.ellipse([cx + 35, cy - 15, cx + 105, cy + 55], fill=cloud_color)
    draw.rounded_rectangle([cx - 125, cy + 15, cx + 125, cy + 75], radius=30, fill=cloud_color)

    # Cloud central text
    draw.text((cx - 42, cy + 20), "CLOUD", fill=(255, 255, 255), font=FONT_HEADING)

    # Connected satellite nodes
    nodes = diagram_data.get('nodes', ['Storage', 'Compute', 'Database'])[:3]
    node_positions = [(cx - 180, cy + 190), (cx, cy + 230), (cx + 180, cy + 190)]

    for idx, (nx, ny) in enumerate(node_positions):
        label = nodes[idx] if idx < len(nodes) else f"Node {idx+1}"

        # Connector line
        draw.line([(cx, cy + 70), (nx, ny - 20)], fill=(51, 65, 85), width=2)

        # Traveling pulse packet along connector line
        pulse_pos = ((t * 1.4 + idx * 0.33) % 1.0)
        px = int(cx + (nx - cx) * pulse_pos)
        py = int((cy + 70) + ((ny - 20) - (cy + 70)) * pulse_pos)
        draw.ellipse([px - 5, py - 5, px + 5, py + 5], fill=(56, 189, 248))
        draw.ellipse([px - 2, py - 2, px + 2, py + 2], fill=(255, 255, 255))

        # Node container card
        draw.rounded_rectangle([nx - 75, ny - 24, nx + 75, ny + 24], radius=10,
                               fill=(15, 23, 42), outline=(99, 102, 241), width=2)
        draw.text((nx - 60, ny - 10), label[:14], fill=(226, 232, 240), font=FONT_BODY)

# ---------------------------------------------------------
# 4. Visual Area Diagram: Connected 3-Stage Process Flow
# ---------------------------------------------------------
def draw_process_flow_diagram(draw, t, duration, diagram_data):
    """
    Draws 3 connected boxes with directional arrows that sequentially activate.
    """
    stages = diagram_data.get('stages') or diagram_data.get('steps') or ['Stage 1: Ingestion', 'Stage 2: Processing', 'Stage 3: Storage']
    stages = stages[:3]
    active_idx = min(len(stages) - 1, int((t / max(duration, 0.1)) * len(stages)))

    start_y = 190
    card_w, card_h = 490, 80
    cx = 335

    for i, stage in enumerate(stages):
        cy = start_y + i * 115
        is_active = (i <= active_idx)
        border_color = (56, 189, 248) if is_active else (51, 65, 85)
        fill_color = (24, 38, 70) if is_active else (15, 23, 42)

        # Stage Card
        draw.rounded_rectangle([cx - card_w//2, cy, cx + card_w//2, cy + card_h], radius=14,
                               fill=fill_color, outline=border_color, width=3 if is_active else 1)

        # Number Badge
        badge_color = (99, 102, 241) if is_active else (30, 41, 59)
        draw.ellipse([cx - card_w//2 + 20, cy + 20, cx - card_w//2 + 60, cy + 60], fill=badge_color)
        draw.text((cx - card_w//2 + 35, cy + 27), str(i + 1), fill=(255, 255, 255), font=FONT_HEADING)

        # Stage Text
        text_color = (255, 255, 255) if is_active else (148, 163, 184)
        draw.text((cx - card_w//2 + 80, cy + 26), stage[:32], fill=text_color, font=FONT_HEADING)

        # Directional Arrow to next stage
        if i < len(stages) - 1:
            ay = cy + card_h + 6
            arrow_color = (56, 189, 248) if (i < active_idx) else (51, 65, 85)
            draw.line([(cx, ay), (cx, ay + 18)], fill=arrow_color, width=3)
            draw.polygon([(cx - 7, ay + 14), (cx + 7, ay + 14), (cx, ay + 24)], fill=arrow_color)

# ---------------------------------------------------------
# 5. Visual Area Diagram: Sequential Animated Bullet Cards
# ---------------------------------------------------------
def draw_sequential_bullet_cards(draw, t, duration, bullet_points):
    """
    Renders sleek bullet cards that reveal sequentially over time synced with the narration.
    """
    bullets = (bullet_points or ["Core System Architecture", "Elastic Automated Scaling", "High Availability"])[:3]
    cx = 335
    start_y = 190
    card_w, card_h = 500, 95

    for i, bullet in enumerate(bullets):
        appear_time = (i * 0.28) * duration
        if t < appear_time:
            continue

        p = min(1.0, (t - appear_time) / 0.4)
        slide_offset = int((1.0 - p) * -35)
        cy = start_y + i * 125

        draw.rounded_rectangle([cx - card_w//2 + slide_offset, cy, cx + card_w//2 + slide_offset, cy + card_h],
                               radius=14, fill=(15, 23, 42), outline=(99, 102, 241), width=2)
        
        # Bullet Glyph
        draw.text((cx - card_w//2 + slide_offset + 25, cy + 18), f"✦  {bullet[:36]}",
                  fill=(56, 189, 248), font=FONT_HEADING)
        if len(bullet) > 36:
            draw.text((cx - card_w//2 + slide_offset + 50, cy + 54), bullet[36:78],
                      fill=(203, 213, 225), font=FONT_BODY)

# ---------------------------------------------------------
# 6. Visual Area Diagram: Dual Comparison Columns
# ---------------------------------------------------------
def draw_comparison_diagram(draw, t, duration, diagram_data):
    """
    Draws side-by-side comparison cards (e.g. Traditional vs Cloud).
    """
    left_title = diagram_data.get('left_title', 'Traditional')[:20]
    left_points = diagram_data.get('left_points', ['Manual setup', 'Rigid scaling'])[:2]
    right_title = diagram_data.get('right_title', 'Cloud Architecture')[:20]
    right_points = diagram_data.get('right_points', ['Instant automation', 'Elastic capacity'])[:2]

    # Left Column (Legacy / Traditional)
    draw.rounded_rectangle([80, 190, 310, 560], radius=14, fill=(24, 20, 35), outline=(239, 68, 68), width=2)
    draw.rounded_rectangle([100, 205, 290, 240], radius=8, fill=(45, 20, 25))
    draw.text((115, 215), left_title, fill=(252, 165, 165), font=FONT_BADGE)
    for idx, pt in enumerate(left_points):
        draw.text((100, 270 + idx * 80), f"✕  {pt[:18]}", fill=(248, 113, 113), font=FONT_BODY)

    # Right Column (Modern / Cloud)
    draw.rounded_rectangle([340, 190, 580, 560], radius=14, fill=(16, 32, 45), outline=(56, 189, 248), width=2)
    draw.rounded_rectangle([360, 205, 560, 240], radius=8, fill=(15, 45, 60))
    draw.text((375, 215), right_title, fill=(125, 211, 252), font=FONT_BADGE)
    for idx, pt in enumerate(right_points):
        draw.text((360, 270 + idx * 80), f"✓  {pt[:18]}", fill=(52, 211, 153), font=FONT_BODY)

# ---------------------------------------------------------
# 7. Clean Solid Fallback Shape (Never Static Noise)
# ---------------------------------------------------------
def draw_clean_fallback_visual(draw, t, scene):
    """
    Guaranteed clean, elegant fallback card with vector icon if any data is missing.
    Prevents glitchy static-noise boxes or broken images.
    """
    cx, cy = 335, 360
    draw.rounded_rectangle([cx - 250, cy - 180, cx + 250, cy + 180], radius=18,
                           fill=(15, 23, 42), outline=(56, 189, 248), width=2)

    # Geometric vector badge icon
    draw.polygon([(cx, cy - 90), (cx + 50, cy - 40), (cx, cy + 10), (cx - 50, cy - 40)],
                 fill=(30, 27, 75), outline=(99, 102, 241), width=2)
    draw.text((cx - 15, cy - 55), "✦", fill=(56, 189, 248), font=FONT_TITLE)
    draw.text((cx - 130, cy + 45), (scene.get('title') or "Concept Overview")[:25],
              fill=(255, 255, 255), font=FONT_HEADING)

# ---------------------------------------------------------
# 8. Right Text Card: Typewriter Punchy Text (Max 5-7 Words)
# ---------------------------------------------------------
def draw_text_card(draw, t, duration, scene):
    """
    Renders the right-hand text container with punchy on_screen_text (max 5-7 words)
    animated with a crisp typewriter effect, plus narration subtitle text.
    """
    card_x, card_y = 660, 160
    card_w, card_h = 560, 480

    # Glassmorphic Card Container
    draw.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + card_h],
                           radius=20, fill=(15, 23, 42), outline=(51, 65, 85), width=2)

    # Header Tag
    draw.rounded_rectangle([card_x + 35, card_y + 35, card_x + 230, card_y + 70],
                           radius=8, fill=(30, 27, 75), outline=(129, 140, 248), width=1)
    draw.text((card_x + 50, card_y + 45), "• CORE TAKEAWAY", fill=(199, 210, 254), font=FONT_BADGE)

    # Punchy on-screen text (5-7 words)
    raw_punchy = scene.get('on_screen_text') or scene.get('title') or "Key Concept Exploration"
    if isinstance(raw_punchy, list):
        words = (" ".join(str(x) for x in raw_punchy)).split()[:7]
    else:
        words = str(raw_punchy).split()[:7]
    punchy_str = " ".join(words)

    # Typewriter character reveal
    type_p = min(1.0, max(0.0, (t - 0.35) / 0.8))
    chars_to_show = int(len(punchy_str) * type_p)
    revealed_text = punchy_str[:chars_to_show]

    draw.text((card_x + 35, card_y + 90), revealed_text, fill=(56, 189, 248), font=FONT_PUNCHY)
    draw.line([(card_x + 35, card_y + 135), (card_x + 380, card_y + 135)], fill=(99, 102, 241), width=2)

    # Narration lines (word-wrapped)
    narration_text = (scene.get('narration') or "")[:220]
    words = narration_text.split()
    lines, cur_line = [], ""
    for w in words:
        if len(cur_line + " " + w) > 36:
            lines.append(cur_line)
            cur_line = w
        else:
            cur_line = (cur_line + " " + w).strip()
    if cur_line:
        lines.append(cur_line)

    y_text = card_y + 160
    for l in lines[:5]:
        draw.text((card_x + 35, y_text), l, fill=(226, 232, 240), font=FONT_BODY)
        y_text += 34

    # Bullet tags at the bottom of the card
    bullet_items = scene.get('bullet_points') or []
    if bullet_items:
        by = card_y + 360
        for b_item in bullet_items[:2]:
            b_str = f"▸ {str(b_item)[:38]}"
            draw.text((card_x + 35, by), b_str, fill=(148, 163, 184), font=FONT_SMALL)
            by += 28

# ---------------------------------------------------------
# 9. Bottom Audio Sync Timeline
# ---------------------------------------------------------
def draw_bottom_progress(draw, t, duration):
    """Draws live timeline audio synchronization progress bar"""
    dur = max(duration, 0.1)
    progress = min(1.0, max(0.0, t / dur))
    bar_x1, bar_y = 60, 680
    bar_x2 = WIDTH - 60
    total_w = bar_x2 - bar_x1

    draw.rounded_rectangle([bar_x1, bar_y, bar_x2, bar_y + 8], radius=4, fill=(30, 41, 59))
    fill_w = int(total_w * progress)
    if fill_w > 0:
        draw.rounded_rectangle([bar_x1, bar_y, bar_x1 + fill_w, bar_y + 8], radius=4, fill=(14, 165, 233))
        draw.ellipse([bar_x1 + fill_w - 4, bar_y - 2, bar_x1 + fill_w + 6, bar_y + 10], fill=(56, 189, 248))

    time_str = f"{t:04.1f}s / {dur:04.1f}s (Audio Sync)"
    draw.text((WIDTH - 240, bar_y - 22), time_str, fill=(148, 163, 184), font=FONT_SMALL)

# ---------------------------------------------------------
# Master Frame Dispatcher for Programmatic Slides
# ---------------------------------------------------------
def make_programmatic_slide_frame(scene, t, duration):
    """
    Renders an entire 24fps programmatic slide frame purely from code.
    No external images, no raw PDF pages, no broken noise.
    """
    img = Image.new('RGB', (WIDTH, HEIGHT), color=(10, 15, 29))
    draw = ImageDraw.Draw(img)

    # 1. Background
    draw_floating_ambient_background(draw, t, duration)

    # 2. Animated Slide-in Header
    draw_animated_header(draw, scene.get('title'), scene.get('scene_id', 1), t)

    # 3. Visual Area Diagram (Left/Center)
    slide_type = (scene.get('slide_type') or '').lower()
    raw_punchy = scene.get('on_screen_text') or scene.get('title') or ''
    punchy_str = (" ".join(str(x) for x in raw_punchy)) if isinstance(raw_punchy, list) else str(raw_punchy)
    title_str = str(scene.get('title') or '')
    desc = (title_str + ' ' + punchy_str).lower()
    diagram_data = scene.get('diagram_data') or {}

    if slide_type == 'cloud_architecture' or 'cloud' in desc:
        draw_cloud_diagram(draw, t, duration, diagram_data)
    elif slide_type == 'process_flow' or 'stage' in desc or 'pipeline' in desc or 'flow' in desc:
        draw_process_flow_diagram(draw, t, duration, diagram_data)
    elif slide_type == 'comparison' or 'versus' in desc or 'vs' in desc:
        draw_comparison_diagram(draw, t, duration, diagram_data)
    elif slide_type == 'bullet_list' or scene.get('bullet_points'):
        draw_sequential_bullet_cards(draw, t, duration, scene.get('bullet_points'))
    else:
        draw_clean_fallback_visual(draw, t, scene)

    # 4. Text Area (Right)
    draw_text_card(draw, t, duration, scene)

    # 5. Bottom Progress Bar
    draw_bottom_progress(draw, t, duration)

    # 6. Smooth Scene In/Out Fade Transitions
    fade = 1.0
    if t < 0.35:
        fade = max(0.0, t / 0.35)
    elif t > (duration - 0.35):
        fade = max(0.0, (duration - t) / 0.35)

    if fade < 1.0:
        dark_canvas = Image.new('RGB', (WIDTH, HEIGHT), color=(10, 15, 29))
        img = Image.blend(dark_canvas, img, fade)

    return np.array(img)

# ---------------------------------------------------------
# Scene Video Renderer Function
# ---------------------------------------------------------
def render_scene_video(scene, output_mp4, duration, audio_path=None, fps=FPS):
    """
    Renders animated programmatic slide scene to MP4 matching exact audio duration.
    """
    dur = max(2.5, float(duration))
    sys.stdout.write(f"Rendering programmatic slide {scene.get('scene_id', 1)} [{scene.get('slide_type', 'slide')}] for {dur:.2f}s...\n")
    sys.stdout.flush()

    def frame_gen(t):
        return make_programmatic_slide_frame(scene, t, dur)

    clip = VideoClip(frame_gen, duration=dur)

    audio_clip = None
    if audio_path and os.path.exists(audio_path):
        try:
            audio_clip = AudioFileClip(audio_path)
            if audio_clip.duration > dur:
                audio_clip = audio_clip.subclipped(0, dur)
            clip = clip.with_audio(audio_clip)
        except Exception as a_err:
            sys.stderr.write(f"Warning: could not attach audio: {a_err}\n")

    os.makedirs(os.path.dirname(os.path.abspath(output_mp4)), exist_ok=True)

    clip.write_videofile(
        output_mp4,
        fps=fps,
        codec='libx264',
        audio_codec='aac' if audio_clip else None,
        preset='ultrafast',
        logger=None
    )

    if audio_clip:
        audio_clip.close()
    clip.close()
    return True

# ---------------------------------------------------------
# CLI Interface
# ---------------------------------------------------------
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="ELearnAI Programmatic Slide Engine")
    parser.add_argument('--scene-json', required=True, help="Path to scene JSON file")
    parser.add_argument('--output', required=True, help="Output MP4 file path")
    parser.add_argument('--duration', type=float, default=None, help="Exact duration in seconds")
    parser.add_argument('--audio', default=None, help="Optional audio file path")
    parser.add_argument('--fps', type=int, default=24, help="Frames per second")

    args = parser.parse_args()

    with open(args.scene_json, 'r', encoding='utf-8') as f:
        scene_data = json.load(f)

    dur = args.duration or scene_data.get('duration') or scene_data.get('duration_estimate') or 6.0

    success = render_scene_video(scene_data, args.output, dur, audio_path=args.audio, fps=args.fps)
    print(json.dumps({"success": success, "output": args.output, "duration": dur}))
