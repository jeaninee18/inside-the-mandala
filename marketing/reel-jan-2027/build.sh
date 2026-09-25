#!/usr/bin/env bash
# Rebuilds the Inside the Mandala reel. Run where ffmpeg, sox and python3 (Pillow, numpy) are installed.
set -e
B=https://d8j0ntlcm91z4.cloudfront.net/user_3JHT4aDk3vKqcuSTkdUYk78fxwp
mkdir -p f
[ -s f/Corm.ttf ] || curl -sfL -o f/Corm.ttf "https://github.com/google/fonts/raw/main/ofl/cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf"
[ -s f/CormI.ttf ] || curl -sfL -o f/CormI.ttf "https://github.com/google/fonts/raw/main/ofl/cormorantgaramond/CormorantGaramond-Italic%5Bwght%5D.ttf"
[ -s f/Jost.ttf ] || curl -sfL -o f/Jost.ttf "https://github.com/google/fonts/raw/main/ofl/jost/Jost%5Bwght%5D.ttf"
curl -sf -o c1.mp4 $B/hf_20260925_202832_d5d794a8-763e-4f26-bcd1-2b7b352e88b0.mp4
curl -sf -o c2.mp4 $B/hf_20260925_202822_01eefa00-b985-4911-9f64-ccbeff6efdc7.mp4
curl -sf -o c3.mp4 $B/hf_20260925_202822_dbfe8ad2-392c-4d25-92ee-b41aa94a280b.mp4
curl -sf -o c4.mp4 $B/hf_20260925_202823_f0d5ff66-72f7-4f2b-8a16-6836936eeada.mp4
curl -sf -o src.mp4 https://d2ol7oe51mr4n9.cloudfront.net/user_3JHT4aDk3vKqcuSTkdUYk78fxwp/5074d09d-d1e3-486e-b1d3-7a850bcd8cc9.mp4
python3 mk.py
sox dry.wav bed.wav gain -8 reverb 70 50 100 100 0 0 gain -n -2 trim 0 26.3
V="scale=1080:-2,crop=1080:1920,fps=24,setsar=1"
G="vignette=PI/5,noise=alls=3:allf=t"
E="-c:v libx264 -crf 12 -preset fast -pix_fmt yuv420p -an"
# ai <clip> <title png> <duration> <text in> <text out> <output>
ai(){ ffmpeg -v error -y -t $3 -i $1 -loop 1 -t $3 -i grad.png -loop 1 -t $3 -i $2 -filter_complex "[0:v]$V,$G[b];[b][1:v]overlay[g];[2:v]format=rgba,fade=t=in:st=$4:d=0.9:alpha=1,fade=t=out:st=$5:d=0.6:alpha=1[t];[g][t]overlay,format=yuv420p[v]" -map "[v]" -t $3 $E $6; }
ai c1.mp4 t1.png 4.8 0.6 3.7 s1.mp4
ai c2.mp4 t2.png 4.8 0.9 3.6 s2.mp4
ai c3.mp4 t4.png 4.8 0.9 3.6 s4.mp4
ai c4.mp4 t5.png 4.8 0.9 3.9 s5.mp4
# Real footage as a rotating dome POV
ffmpeg -v error -y -ss 3.0 -t 3.6 -i src.mp4 -loop 1 -t 3.6 -i grad.png -loop 1 -t 3.6 -i t3.png -filter_complex "[0:v]crop=1080:1080:0:420,scale=1920:1920,rotate=a=0.035*t:c=black,scale=w='trunc((1920+60*t)/2)*2':h=-2:eval=frame,crop=1080:1920,fps=24,setsar=1,$G[b];[b][1:v]overlay[g];[2:v]format=rgba,fade=t=in:st=0.8:d=0.8:alpha=1,fade=t=out:st=2.5:d=0.5:alpha=1[t];[g][t]overlay,format=yuv420p[v]" -map "[v]" -t 3.6 $E s3.mp4
# End card over dimmed real footage
ffmpeg -v error -y -ss 4.6 -t 7.0 -i src.mp4 -loop 1 -t 7.0 -i end.png -filter_complex "[0:v]crop=1080:1080:0:420,scale=1500:1500,rotate=a=0.02*t:c=black,crop=1080:1500,pad=1080:1920:0:210:black,fps=24,setsar=1,gblur=sigma=2.5,colorchannelmixer=rr=0.48:gg=0.48:bb=0.48,vignette=PI/4[b];[1:v]format=rgba,fade=t=in:st=0.5:d=1.0:alpha=1[t];[b][t]overlay,format=yuv420p[v]" -map "[v]" -t 7.0 $E s6.mp4
X="xfade=transition=fade:duration=0.7"
ffmpeg -v error -y -i s1.mp4 -i s2.mp4 -i s3.mp4 -i s4.mp4 -i s5.mp4 -i s6.mp4 -i bed.wav -filter_complex "[0][1]$X:offset=4.1[a];[a][2]$X:offset=8.2[b];[b][3]$X:offset=11.1[c];[c][4]$X:offset=15.2[d];[d][5]$X:offset=19.3,fade=t=in:st=0:d=0.4,format=yuv420p[v]" -map "[v]" -map 6:a -c:v libx264 -profile:v high -crf 16 -preset slow -r 24 -c:a aac -b:a 192k -ar 48000 -t 26.3 -movflags +faststart inside_the_mandala_reel.mp4
ffmpeg -v error -y -i inside_the_mandala_reel.mp4 -an -c:v copy -movflags +faststart inside_the_mandala_reel_silent.mp4
ffmpeg -v error -y -ss 2.8 -i inside_the_mandala_reel.mp4 -frames:v 1 -q:v 2 inside_the_mandala_reel_cover.jpg
