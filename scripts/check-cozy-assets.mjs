// Validate production inputs without modifying artwork. npm run assets stays legacy-only.
import fs from 'node:fs';
import { PNG } from 'pngjs';
const root = new URL('../assets/game/cozy/', import.meta.url);
for (const name of ['room', 'counter', 'characters-props', 'details', 'guests']) {
  const bytes = fs.readFileSync(new URL(`${name}.png`, root));
  const p = PNG.sync.read(bytes);
  let clear = 0;
  for (let i = 3; i < p.data.length; i += 4) if (p.data[i] < 128) clear++;
  const alpha = clear / (p.width * p.height);
  if (Math.min(p.width, p.height) < 700) throw Error(`${name}: resolution too low`);
  if (name !== 'room' && alpha < 0.15) throw Error(`${name}: missing transparent background`);
  if (name === 'room' && alpha > 0.01) throw Error('room: unexpected holes');
  console.log(`${name}: ${p.width}×${p.height}, ${(alpha * 100).toFixed(1)}% transparent, ${(bytes.length / 1048576).toFixed(2)} MiB`);
}
