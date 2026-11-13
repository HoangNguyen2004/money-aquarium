import { profileOf } from '../species';
// Mô phỏng Aquarium Scene: mỗi con cá tự chọn điểm đến, lái dần về đó (steering), nghỉ, rồi chọn điểm mới.
// Thuần dữ liệu. Tọa độ là pixel của thế giới 180×106, (x, y) là tâm con cá.

export type Mood = 'swim' | 'rest' | 'eat' | 'happy';

export interface Fish {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  face: -1 | 1; // -1: nhìn sang trái
  speed: number;
  mood: Mood;
  t: number; // thời gian còn lại của mood hiện tại
}

export interface Pellet {
  id: number;
  x: number;
  y: number;
}

export interface Tank {
  fish: Fish[];
  food: Pellet[];
  nextId: number;
}

/** Vùng nước cá được bơi: cách mép, dưới mặt nước, trên nền cát. */
export const WATER = { x0: 10, x1: 170, y0: 12, y1: 86 };
// Thức ăn dừng ở đáy vùng nước (không chìm vào cát) để cá luôn với tới được.
const FLOOR = WATER.y1;

const pick = (rnd: () => number, id?: string) => {
  const home = id ? profileOf(id).home : [WATER.y0, WATER.y1];
  return { tx: WATER.x0 + 6 + rnd() * (WATER.x1 - WATER.x0 - 12), ty: home[0] + rnd() * (home[1] - home[0]) };
};

/** Giữ nguyên những con đang bơi, thêm con mới mua, bỏ con đã cất. */
export function syncFish(tank: Tank, ids: string[], rnd: () => number = Math.random) {
  tank.fish = ids.map((id) => {
    const old = tank.fish.find((f) => f.id === id);
    if (old) return old;
    const p = pick(rnd, id);
    return { id, x: p.tx, y: p.ty, vx: 0, vy: 0, ...pick(rnd, id), face: rnd() < 0.5 ? -1 : 1, speed: profileOf(id).speed, mood: 'swim', t: 0 };
  });
}

export const newTank = (): Tank => ({ fish: [], food: [], nextId: 1 });

export function feed(tank: Tank, rnd: () => number = Math.random) {
  for (let i = 0; i < 3 && tank.food.length < 18; i++) tank.food.push({ id: tank.nextId++, x: WATER.x0 + 15 + rnd() * (WATER.x1 - WATER.x0 - 30), y: 4 + i * 2 });
}

/** Chạm vào cá: nó giật mình vọt đi rồi vui vẻ một lúc. */
export function poke(tank: Tank, id: string, rnd: () => number = Math.random) {
  const f = tank.fish.find((x) => x.id === id);
  if (!f) return;
  Object.assign(f, pick(rnd, f.id), { mood: 'happy', t: 1.2 });
  f.vx += (f.tx > f.x ? 1 : -1) * 30;
}

const MAX_FORCE = 26; // px/s²: giới hạn đổi vận tốc để cá không quay ngoắt

export function stepTank(tank: Tank, dt: number, rnd: () => number = Math.random) {
  for (const p of tank.food) p.y = Math.min(FLOOR, p.y + 9 * dt);

  for (const f of tank.fish) {
    f.t = Math.max(0, f.t - dt);
    if (f.mood !== 'swim' && f.t === 0) f.mood = 'swim';

    // có thức ăn: bơi nhanh tới viên gần nhất
    let chasing = false;
    if (f.mood !== 'eat' && tank.food.length) {
      const near = tank.food.reduce((a, b) => (Math.hypot(a.x - f.x, a.y - f.y) < Math.hypot(b.x - f.x, b.y - f.y) ? a : b));
      f.tx = near.x;
      f.ty = near.y;
      chasing = true;
      if (Math.hypot(near.x - f.x, near.y - f.y) < 5) {
        tank.food = tank.food.filter((p) => p !== near);
        Object.assign(f, { mood: 'eat', t: 0.7 }, pick(rnd, f.id));
      }
    }

    const dx = f.tx - f.x;
    const dy = f.ty - f.y;
    const dist = Math.hypot(dx, dy);
    if (!chasing && f.mood === 'swim' && dist < 6) {
      // tới nơi: nghỉ một lúc rồi chọn điểm mới
      Object.assign(f, pick(rnd, f.id), { mood: 'rest', t: 0.6 + rnd() * 2.2 });
    }

    // vận tốc mong muốn: nghỉ/ăn thì trôi chậm, đuổi mồi thì nhanh, gần đích thì giảm dần
    const cruise = f.mood === 'rest' || f.mood === 'eat' ? 0 : f.speed * (chasing ? 1.7 : f.mood === 'happy' ? 1.4 : 1) * Math.min(1, dist / 18);
    // Soft separation prevents residents from sitting on top of one another.
    let separateX = 0;
    let separateY = 0;
    for (const other of tank.fish) {
      if (other === f) continue;
      const sx = f.x - other.x, sy = f.y - other.y;
      const gap = Math.hypot(sx, sy);
      if (gap > 0.01 && gap < 18) {
        const force = (1 - gap / 18) * 7;
        separateX += sx / gap * force;
        separateY += sy / gap * force;
      }
    }
    const pulse = 1 + Math.sin(f.x * 0.11 + f.y * 0.06) * 0.08;
    const wantX = (dist ? (dx / dist) * cruise * pulse : 0) + separateX;
    const wantY = (dist ? (dy / dist) * cruise : 0) + separateY;
    const ax = wantX - f.vx;
    const ay = wantY - f.vy;
    const a = Math.hypot(ax, ay);
    const k = a > MAX_FORCE * dt ? (MAX_FORCE * dt) / a : 1;
    f.vx += ax * k;
    f.vy += ay * k;
    f.x += f.vx * dt;
    f.y += f.vy * dt;

    // không bơi xuyên thành hồ
    if (f.x < WATER.x0) { f.x = WATER.x0; f.vx = Math.abs(f.vx) * 0.5; }
    if (f.x > WATER.x1) { f.x = WATER.x1; f.vx = -Math.abs(f.vx) * 0.5; }
    if (f.y < WATER.y0) { f.y = WATER.y0; f.vy = Math.abs(f.vy) * 0.5; }
    if (f.y > WATER.y1) { f.y = WATER.y1; f.vy = -Math.abs(f.vy) * 0.5; }

    // chỉ quay đầu khi đã thật sự bơi về phía kia, tránh lật qua lật lại
    if (f.vx < -2) f.face = -1;
    else if (f.vx > 2) f.face = 1;
  }
}
