"""Build the 9:16 Reel cover from a clean frame of the source footage.

Usage:
    python3 render_cover.py SOURCE.mov OUTPUT.jpg FONT_DIR

Text sits inside the centre 3:4 area so it survives the profile grid crop.
"""
import os
import subprocess
import sys

from PIL import Image

from render_overlays import H, render_card

FRAME_TIME = 3.6  # full dome and a filled room, no motion blur
COVER = {
    "name": "cover",
    "lines": [
        ("INSIDE THE MANDALA", 500, 72, 0.12, 34),
        ("AN IMMERSIVE SOUND HEALING EXPERIENCE", 400, 32, 0.14, 30),
        ("JANUARY 17, 2027  ·  EDMONTON", 500, 34, 0.24, 0),
    ],
}


def main(src, dst, font_dir):
    work = os.path.dirname(os.path.abspath(dst))
    frame = os.path.join(work, "cover_frame.png")
    overlay = os.path.join(work, "cover_text.png")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(FRAME_TIME), "-i", src,
                    "-frames:v", "1", frame], check=True)
    # Dark band between dome and audience, just below centre.
    render_card(COVER, font_dir, overlay, center_y=H * 0.62)
    img = Image.open(frame).convert("RGBA")
    img.alpha_composite(Image.open(overlay))
    img.convert("RGB").save(dst, quality=95, subsampling=0)


if __name__ == "__main__":
    main(*sys.argv[1:4])
