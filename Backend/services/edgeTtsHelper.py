import sys
import os
import json
import asyncio
import argparse
import re
import edge_tts

# Default neural voices per language
VOICE_MAP = {
    'en': 'en-US-ChristopherNeural',  # Clear, authoritative teacher voice
    'hi': 'hi-IN-SwaraNeural',        # Fluent Hindi teacher
    'kn': 'kn-IN-GaganNeural',        # Fluent Kannada teacher
    'te': 'te-IN-MohanNeural',        # Fluent Telugu teacher
    'ta': 'ta-IN-ValluvarNeural',     # Fluent Tamil teacher
    'ml': 'ml-IN-MidhunNeural',       # Fluent Malayalam teacher
}

def clean_narration_text(text):
    """Clean markdown, code symbols, formatting for clear pronunciation"""
    if not text:
        return ""
    # Remove markdown formatting
    cleaned = re.sub(r'[*_~`#\[\]]', '', text)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned

async def generate_speech(text, voice, output_path):
    communicate = edge_tts.Communicate(text, voice, rate="+0%", pitch="+0Hz")
    await communicate.save(output_path)

def main():
    parser = argparse.ArgumentParser(description="Edge-TTS Neural Voice Generator")
    parser.add_argument("--text", type=str, default="", help="Narration text")
    parser.add_argument("--text-file", type=str, default="", help="Path to text file containing narration")
    parser.add_argument("--lang", type=str, default="en", help="Language code (en, hi, kn, te, ta, ml)")
    parser.add_argument("--voice", type=str, default="", help="Explicit voice override")
    parser.add_argument("--output", type=str, required=True, help="Destination mp3 file path")

    args = parser.parse_args()

    # Read text
    text = args.text
    if args.text_file and os.path.exists(args.text_file):
        with open(args.text_file, 'r', encoding='utf-8') as f:
            text = f.read()

    cleaned = clean_narration_text(text)
    if not cleaned:
        cleaned = "This lesson contains visual diagrams and conceptual explanations."

    voice = args.voice or VOICE_MAP.get(args.lang.lower(), 'en-US-ChristopherNeural')

    # Ensure output directory exists
    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)

    try:
        asyncio.run(generate_speech(cleaned, voice, args.output))
        if os.path.exists(args.output) and os.path.getsize(args.output) > 500:
            print(json.dumps({
                "success": True,
                "output": args.output,
                "voice": voice,
                "sizeBytes": os.path.getsize(args.output)
            }))
            sys.exit(0)
        else:
            print(json.dumps({"success": False, "error": "Generated audio file was empty or missing"}))
            sys.exit(1)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
