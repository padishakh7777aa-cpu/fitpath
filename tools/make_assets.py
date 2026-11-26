"""Собирает картинки для публикации из скриншотов приложения.
Результат: publish/bot_avatar_512.png, publish/app_banner_640x360.png, publish/og_1200x630.png, publish/showcase_1280x720.png"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

GOLD = (245, 179, 1); BLACK = (9, 9, 11); WHITE = (244, 241, 232); GREY = (154, 150, 138)
FB = "/usr/share/fonts/truetype/liberation/LiberationSans-BoldItalic.ttf"
FR = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
font = lambda p, s: ImageFont.truetype(p, s)

def grad_bg(w, h):
    img = Image.new("RGB", (w, h), BLACK)
    glow = Image.new("RGB", (w, h), BLACK)
    d = ImageDraw.Draw(glow)
    d.ellipse([int(w * .45), -int(h * .5), int(w * 1.3), int(h * .9)], fill=(70, 50, 4))
    d.ellipse([-int(w * .3), int(h * .5), int(w * .45), int(h * 1.4)], fill=(48, 10, 20))
    glow = glow.filter(ImageFilter.GaussianBlur(max(w, h) // 6))
    return Image.blend(img, glow, .95)

def phone(shot, width):
    """Скриншот в скруглённой рамке телефона."""
    s = Image.open(shot).convert("RGB")
    h = int(s.height * width / s.width)
    s = s.resize((width, h), Image.LANCZOS)
    r = width // 9; pad = max(5, width // 40)
    W, H = width + pad * 2, h + pad * 2
    frame = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(frame)
    d.rounded_rectangle([0, 0, W - 1, H - 1], r + pad, fill=(28, 28, 34, 255), outline=(90, 80, 40, 255), width=2)
    mask = Image.new("L", (width, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, width - 1, h - 1], r, fill=255)
    frame.paste(s, (pad, pad), mask)
    return frame

def shadow_paste(base, im, xy, blur=18):
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    sh.putalpha(im.split()[3].point(lambda v: int(v * .6)))
    sh = sh.filter(ImageFilter.GaussianBlur(blur))
    base.paste(sh, (xy[0] + 6, xy[1] + 14), sh)
    base.paste(im, xy, im)

def dumbbell(d, cx, cy, s, fill):
    bw, bh = s * .9, s * .13
    d.rounded_rectangle([cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2], bh / 2, fill=fill)
    for sign in (-1, 1):
        for k, (dx, hh, ww) in enumerate(((.44, .62, .12), (.30, .48, .12))):
            x = cx + sign * s * dx
            d.rounded_rectangle([x - s * ww / 2, cy - s * hh / 2, x + s * ww / 2, cy + s * hh / 2], s * .03, fill=fill)

def button(d, x, y, text, f, padx=24, pady=12):
    w = d.textlength(text, font=f); bb = f.getbbox(text); th = bb[3] - bb[1]
    d.rounded_rectangle([x, y, x + w + padx * 2, y + th + pady * 2 + 4], 14, fill=GOLD)
    d.text((x + padx, y + pady - bb[1] + 2), text, font=f, fill=BLACK)

def avatar():
    S = 512
    im = grad_bg(S, S); d = ImageDraw.Draw(im)
    d.ellipse([20, 20, S - 20, S - 20], outline=GOLD, width=6)
    dumbbell(d, S / 2, S / 2 - 20, 300, GOLD)
    f = font(FB, 58); t = "LIGHTWEIGHT"
    w = d.textlength(t, font=f); d.text(((S - w) / 2, S - 150), t, font=f, fill=WHITE)
    im.save("publish/bot_avatar_512.png")

def banner(shots):
    W, H = 640, 360
    im = grad_bg(W, H).convert("RGBA"); d = ImageDraw.Draw(im)
    f = font(FB, 44)
    d.text((34, 56), "LIGHT", font=f, fill=WHITE)
    d.text((34 + d.textlength("LIGHT", font=f), 56), "WEIGHT", font=f, fill=GOLD)
    d.text((36, 128), "Тренировка с гидом", font=font(FB, 23), fill=WHITE)
    d.text((36, 160), "3D-техника · питание · прогресс", font=font(FR, 16), fill=GREY)
    button(d, 36, 212, "Начать тренировку", font(FB, 19))
    d.text((36, 300), "YEAH BUDDY!", font=font(FB, 22), fill=GOLD)
    p1 = phone(shots[1], 128); p2 = phone(shots[0], 128)
    shadow_paste(im, p2, (396, 78), 10); shadow_paste(im, p1, (488, 44), 10)
    im.convert("RGB").save("publish/app_banner_640x360.png")

def og(shots):
    W, H = 1200, 630
    im = grad_bg(W, H).convert("RGBA"); d = ImageDraw.Draw(im)
    f = font(FB, 92)
    d.text((70, 120), "LIGHT", font=f, fill=WHITE)
    d.text((70 + d.textlength("LIGHT", font=f), 120), "WEIGHT", font=f, fill=GOLD)
    d.text((74, 262), "Тренировка с гидом в Telegram", font=font(FB, 38), fill=WHITE)
    d.text((74, 328), "Подскажу вес и отдых. 3D-техника упражнений,", font=font(FR, 28), fill=GREY)
    d.text((74, 368), "питание под цель, прогресс и достижения.", font=font(FR, 28), fill=GREY)
    button(d, 74, 460, "Открыть в Telegram", font(FB, 32), 34, 18)
    shadow_paste(im, phone(shots[0], 188), (830, 80), 14)
    shadow_paste(im, phone(shots[1], 198), (985, 40), 14)
    im.convert("RGB").save("publish/og_1200x630.png")

def showcase(shots):
    W, H = 1280, 720
    im = grad_bg(W, H).convert("RGBA")
    xs = [40, 270, 500, 730, 960]
    for i, k in enumerate((0, 1, 3, 4, 5)):
        p = phone(shots[k], 230)
        shadow_paste(im, p, (xs[i] if i < 5 else 0, 70 + (i % 2) * 24), 14)
    im.convert("RGB").save("publish/showcase_1280x720.png")

if __name__ == "__main__":
    names = ["1-today", "2-guide", "3-technique", "4-exercise", "5-nutrition", "6-progress"]
    shots = [f"publish/screens/{n}.png" for n in names]
    avatar(); banner(shots); og(shots); showcase(shots)
    for f in sorted(os.listdir("publish")):
        if f.endswith(".png"): print(f, Image.open("publish/" + f).size)
