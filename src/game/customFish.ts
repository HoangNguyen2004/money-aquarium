export interface FishStroke { erase?: boolean; color: string; width: number; points: [number, number][] }
export interface CustomFish { id: string; name: string; color: string; strokes: FishStroke[]; inPond: boolean }
export const FISH_FRAME = 'M 55 100 C 80 32 200 32 235 82 L 292 42 Q 273 100 292 158 L 235 118 C 200 168 80 168 55 100 Z';
export const FISH_COLORS = ['#F2B95E', '#F07869', '#55B9A4', '#52A6D8', '#344C66', '#F5EADA', '#FFFFFF', '#222B35'];
export function validCustomFish(value: unknown): value is CustomFish {
  const f = value as CustomFish | null;
  return !!f && typeof f.id === 'string' && f.id.startsWith('custom-') && typeof f.name === 'string' && f.name.length <= 24 && /^#[0-9a-f]{6}$/i.test(f.color) && typeof f.inPond === 'boolean' && Array.isArray(f.strokes) && f.strokes.length <= 160 && f.strokes.every(s => !!s && (s.erase === undefined || typeof s.erase === 'boolean') && /^#[0-9a-f]{6}$/i.test(s.color) && Number.isFinite(s.width) && s.width > 0 && s.width <= 30 && Array.isArray(s.points) && s.points.length > 0 && s.points.length <= 600 && s.points.every(p => Array.isArray(p) && p.length === 2 && p.every(n => Number.isFinite(n) && n >= 0 && n <= 320)));
}
