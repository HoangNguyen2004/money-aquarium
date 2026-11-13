/** High-resolution café art. Simulation units remain 180 × 160.
 * Atlas cells are independent transparent illustrations, never enlarged low-res sprites.
 * Keep this hand-maintained manifest separate from the legacy aquarium generator.
 */
import React from 'react';
import { Image, Platform, View, type ImageStyle, type StyleProp } from 'react-native';
import { ASSETS, type AssetId } from './assets';

const ROOM = require('../../../assets/game/cozy/room.png');
const COUNTER = require('../../../assets/game/cozy/counter.png');
const SHEET = require('../../../assets/game/cozy/characters-props.png');
const DETAILS = require('../../../assets/game/cozy/details.png');
const GUESTS = require('../../../assets/game/cozy/guests.png');

type Cell = { col: number; row: number; w: number; h: number; sheet?: 'details' | 'guests' };
const cells: Partial<Record<AssetId, Cell>> = {
  machine_idle: { col: 0, row: 0, w: 23, h: 23 },
  machine_brew: { col: 0, row: 0, w: 23, h: 23 },
  cafe_cakes: { col: 1, row: 0, w: 34, h: 34 },
  sofa: { col: 2, row: 0, w: 25, h: 25 },
  plant: { col: 3, row: 0, w: 18, h: 18 },
  radio: { col: 3, row: 3, w: 15, h: 15 },
  cat_1: { col: 2, row: 3, w: 15, h: 15 },
  cat_2: { col: 2, row: 3, w: 15, h: 15 },
  picture: { col: 0, row: 0, w: 23, h: 23, sheet: 'details' },
  coffee: { col: 1, row: 0, w: 12, h: 12, sheet: 'details' },
  tea: { col: 2, row: 0, w: 12, h: 12, sheet: 'details' },
  cake: { col: 0, row: 1, w: 12, h: 12, sheet: 'details' },
  cloud_0: { col: 1, row: 1, w: 30, h: 30, sheet: 'details' },
  cloud_1: { col: 1, row: 1, w: 22, h: 22, sheet: 'details' },
  cloud_2: { col: 1, row: 1, w: 40, h: 40, sheet: 'details' },
};
(['idle', 'blink', 'walk1', 'walk2', 'work'] as const).forEach((frame, col) => {
  cells[`barista_${frame}`] = { col: col === 4 ? 0 : col, row: col === 4 ? 2 : 1, w: 24, h: 24 };
  for (let look = 0; look < 4; look++) {
    const walking = frame === 'walk1' || frame === 'walk2';
    if (look >= 2) {
      cells[`guest${look}_${frame}` as AssetId] = { col: frame === 'work' ? 3 : frame === 'walk1' ? 1 : frame === 'walk2' ? 2 : 0, row: look - 2, w: 22, h: 22, sheet: 'guests' };
      continue;
    }
    cells[`guest${look}_${frame}` as AssetId] = look % 2 === 0
      ? { col: walking ? 3 : 2, row: 2, w: 22, h: 22 }
      : { col: walking ? 1 : 0, row: 3, w: 22, h: 22 };
  }
});

const CRISP = Platform.OS === 'web' ? { imageRendering: 'pixelated' } as object : null;

export function CozySprite({ id, s, x, y, scale = 1, flip, style }: {
  id: AssetId | 'barista_happy'; s: number; x: number; y: number; scale?: number; flip?: boolean; style?: StyleProp<ImageStyle>;
}) {
  const a = id === 'barista_happy' ? { col: 1, row: 2, w: 24, h: 24 } : cells[id];
  if (!a) {
    // Retain the small legacy star effect, never legacy furniture or characters.
    if (id !== 'sparkle') return null;
    return <Image source={ASSETS.sparkle.src} fadeDuration={0} style={[{ position: 'absolute', left: x * s, top: y * s, width: 5 * scale * s, height: 5 * scale * s }, CRISP, style]} />;
  }
  const detail = 'sheet' in a && a.sheet === 'details';
  const guests = 'sheet' in a && a.sheet === 'guests';
  const cols = detail ? 3 : 4;
  const rows = detail || guests ? 2 : 4;
  const w = a.w * scale * s, h = a.h * scale * s * (detail || guests ? 1 : 1247 / 1261);
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', left: x * s, top: y * s, width: w, height: h, overflow: 'hidden' }, style]}>
      <View style={{ width: w, height: h, transform: [{ scaleX: flip ? -1 : 1 }] }}>
      <Image source={detail ? DETAILS : guests ? GUESTS : SHEET} fadeDuration={0} style={[{ position: 'absolute', width: w * cols, height: h * rows, left: -a.col * w, top: -a.row * h }, CRISP]} />
      </View>
    </View>
  );
}

export function CozyRoom() {
  return <Image source={ROOM} resizeMode="cover" fadeDuration={0} style={{ position: 'absolute', width: '100%', height: '100%' }} />;
}

export function CozyCounter({ s }: { s: number }) {
  // Open shelving is its own transparent prop; keep the worktop at the machine baseline.
  return <Image source={COUNTER} resizeMode="contain" fadeDuration={0} style={{ position: 'absolute', left: 3 * s, top: 97.5 * s, width: 174 * s, height: 58 * s }} />;
}

export function CozyMenuIcon({ id, size }: { id: 'coffee' | 'tea' | 'cake'; size: number }) {
  return <View style={{ width: size, height: size }}><CozySprite id={id} s={size / 12} x={0} y={0} /></View>;
}

/** Shop and inventory use exactly the same artwork as the scene. */
export function CozyIcon({ id, size }: { id: AssetId; size: number }) {
  const a = cells[id];
  if (!a) return null;
  return <View style={{ width: size, height: size, justifyContent: 'center' }}><CozySprite id={id} s={size / a.w} x={0} y={0} /></View>;
}
export const hasCozyIcon = (id: AssetId) => !!cells[id];
