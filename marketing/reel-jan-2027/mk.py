# Builds the title card PNGs, the legibility gradient and the dry crystal bowl sound bed for build.sh.
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np, wave

W, H = 1080, 1920
C = 'f/Corm.ttf'; CI = 'f/CormI.ttf'; J = 'f/Jost.ttf'
GOLD = (236, 212, 154, 255); TXT = (246, 242, 252, 255); MIST = (214, 202, 232, 255)


def fnt(p, s, w):
    f = ImageFont.truetype(p, s)
    try:
        f.set_variation_by_axes([w])
    except Exception as e:
        print('var', e)
    return f


def card(name, lines, rule=None, shadow=0.8):
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for text, fp, size, wt, fill, y, tr in lines:
        f = fnt(fp, size, wt); ws = [d.textlength(c, font=f) for c in text]
        x = W / 2 - (sum(ws) + tr * (len(text) - 1)) / 2
        for c, w in zip(text, ws):
            d.text((x, y), c, font=f, fill=fill); x += w + tr
    if rule:
        d.line([(W / 2 - rule[1], rule[0]), (W / 2 + rule[1], rule[0])], fill=GOLD, width=2)
    a = im.split()[3].filter(ImageFilter.GaussianBlur(12)).point(lambda v: int(min(255, v * shadow * 1.6)))
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 255)); sh.putalpha(a)
    Image.alpha_composite(sh, im).save(name)


card('t1.png', [('Inside the Mandala', C, 120, 400, TXT, 1240, 1),
                ('A 360° SOUND JOURNEY BENEATH THE DOME', J, 31, 400, GOLD, 1405, 6)], rule=(1385, 70))
card('t2.png', [('Recline. Look up. Breathe.', CI, 84, 400, TXT, 1330, 0)])
card('t3.png', [('Live crystal bowls,', CI, 80, 400, TXT, 1290, 0),
                ('sacred geometry overhead', CI, 80, 400, TXT, 1385, 0)])
card('t4.png', [('One evening to slow down', CI, 80, 400, TXT, 1290, 0),
                ('and arrive.', CI, 80, 400, TXT, 1385, 0)])
card('t5.png', [('Nothing to do.', CI, 86, 400, TXT, 1285, 0),
                ('Only to receive.', CI, 86, 400, GOLD, 1385, 0)])
card('end.png', [('THE MINDFUL MANDALA PRESENTS', J, 27, 400, GOLD, 560, 8),
                 ('Inside the Mandala', C, 118, 500, TXT, 620, 1),
                 ('SUNDAY, JANUARY 17, 2027', J, 40, 500, TXT, 880, 5),
                 ('Doors 6:15 PM  ·  Journey 6:30 PM', J, 32, 400, MIST, 948, 1),
                 ('Zeidler Dome', CI, 78, 500, GOLD, 1045, 0),
                 ('TELUS World of Science, Edmonton', J, 33, 400, MIST, 1150, 2),
                 ('Seats are limited', CI, 60, 400, TXT, 1290, 0),
                 ('RESERVE THROUGH THE LINK IN BIO', J, 30, 500, GOLD, 1378, 6)], rule=(835, 80), shadow=1.0)

# Bottom gradient so lower-third text stays legible
g = np.zeros((H, W, 4), np.uint8)
r = np.clip((np.arange(H) - 1050) / 700, 0, 1) ** 1.3 * 150
g[:, :, 3] = r[:, None].astype(np.uint8)
Image.fromarray(g, 'RGBA').save('grad.png')

# Crystal bowl strikes on each cut over a soft low drone
sr = 48000; T = 26.3; t = np.arange(int(sr * T)) / sr; out = np.zeros_like(t)


def bowl(t0, f, amp, tau=7.0):
    a = t - t0; m = a >= 0; x = np.zeros_like(t); a = a[m]
    env = (1 - np.exp(-a / 0.35)) * np.exp(-a / tau)
    s = (np.sin(2 * np.pi * f * a) + 0.9 * np.sin(2 * np.pi * f * 1.0032 * a + 0.7)
         + 0.18 * np.sin(2 * np.pi * f * 2.71 * a) * np.exp(-a / 2.5)
         + 0.08 * np.sin(2 * np.pi * f * 5.1 * a) * np.exp(-a / 1.2))
    x[m] = amp * env * s
    return x


for t0, f, a, tau in [(0.1, 261.63, .30, 7), (4.1, 392.0, .18, 7), (8.2, 329.63, .22, 7), (11.1, 196.0, .25, 7),
                      (15.2, 293.66, .2, 7), (19.3, 261.63, .32, 9), (19.35, 523.25, .10, 9)]:
    out += bowl(t0, f, a, tau)
out += 0.05 * (np.sin(2 * np.pi * 65.41 * t) + 0.6 * np.sin(2 * np.pi * 98.0 * t)) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.1 * t))
y = out * np.clip(t / 1.5, 0, 1) * np.clip((T - t) / 1.5, 0, 1); y = y / np.abs(y).max() * 0.7
st = np.stack([y, np.roll(y, int(.012 * sr))], 1)
w = wave.open('dry.wav', 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
w.writeframes((st * 32767).astype('<i2').tobytes()); w.close()
