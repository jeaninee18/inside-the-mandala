# Inside the Mandala · Instagram Reel (Jan 17, 2027)

Vertical 1080x1920 reel, 24 fps, 21.6 seconds, H.264 + AAC. Version 2.
 Every shot was checked with optical flow (divergence for outward zoom, curl for rotation) before release.

## Finished files (Higgsfield)

| File | Link |
| --- | --- |
| Reel with crystal bowl sound bed | https://d2ol7oe51mr4n9.cloudfront.net/user_3JHT4aDk3vKqcuSTkdUYk78fxwp/dbc27515-9543-4be6-afff-bd73e39e3b3c.mp4 |
| Silent version (add Instagram audio in-app) | https://d2ol7oe51mr4n9.cloudfront.net/user_3JHT4aDk3vKqcuSTkdUYk78fxwp/85c31b45-ffb8-4ec9-bc6b-119d5f57e6db.mp4 |
| Cover frame | https://d2ol7oe51mr4n9.cloudfront.net/user_3JHT4aDk3vKqcuSTkdUYk78fxwp/8036e326-d1ae-447a-b293-8f9bda5f51c0.jpg |

## Storyboard

| Time | Shot | On-screen text | Outward zoom | Rotation |
| --- | --- | --- | --- | --- |
| 0.0 to 4.2 | Real mandala footage, looking straight up, telescopic zoom from the zenith (blue) | Inside the Mandala / A 360° SOUND JOURNEY BENEATH THE DOME | +32.2 | -1.6 |
| 3.5 to 8.3 | Woman reclined, gazing up, gold light, mandala expanding overhead (AI) | Recline. Look up. Breathe. | +13.8 | -0.7 |
| 7.6 to 11.2 | Real mandala footage, telescopic zoom from the zenith (green) | Live crystal bowls, sacred geometry overhead | +32.4 | +1.1 |
| 10.5 to 15.3 | Man reclined, eyes closed, blue light, mandala expanding overhead (AI) | Nothing to do. Only to receive. | +11.9 | +1.3 |
| 14.6 to 21.6 | End card over dimmed real footage, slow outward zoom | Event details and CTA | +8.8 | +1.1 |

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

`build.sh` and `mk.py` rebuild the edit from the two verified Kling clips and the original mandala footage. They were run in the Higgsfield sandbox (ffmpeg, sox, Pillow, numpy).

Keyframes: Nano Banana Pro with the mandala stills as references. Motion: Kling 3.0 Pro, 5 s, silent, locked-off camera.

