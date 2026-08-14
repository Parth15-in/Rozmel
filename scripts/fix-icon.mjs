import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const srcIcon = path.join(publicDir, 'icon.png');

console.log('Reading icon...');
const { data, info } = await sharp(srcIcon)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
console.log(`Icon size: ${width}x${height}, channels: ${channels}`);

// Step 1: Remove black background pixels (make transparent)
const pixels = Buffer.from(data);
for (let i = 0; i < pixels.length; i += 4) {
  const r = pixels[i];
  const g = pixels[i + 1];
  const b = pixels[i + 2];
  // If pixel is very dark (black background), make transparent
  if (r < 25 && g < 25 && b < 25) {
    pixels[i + 3] = 0; // alpha = 0
  }
}

// Save transparent icon.png
await sharp(pixels, { raw: { width, height, channels: 4 } })
  .png()
  .toFile(path.join(publicDir, 'icon.png'));
console.log('✅ icon.png saved (transparent background)');

// Step 2: Create maskable icon — deep green bg + centered icon with 20% safe zone
const iconSize = 1024;
const safeZone = Math.round(iconSize * 0.2); // 20% padding on each side
const innerSize = iconSize - safeZone * 2;

// Resize the transparent icon to fit within safe zone
const resizedInner = await sharp(pixels, { raw: { width, height, channels: 4 } })
  .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

// Composite onto a deep green background
await sharp({
  create: {
    width: iconSize,
    height: iconSize,
    channels: 4,
    background: { r: 13, g: 78, b: 55, alpha: 1 }, // deep emerald green #0d4e37
  }
})
  .composite([{ input: resizedInner, top: safeZone, left: safeZone }])
  .png()
  .toFile(path.join(publicDir, 'icon-maskable.png'));
console.log('✅ icon-maskable.png saved (deep green bg + safe zone)');

console.log('\nDone! Both icons updated.');
