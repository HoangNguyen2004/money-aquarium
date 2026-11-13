// Chạy: npm test
import assert from 'node:assert/strict';
import { WATER, feed, newTank, poke, stepTank, syncFish } from './fish';

// bộ sinh số giả ngẫu nhiên cố định để test lặp lại được
let seed = 7;
const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
const DT = 1 / 30;

const tank = newTank();
syncFish(tank, ['a', 'b', 'c', 'd'], rnd);
assert.equal(tank.fish.length, 4);

let flips = 0;
let maxStep = 0;
for (let t = 0; t < 120; t += DT) {
  const before = tank.fish.map((f) => ({ x: f.x, y: f.y, face: f.face }));
  stepTank(tank, DT, rnd);
  tank.fish.forEach((f, i) => {
    // luôn ở trong vùng nước
    assert.ok(f.x >= WATER.x0 && f.x <= WATER.x1 && f.y >= WATER.y0 && f.y <= WATER.y1);
    maxStep = Math.max(maxStep, Math.hypot(f.x - before[i].x, f.y - before[i].y));
    if (f.face !== before[i].face) flips++;
  });
}
assert.ok(maxStep < 2, `cá nhảy cóc ${maxStep}px một khung hình`);
// 4 con trong 2 phút: có quay đầu, nhưng không lật liên tục
assert.ok(flips > 4 && flips < 160, `số lần quay đầu: ${flips}`);
// cá thật sự đi lại chứ không đứng yên một chỗ
const far = tank.fish.filter((f) => Math.hypot(f.vx, f.vy) > 0.5 || f.mood === 'rest').length;
assert.equal(far, 4);

// Cho ăn: thức ăn rơi xuống, cá tìm tới ăn hết.
feed(tank, rnd);
assert.equal(tank.food.length, 3);
let ate = false;
for (let t = 0; t < 40; t += DT) {
  stepTank(tank, DT, rnd);
  if (tank.fish.some((f) => f.mood === 'eat')) ate = true;
}
assert.equal(tank.food.length, 0);
assert.equal(ate, true);

// Thức ăn đã chìm xuống đáy vẫn phải ăn được (từng có lỗi cả đàn dồn quanh viên mồi không với tới).
tank.food.push({ id: 99, x: 20, y: 200 });
for (let t = 0; t < 40; t += DT) stepTank(tank, DT, rnd);
assert.equal(tank.food.length, 0);

// Chạm vào cá: nó vui lên và vọt đi.
poke(tank, 'a', rnd);
assert.equal(tank.fish[0].mood, 'happy');
assert.ok(Math.abs(tank.fish[0].vx) > 10);

// Cất bớt cá rồi thêm lại: con cũ giữ nguyên vị trí.
const keep = { ...tank.fish[1] };
syncFish(tank, ['b', 'z'], rnd);
assert.deepEqual([tank.fish.length, tank.fish[0].x, tank.fish[0].y], [2, keep.x, keep.y]);

for (let i = 0; i < 100; i++) feed(tank, rnd);
assert.equal(tank.food.length, 18);
console.log('fish sim: ok');
