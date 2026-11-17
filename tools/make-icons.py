#!/usr/bin/env python3
"""Gera os ícones do app (pixel art original, CC0) em app/src/main/res/mipmap-*.
Uso: python3 tools/make-icons.py   (precisa do Pillow: pip install pillow)"""
import os
from PIL import Image, ImageColor, ImageDraw

PAL = {'K': '#0b0b1a', 'E': '#2a2a48', 'S': '#8d99ae', 'W': '#f4f4f8', 'R': '#ff4d6d', 'O': '#ff9f1c', 'Y': '#ffd166',
       'G': '#06d6a0', 'C': '#4cc9f0', 'B': '#4361ee', 'D': '#242a6b', 'P': '#9d4edd', 'M': '#f72585'}
BG = '#140F2D'
SHIP = ['.......W', '.......W', '......CW', '......CW', '......CY', '.....CBY', '.....CBW', '....CCBW',
        'S...CCBB', 'SC.CCBBC', 'SCCCBBDC', 'SCCBBDDC', 'CCBDDEDS', 'C.BD.EES', '..D...ES', '......R.']
SHIP = [r + r[::-1] for r in SHIP]
DIG = {'0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###']}
N = 36  # grade lógica; 12 px por "pixel" = 432 px (108 dp @ xxxhdpi)

def art(with_bg):
    im = Image.new('RGBA', (N, N), BG if with_bg else (0, 0, 0, 0))
    px = im.load()
    def put(x, y, c):
        if 0 <= x < N and 0 <= y < N: px[x, y] = ImageColor.getrgb(c[:7]) + (255,)
    # estrelinhas
    if with_bg:
        for x, y in [(4, 5), (30, 8), (6, 28), (31, 30), (3, 17), (33, 21), (18, 3)]: put(x, y, PAL['D'] + 'ff')
    # bits "1 0 1" saindo do canhão
    for k, d in enumerate('101'):
        for r, row in enumerate(DIG[d]):
            for c, ch in enumerate(row):
                if ch == '#': put(12 + k * 4 + c, 6 + r, PAL['G'] + 'ff' if d == '1' else PAL['Y'] + 'ff')
    # nave
    for y, row in enumerate(SHIP):
        for x, ch in enumerate(row):
            if ch != '.': put(10 + x, 13 + y, PAL[ch] + 'ff')
    return im

def render(size, with_bg, rounded):
    big = art(with_bg).resize((432, 432), Image.NEAREST)
    if rounded:
        m = Image.new('L', (432, 432), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, 431, 431), radius=84, fill=255)
        out = Image.new('RGBA', (432, 432), (0, 0, 0, 0)); out.paste(big, (0, 0), m); big = out
    return big.resize((size, size), Image.LANCZOS)

if __name__ == '__main__':
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'app', 'src', 'main', 'res')
    dens = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
    for d, s in dens.items():
        p = os.path.join(root, 'mipmap-' + d); os.makedirs(p, exist_ok=True)
        render(s, True, True).save(os.path.join(p, 'ic_launcher.png'))
    # ícone adaptativo (Android 8+): primeiro plano 432x432 + fundo em cor
    p = os.path.join(root, 'mipmap-xxxhdpi'); render(432, False, False).save(os.path.join(p, 'ic_launcher_foreground.png'))
    p = os.path.join(root, 'mipmap-anydpi-v26'); os.makedirs(p, exist_ok=True)
    open(os.path.join(p, 'ic_launcher.xml'), 'w').write('''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
''')
    # prévia (512) para o README
    render(512, True, True).save(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs', 'icon.png'))
    print('ícones gerados')
