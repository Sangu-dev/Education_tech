import sys
import os
import json
import argparse
from PIL import Image, ImageDraw

def generate_fallback_card(title, diagram_type, description, keywords, output_path):
    width, height = 1280, 720
    img = Image.new('RGB', (width, height), color='#070B14')
    draw = ImageDraw.Draw(img)

    # Subtle gradient
    for y in range(height):
        ratio = y / height
        r = int(7 + ratio * 15)
        g = int(11 + ratio * 16)
        b = int(20 + ratio * 35)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Outer border
    draw.rounded_rectangle([40, 30, width - 40, height - 30], radius=24, outline='#1E293B', width=2)
    draw.rounded_rectangle([44, 34, width - 44, height - 34], radius=22, outline='#0EA5E9', width=1)

    # Top Badge (Diagram Type)
    badge_text = f"• {diagram_type.upper().replace('_', ' ')}"
    draw.rounded_rectangle([70, 55, 340, 95], radius=12, fill='#1E1B4B', outline='#6366F1', width=2)
    draw.text((90, 68), badge_text, fill='#A5B4FC')

    # Title
    safe_title = (title or "Educational Lesson")[:50]
    draw.text((70, 120), safe_title, fill='#38BDF8')
    draw.line([(70, 165), (750, 165)], fill='#818CF8', width=3)

    # Center card container
    draw.rounded_rectangle([70, 195, width - 70, 520], radius=20, fill='#0B132B', outline='#334155', width=2)
    draw.text((110, 230), "AI TEACHER LESSON EXPLANATION", fill='#38BDF8')

    # Word wrap description
    safe_desc = description or "Interactive educational lesson with visual concept modeling and teacher voice narration."
    words = safe_desc.split(' ')
    lines = []
    cur_line = ""
    for w in words:
        if len(cur_line + " " + w) > 65:
            lines.append(cur_line)
            cur_line = w
        else:
            cur_line = (cur_line + " " + w).strip()
    if cur_line:
        lines.append(cur_line)

    y_text = 280
    for line in lines[:4]:
        draw.text((110, y_text), line, fill='#E2E8F0')
        y_text += 40

    # Keywords badges
    kw_x = 70
    for kw in (keywords or [])[:4]:
        kw_str = f"✦ {str(kw)[:20]}"
        kw_w = max(160, len(kw_str) * 12 + 30)
        draw.rounded_rectangle([kw_x, 560, kw_x + kw_w, 610], radius=12, fill='#1E1B4B', outline='#6366F1', width=2)
        draw.text((kw_x + 18, 578), kw_str, fill='#C7D2FE')
        kw_x += kw_w + 20

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    img.save(output_path, 'PNG')
    return True

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--json-file', default='')
    parser.add_argument('--output', required=True)
    args = parser.parse_args()

    title = 'Educational Lesson'
    diag_type = 'concept'
    desc = ''
    keywords = []

    if args.json_file and os.path.exists(args.json_file):
        try:
            with open(args.json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                title = data.get('title', title)
                diag_type = data.get('diagram_type', diag_type)
                desc = data.get('visual_description') or data.get('narration', '')
                keywords = data.get('important_keywords', [])
        except Exception:
            pass

    success = generate_fallback_card(title, diag_type, desc, keywords, args.output)
    print(json.dumps({"success": success, "output": args.output}))
