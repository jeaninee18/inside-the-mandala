# Inside the Mandala · Instagram Reel (Jan 17, 2027)

Vertical 1080x1920 reel, 24 fps, 26.3 seconds, H.264 + AAC.

## Finished files (Higgsfield)

| File | Link |
| --- | --- |
| Reel with crystal bowl sound bed | https://d2ol7oe51mr4n9.cloudfront.net/user_3JHT4aDk3vKqcuSTkdUYk78fxwp/4cadd154-91d8-4392-84df-5dd50e698971.mp4 |
| Silent version (add Instagram audio in-app) | https://d2ol7oe51mr4n9.cloudfront.net/user_3JHT4aDk3vKqcuSTkdUYk78fxwp/e8e788cd-0953-4768-9340-c21dfb1594ff.mp4 |
| Cover frame | https://d2ol7oe51mr4n9.cloudfront.net/user_3JHT4aDk3vKqcuSTkdUYk78fxwp/8b090da4-a16f-470b-bd88-59a5732d7056.jpg |

## Storyboard

| Time | Shot | On-screen text |
| --- | --- | --- |
| 0.0 to 4.8 | Wide dome interior, reclined audience, blue leaf mandala overhead (AI, Kling 3.0) | Inside the Mandala / A 360° SOUND JOURNEY BENEATH THE DOME |
| 4.1 to 8.9 | Close-up, woman reclined, gold light on her face (AI) | Recline. Look up. Breathe. |
| 8.2 to 11.8 | Real mandala footage, rotating dome POV, blue to gold | Live crystal bowls, sacred geometry overhead |
| 11.1 to 15.9 | Couple reclined holding hands, green mandala (AI) | One evening to slow down and arrive. |
| 15.2 to 20.0 | Man reclined, eyes closed, blue light (AI) | Nothing to do. Only to receive. |
| 19.3 to 26.3 | End card over real mandala footage, dimmed | Event details and CTA |

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

Sound bed: synthesized crystal bowl strikes on each cut (C4, G4, E4, G3, D4, C4 + C5) over a soft low drone, with reverb.

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
3. Set the cover from the uploaded cover frame, or pick the title frame at about 3 seconds.
4. Paste the caption. Tag the TELUS World of Science account and add Edmonton as the location.
5. Share to Stories with a link sticker to the Eventbrite page.

## Rebuilding

`build.sh` and `mk.py` rebuild the edit from the four Kling clips and the original mandala footage. They were run in the Higgsfield sandbox (ffmpeg, sox, Pillow, numpy).

Keyframes: Nano Banana Pro with the mandala stills as references. Motion: Kling 3.0 Pro, 5 s, silent.
