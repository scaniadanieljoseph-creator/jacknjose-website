"""Cut the client's crown + JG logo pictures out of their white background and make the website versions.
Run: python3 jg_cutout.py <black logo image> <gold logo image>   (writes into ../img and ./final)"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__)); IMG = os.path.join(HERE, '..', 'img'); FINAL = os.path.join(HERE, 'final')
black_src, gold_src = sys.argv[1], sys.argv[2]

def cutout(path):
    """RGBA with alpha from distance to white, colours un-premultiplied against white."""
    src = Image.open(path).convert('RGBA'); flat = Image.new('RGBA', src.size, (255, 255, 255, 255)); flat.alpha_composite(src)
    a = np.asarray(flat.convert('RGB')).astype(np.float32) / 255
    alpha = np.clip((1 - a.min(axis=2)) * 1.15, 0, 1)            # how far the darkest channel is from white
    alpha[alpha < .06] = 0
    safe = np.where(alpha > 0, alpha, 1)[..., None]
    rgb = np.clip((a - (1 - alpha[..., None])) / safe, 0, 1)      # recover the ink colour as if laid over white
    return rgb, alpha

def save(rgb, alpha, name, pad=24):
    img = Image.fromarray(np.dstack([rgb, alpha[..., None]]).__mul__(255).round().astype(np.uint8), 'RGBA')
    box = img.getchannel('A').point(lambda v: 255 if v > 20 else 0).getbbox()
    img = img.crop((box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad))
    for d in (IMG, FINAL): img.save(os.path.join(d, name), optimize=True)
    return img

# 1. black logo, transparent
rgb, al = cutout(black_src); save(rgb, al, 'logo-black.png')
# 2. gold crown + black JG, transparent (for white paper, emails, light backgrounds)
rgb, al = cutout(gold_src); gold = save(rgb, al, 'logo-gold.png')
# 3. gold crown + white JG, for the dark website: neutral (grey/black) ink becomes white, gold stays gold
sat = rgb.max(axis=2) - rgb.min(axis=2)
neutral = (sat < .18)[..., None]
light = np.where(neutral, 1 - rgb * .12, rgb)                    # black letters -> white, keeping a hint of the bevel shading
gl = save(light, al, 'logo-gold-light.png')
print('logo sizes', gold.size, gl.size)

# small web copies and icons
def fit(img, w):
    h = round(img.height * w / img.width); return img.resize((w, h), Image.LANCZOS)
fit(gl, 360).save(os.path.join(IMG, 'logo-gold-light-360.png'), optimize=True)
fit(gold, 360).save(os.path.join(IMG, 'logo-gold-360.png'), optimize=True)
for size in (512, 192, 180, 48):
    bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    from PIL import ImageDraw
    ImageDraw.Draw(bg).rounded_rectangle((0, 0, size - 1, size - 1), radius=size * .22, fill=(10, 18, 52, 255))
    m = fit(gl, int(size * .66)); m = m if m.height <= size * .8 else m.resize((int(m.width * size * .8 / m.height), int(size * .8)), Image.LANCZOS)
    bg.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2))
    bg.save(os.path.join(IMG, 'favicon-48.png' if size == 48 else f'icon-{size}.png'), optimize=True)
print('ok')
