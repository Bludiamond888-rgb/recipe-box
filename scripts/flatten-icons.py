# Flatten the opaque app icons to RGB (no alpha channel) for iOS / maskable use.
from PIL import Image
for n in ['icon-192', 'icon-512', 'icon-maskable-512', 'apple-touch-icon']:
    p = f'public/icons/{n}.png'
    im = Image.open(p).convert('RGBA')
    bg = Image.new('RGB', im.size, (0x12, 0x11, 0x10))
    bg.paste(im, mask=im.split()[3])
    bg.save(p, optimize=True)
    print(p, Image.open(p).mode, Image.open(p).size)
