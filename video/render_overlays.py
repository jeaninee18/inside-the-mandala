"""Add cinematic text overlays to the Inside the Mandala teaser.

The footage is never altered: text is rendered to transparent 1080x1920 cards,
then composited on top with alpha fades. Audio is copied untouched.

Usage:
    python3 render_overlays.py SOURCE.mov OUTPUT.mp4 FONT_DIR

FONT_DIR must contain jost-400.ttf and jost-500.ttf (Jost, the site's sans).
"""
import os
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920
IVORY = (246, 239, 226)
GLOW = (255, 236, 205)
VEIL = 0.55  # peak opacity of the soft shadow behind each text block

# Each line: (text, weight, size_px, tracking_em, gap_after_px)
CARDS = [
    {
        "name": "title",
        "start": 0.0, "end": 2.0,
        "lines": [("INSIDE THE MANDALA", 500, 68, 0.17, 0)],
    },
    {
        "name": "experience",
        "start": 2.0, "end": 4.5,
        "lines": [
            ("AN IMMERSIVE", 500, 40, 0.34, 32),
            ("SOUND HEALING EXPERIENCE", 500, 52, 0.13, 0),
        ],
    },
    {
        "name": "details",
        "start": 4.5, "end": 7.0,
        "lines": [
            ("JANUARY 17, 2027", 500, 62, 0.18, 28),
            ("6:30 PM", 400, 46, 0.28, 58),
            ("ZEIDLER DOME", 500, 54, 0.24, 26),
            ("TELUS WORLD OF SCIENCE \u2013 EDMONTON", 400, 36, 0.12, 0),
        ],
    },
    {
        "name": "tickets",
        "start": 7.0, "end": None,  # holds to the final frame
        "lines": [
            ("TICKETS", 500, 42, 0.40, 44),
            ("insidethemandala.com", 500, 88, 0.02, 44),
            ("LINK IN BIO", 400, 38, 0.32, 0),
        ],
    },
]

FADE_IN = 0.55
FADE_OUT = 0.40
LEAD_IN = 0.12  # small breath after each cut before text appears


def font(font_dir, weight, size):
    return ImageFont.truetype(os.path.join(font_dir, f"jost-{weight}.ttf"), size)


def tracked_width(f, text, tracking):
    # Trailing tracking is excluded so the line centres optically.
    return sum(f.getlength(c) for c in text) + tracking * (len(text) - 1)


def draw_tracked(draw, x, y, f, text, tracking, fill):
    for c in text:
        draw.text((x, y), c, font=f, fill=fill)
        x += f.getlength(c) + tracking


def render_card(card, font_dir, path):
    lines = []
    total_h = 0
    for text, weight, size, track_em, gap in card["lines"]:
        f = font(font_dir, weight, size)
        tracking = size * track_em
        asc, desc = f.getmetrics()
        cap_h = f.getbbox("H")[3] - f.getbbox("H")[1]
        lines.append((text, f, tracking, cap_h, gap))
        total_h += cap_h + gap

    text_layer = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(text_layer)
    y = (H - total_h) / 2
    block_w = max(tracked_width(f, t, tr) for t, f, tr, _, _ in lines)

    # Feathered veil behind the whole block: reads as natural falloff, not a box.
    veil_a = Image.new("L", (W, H), 0)
    ImageDraw.Draw(veil_a).ellipse(
        ((W - block_w) / 2 - 90, y - 150, (W + block_w) / 2 + 90, y + total_h + 150),
        fill=int(255 * VEIL))
    veil_a = veil_a.filter(ImageFilter.GaussianBlur(110))
    for text, f, tracking, cap_h, gap in lines:
        w = tracked_width(f, text, tracking)
        top_offset = f.getbbox("H")[1]
        draw_tracked(d, (W - w) / 2, y - top_offset, f, text, tracking, 255)
        y += cap_h + gap

    # Soft dark veil behind the letters so text holds on bright dome imagery.
    shadow_a = text_layer.filter(ImageFilter.GaussianBlur(22)).point(lambda v: int(v * 0.6))
    # Subtle warm glow.
    glow_a = text_layer.filter(ImageFilter.GaussianBlur(9)).point(lambda v: int(v * 0.32))

    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.alpha_composite(Image.merge("RGBA", (*[Image.new("L", (W, H), c) for c in (8, 6, 10)], veil_a)))
    out.alpha_composite(Image.merge("RGBA", (*[Image.new("L", (W, H), 0)] * 3, shadow_a)))
    out.alpha_composite(Image.merge("RGBA", (*[Image.new("L", (W, H), c) for c in GLOW], glow_a)))
    out.alpha_composite(Image.merge("RGBA", (*[Image.new("L", (W, H), c) for c in IVORY], text_layer)))
    out.save(path)


def duration(src):
    probe = subprocess.run(["ffmpeg", "-i", src], capture_output=True, text=True).stderr
    hms = probe.split("Duration: ")[1].split(",")[0]
    h, m, s = hms.split(":")
    return int(h) * 3600 + int(m) * 60 + float(s)


def main(src, dst, font_dir):
    total = duration(src)
    work = os.path.dirname(os.path.abspath(dst))
    inputs = ["-i", src]
    chains = []
    prev = "0:v"
    for i, card in enumerate(CARDS, start=1):
        png = os.path.join(work, f"card_{card['name']}.png")
        render_card(card, font_dir, png)
        inputs += ["-loop", "1", "-framerate", "60", "-t", f"{total:.3f}", "-i", png]
        fin = card["start"] + (LEAD_IN if card["start"] > 0 else 0.15)
        f = f"[{i}:v]format=rgba,fade=t=in:st={fin:.2f}:d={FADE_IN}:alpha=1"
        if card["end"] is not None:
            f += f",fade=t=out:st={card['end'] - FADE_OUT - 0.05:.2f}:d={FADE_OUT}:alpha=1"
        chains.append(f + f"[c{i}]")
        out = f"v{i}"
        chains.append(f"[{prev}][c{i}]overlay=0:0:shortest=1:format=auto[{out}]")
        prev = out
    chains.append(f"[{prev}]format=yuv420p[vout]")

    cmd = ["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(chains),
           "-map", "[vout]", "-map", "0:a?", "-c:v", "libx264", "-preset", "slow",
           "-crf", "15", "-profile:v", "high", "-r", "60",
           "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
           "-color_range", "tv", "-c:a", "copy", "-movflags", "+faststart", dst]
    subprocess.run(cmd, check=True)


if __name__ == "__main__":
    main(*sys.argv[1:4])
