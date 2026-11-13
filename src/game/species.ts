/** Presentation and movement profiles; financial rewards remain in rules.ts. */
export type GrowthStage = 'FRY' | 'JUVENILE' | 'ADULT';
export const growthStage = (days: number): GrowthStage => days >= 7 ? 'ADULT' : days >= 3 ? 'JUVENILE' : 'FRY';
export interface SpeciesProfile {
  name: string;
  rarity: string;
  description: string;
  speed: number;
  cadence: number;
  phase: number;
  width: number;
  height: number;
  home: [number, number];
}
export const SPECIES: Record<string, SpeciesProfile> = {
  'fish-gold': { name: 'Cá vàng đuôi voan', rarity: 'Phổ thông', description: 'Vảy ánh mật ong, đuôi voan hai thùy và vây ngực trong mờ. Bơi khoan thai ở tầng giữa.', speed: 11, cadence: 3.6, phase: 0.2, width: 38, height: 26, home: [30, 75] },
  'fish-clown': { name: 'Cá hề', rarity: 'Không phổ biến', description: 'Ba khoang trắng viền than, vây cam và đuôi quạt ngắn. Bơi từng nhịp nhanh rồi lượn nghỉ.', speed: 17, cadence: 5.6, phase: 1.7, width: 32, height: 22, home: [22, 68] },
  'fish-puffer': { name: 'Cá nóc đốm', rarity: 'Hiếm', description: 'Thân tròn phủ chấm ô liu, bụng ngà và đôi vây ngực nhỏ. Lơ lửng, vẫy vây liên tục.', speed: 8, cadence: 7, phase: 3.1, width: 31, height: 27, home: [28, 78] },
  'fish-shrimp': { name: 'Tép anh đào', rarity: 'Không phổ biến', description: 'Thân cong chia đốt, râu dài và chân bơi mảnh. Thích khám phá gần đáy hồ.', speed: 9, cadence: 6.2, phase: 4.8, width: 33, height: 23, home: [65, 86] },
  'fish-turtle': { name: 'Rùa tai vàng', rarity: 'Hiếm', description: 'Mai xanh chia phiến, vệt vàng trên đầu và bốn chân đạp nước chậm. Là cư dân bò sát của hồ.', speed: 7, cadence: 2.3, phase: 6.2, width: 38, height: 26, home: [25, 72] },
};
export const profileOf = (id: string) => SPECIES[id] ?? SPECIES['fish-gold'];
