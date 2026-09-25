# Inside the Mandala · Instagram Reel (Jan 17, 2027)

Vertical 1080x1920 reel, 24 fps, 21.6 seconds, H.264 + AAC. Version 3.

Look: the real mandala footage is AI-upscaled to 2K (ByteDance) before framing, scaled with lanczos and sharpened (contrast adaptive sharpening). A slow breathing glow swells and settles on a 4 second cycle, like a breath.
 Every shot was checked with optical flow (divergence for outward zoom, curl for rotation) before release.

## Finished files (Higgsfield)

| File | Link |
| --- | --- |
| Reel with crystal bowl sound bed | https://d2ol7oe51mr4n9.cloudfront.net/user_3JHT4aDk3vKqcuSTkdUYk78fxwp/c195da67-603d-48c6-bfdc-0688bdfc094b.mp4 |
| Silent version (add Instagram audio in-app) | https://d2ol7oe51mr4n9.cloudfront.net/user_3JHT4aDk3vKqcuSTkdUYk78fxwp/252f20a3-2b47-4c14-bbb9-c253f741a39a.mp4 |
| Cover frame | https://d2ol7oe51mr4n9.cloudfront.net/user_3JHT4aDk3vKqcuSTkdUYk78fxwp/400a21c9-448e-47da-8ad6-0b496676ab7d.jpg |

## Storyboard

| Time | Shot | On-screen text | Outward zoom | Rotation | Sharpness v2 to v3 |
| --- | --- | --- | --- | --- | --- |
| 0.0 to 4.2 | Real mandala footage, looking straight up, telescopic zoom from the zenith, breathing glow (blue) | Inside the Mandala / A 360° SOUND JOURNEY BENEATH THE DOME | +20.3 | -1.5 | 39 to 565 |
| 3.5 to 8.3 | Woman reclined, gazing up, gold light, mandala expanding overhead (AI) | Recline. Look up. Breathe. | +14.3 | -0.6 | 31 to 45 |
| 7.6 to 11.2 | Real mandala footage, telescopic zoom from the zenith, breathing glow (green) | Live crystal bowls, sacred geometry overhead | +18.7 | +1.3 | 25 to 307 |
| 10.5 to 15.3 | Man reclined, eyes closed, blue light, mandala expanding overhead (AI) | Nothing to do. Only to receive. | +12.7 | +1.4 | 22 to 25 |
| 14.6 to 21.6 | End card over dimmed real footage, crisp, slow outward zoom, breathing glow | Event details and CTA | +10.0 | +1.3 | 680 to 638 |

Sharpness is the variance of the Laplacian in the upper frame. The AI close-ups keep a shallow depth of field by design, so their backgrounds stay soft.

For reference, the version 1 AI dome shots measured rotation of +33 to +45, and were removed. The regenerated wide shot and couple shot still rotated (+27 and +20), so they are not used.

End card:

```
THE MINDFUL MANDALA PRESENTS
Inside the Mandala
SUNDAY, JANUARY 17, 2027
Doors 6:15 PM · Journey 6:30 PM
Zeidler Dome
TELUS World of Science, Edmonton
Seats are limited
RESERVE THROUGH THE LINK IN BIO
```

Fonts match the website: Cormorant Garamond and Jost. Colours: text `#f6f2fc`, gold `#ecd49a`.

Sound bed: synthesized crystal bowl strikes on each cut (C4, G4, E4, G3, C4 + C5) over a soft low drone, with reverb.

## Instagram caption

```
Lie back beneath the dome and let sound and light do the rest.

Inside the Mandala is a 360° sound journey at the Zeidler Dome, TELUS World of Science. Live crystal bowls, sacred geometry moving overhead, and a reclined seat that lets your whole body soften.

No experience needed. Nothing to do. Only to receive.

Sunday, January 17, 2027
Doors 6:15 PM · Journey 6:30 PM
Zeidler Dome, TELUS World of Science, Edmonton

Seats are limited. Reserve through the link in bio.

#InsideTheMandala #YEGevents #Edmonton #SoundBath #SoundHealing #CrystalBowls #YEGwellness #ZeidlerDome #TELUSWorldofScience #MindfulMandala
```

## Posting steps

1. Download the reel with sound (or the silent version if you want a trending audio track).
2. In Instagram, create a Reel, upload the file, and keep it at 9:16 with no crop.
3. Set the cover from the uploaded cover frame, or pick the title frame at about 2.6 seconds.
4. Paste the caption. Tag the TELUS World of Science account and add Edmonton as the location.
5. Share to Stories with a link sticker to the Eventbrite page.

## Rebuilding

`build.sh` and `mk.py` rebuild the edit from the two verified Kling clips and the 2K upscale of the original mandala footage (set `SRC2K` to https://d8j0ntlcm91z4.cloudfront.net/user_3JHT4aDk3vKqcuSTkdUYk78fxwp/hf_20260925_205904_d80bcb5b-fe4a-4f19-96d8-1bdbca288203.mp4). They were run in the Higgsfield sandbox (ffmpeg, sox, Pillow, numpy).

Keyframes: Nano Banana Pro with the mandala stills as references. Motion: Kling 3.0 Pro, 5 s, silent, locked-off camera.

