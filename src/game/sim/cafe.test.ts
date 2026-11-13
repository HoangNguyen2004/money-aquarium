// Chạy: npm test
import assert from 'node:assert/strict';
import { POS, baristaFrame, newCafe, order, stepCafe } from './cafe';

const DT = 1 / 30;
const rnd = () => 0.5;
const s = newCafe();
const run = (sec: number) => {
  const ev: string[] = [];
  for (let t = 0; t < sec; t += DT) {
    const before = { b: s.barista.x, g: s.guest?.x };
    ev.push(...stepCafe(s, DT, ['coffee', 'tea'], rnd));
    // không ai được nhảy cóc: mỗi khung hình đi tối đa vài pixel
    assert.ok(Math.abs(s.barista.x - before.b) < 2);
    if (s.guest && before.g !== undefined) assert.ok(Math.abs(s.guest.x - before.g) < 2);
  }
  return ev;
};

// Khách chưa tới thì không bán được.
assert.equal(order(s, 'coffee'), 'busy');
run(1.3);
assert.equal(s.guest?.state, 'ENTERING');
assert.equal(s.guest?.x !== POS.door, true);
run(5);
assert.equal(s.guest?.state, 'WAITING');
assert.equal(s.guest?.order, 'tea'); // rnd = 0.5 chọn món thứ hai

// Khách chờ bao lâu cũng được, không tự bỏ đi.
assert.deepEqual(run(30), []);
assert.equal(s.guest?.state, 'WAITING');

// Sai món: không pha, không sự kiện. Đúng món: nhân viên đi pha, máy chạy, đúng một lần 'served'.
assert.equal(order(s, 'coffee'), 'wrong');
assert.equal(order(s, 'tea'), 'ok');
assert.equal(order(s, 'tea'), 'busy'); // đang pha thì không nhận thêm
assert.equal(s.barista.state, 'WALK');
run(0.6);
assert.equal(s.barista.state, 'BREW');
assert.equal(s.machine.state, 'BREWING');
assert.equal(baristaFrame(s), 'work');
const ev = run(4);
assert.deepEqual(ev, ['served']);
assert.equal(s.barista.state, 'IDLE');
assert.equal(s.machine.state, 'IDLE');

// Khách uống xong, vui, đi ra cửa rồi biến mất; sau đó có khách mới.
run(8);
assert.equal(s.guest === null || s.guest.id === 2, true);
run(6);
assert.equal(s.guest?.id, 2);

// Chưa mở món nào thì không có khách.
const empty = newCafe();
for (let t = 0; t < 10; t += DT) stepCafe(empty, DT, [], rnd);
assert.equal(empty.guest, null);

console.log('cafe sim: ok');
