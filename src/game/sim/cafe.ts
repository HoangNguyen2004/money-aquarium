// Mô phỏng Café Scene: nhân viên, máy pha và khách là ba máy trạng thái chạy theo thời gian (dt giây).
// Thuần dữ liệu, không vẽ gì: view chỉ đọc state để chọn khung hình và vị trí. Tọa độ là pixel của thế giới 180×160.

export type BaristaState = 'IDLE' | 'WALK' | 'BREW' | 'SERVE' | 'HAPPY';
export type MachineState = 'IDLE' | 'BREWING' | 'FINISHED';
export type GuestState = 'ENTERING' | 'WAITING' | 'ORDERED' | 'DRINKING' | 'HAPPY' | 'LEAVING';

export interface Guest {
  id: number;
  look: number;
  order: string;
  x: number;
  state: GuestState;
  t: number;
  tip: number;
}

export interface CafeSim {
  barista: { x: number; state: BaristaState; t: number; goal: 'machine' | 'home' | null; blink: number };
  machine: { state: MachineState; t: number };
  guest: Guest | null;
  spawnIn: number;
  nextId: number;
}

export const POS = { home: 100, machine: 106, door: 186, spot: 62 };
const SPEED = { barista: 14, guest: 34 };
const TIME = { brew: 1.6, serve: 0.5, drink: 0.9, happy: 1.0, cheer: 1.5 };

export const newCafe = (): CafeSim => ({
  barista: { x: POS.home, state: 'IDLE', t: 0, goal: null, blink: 2 },
  machine: { state: 'IDLE', t: 0 },
  guest: null,
  spawnIn: 1.2,
  nextId: 1,
});

/** Đi về phía đích với tốc độ cho trước; trả về true khi tới nơi. Không bao giờ nhảy cóc. */
function approach(o: { x: number }, to: number, speed: number, dt: number): boolean {
  const step = speed * dt;
  if (Math.abs(to - o.x) <= step) {
    o.x = to;
    return true;
  }
  o.x += Math.sign(to - o.x) * step;
  return false;
}

export type CafeEvent = 'served';

/**
 * Tiến mô phỏng thêm dt giây. menu: các món khách có thể gọi. Trả về sự kiện phát sinh
 * ('served' = nhân viên vừa trao món, lúc này mới tính xu).
 */
export function stepCafe(s: CafeSim, dt: number, menu: readonly string[], rnd: () => number = Math.random): CafeEvent[] {
  const events: CafeEvent[] = [];
  const b = s.barista;

  // chớp mắt
  b.blink -= dt;
  if (b.blink < -0.14) b.blink = 2 + rnd() * 3;

  // khách
  if (!s.guest) {
    s.spawnIn -= dt;
    if (s.spawnIn <= 0 && menu.length) {
      s.guest = { id: s.nextId++, look: Math.floor(rnd() * 4), order: menu[Math.floor(rnd() * menu.length)], x: POS.door, state: 'ENTERING', t: 0, tip: 0 };
    }
  } else {
    const g = s.guest;
    g.t += dt;
    if (g.state === 'ENTERING' && approach(g, POS.spot, SPEED.guest, dt)) Object.assign(g, { state: 'WAITING', t: 0 });
    else if (g.state === 'DRINKING' && g.t >= TIME.drink) Object.assign(g, { state: 'HAPPY', t: 0 });
    else if (g.state === 'HAPPY' && g.t >= TIME.happy) Object.assign(g, { state: 'LEAVING', t: 0 });
    else if (g.state === 'LEAVING' && approach(g, POS.door, SPEED.guest, dt)) {
      s.guest = null;
      s.spawnIn = 2.5 + rnd() * 2.5;
    }
  }

  // nhân viên và máy pha
  b.t += dt;
  if (b.state === 'WALK' && b.goal) {
    if (approach(b, POS[b.goal], SPEED.barista, dt)) {
      if (b.goal === 'machine') {
        Object.assign(b, { state: 'BREW', t: 0, goal: null });
        s.machine = { state: 'BREWING', t: 0 };
      } else {
        Object.assign(b, { state: 'SERVE', t: 0, goal: null });
      }
    }
  } else if (b.state === 'BREW') {
    s.machine.t += dt;
    if (s.machine.t >= TIME.brew) {
      s.machine = { state: 'FINISHED', t: 0 };
      Object.assign(b, { state: 'WALK', t: 0, goal: 'home' });
    }
  } else if (b.state === 'SERVE' && b.t >= TIME.serve) {
    Object.assign(b, { state: 'IDLE', t: 0 });
    s.machine = { state: 'IDLE', t: 0 };
    if (s.guest?.state === 'ORDERED') {
      Object.assign(s.guest, { state: 'DRINKING', t: 0 });
      events.push('served');
    }
  } else if (b.state === 'HAPPY' && b.t >= TIME.cheer) {
    Object.assign(b, { state: 'IDLE', t: 0 });
  }
  return events;
}

/** Người chơi chọn món. Đúng món khách đang chờ thì nhân viên bắt đầu pha; sai thì không có gì xảy ra. */
export function order(s: CafeSim, item: string): 'ok' | 'wrong' | 'busy' {
  if (!s.guest || s.guest.state !== 'WAITING' || s.barista.state === 'WALK' || s.barista.state === 'BREW' || s.barista.state === 'SERVE') return 'busy';
  if (item !== s.guest.order) return 'wrong';
  Object.assign(s.guest, { state: 'ORDERED', t: 0 });
  Object.assign(s.barista, { state: 'WALK', t: 0, goal: 'machine' });
  return 'ok';
}

/** Nhân viên vui mừng khi người chơi nhận thưởng (chỉ khi đang rảnh, để không cắt ngang việc pha chế). */
export function cheer(s: CafeSim) {
  if (s.barista.state === 'IDLE') Object.assign(s.barista, { state: 'HAPPY', t: 0 });
}

/** Khung hình của nhân viên theo trạng thái. */
export function baristaFrame(s: CafeSim): 'idle' | 'blink' | 'walk1' | 'walk2' | 'work' {
  const b = s.barista;
  if (b.state === 'WALK') return Math.floor(b.t * 8) % 2 ? 'walk1' : 'walk2';
  if (b.state === 'BREW' || b.state === 'SERVE') return 'work';
  if (b.state === 'HAPPY') return Math.floor(b.t * 6) % 2 ? 'work' : 'idle';
  return b.blink < 0 ? 'blink' : 'idle';
}

export function guestFrame(g: Guest): 'idle' | 'walk1' | 'walk2' | 'work' {
  if (g.state === 'ENTERING' || g.state === 'LEAVING') return Math.floor(g.t * 8) % 2 ? 'walk1' : 'walk2';
  return g.state === 'HAPPY' ? 'work' : 'idle';
}
