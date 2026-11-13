// Sinh toàn bộ asset pixel art của game Quán của tôi: node scripts/make-game-assets.mjs
// Mỗi sprite là một lưới ký tự (1 ký tự = 1 pixel), mỗi lớp nền được vẽ bằng hình chữ nhật trên lưới pixel thấp,
// rồi phóng nguyên ×SCALE (không làm mịn) và ghi ra PNG trong assets/game/. Muốn thay bằng tranh của họa sĩ:
// ghi đè file PNG cùng tên, cùng kích thước.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'game');
const SCALE = 6;

const PAL = {
  k: '#2a2320', K: '#3a3a3a', w: '#fbfaf7', W: '#e6e9ec',
  g: '#4e9a6b', G: '#3f8f5b', l: '#8cc66b',
  b: '#8a5a3c', B: '#6e4428', n: '#c08a55',
  t: '#2f8f86', T: '#277c74', u: '#8fcfc4',
  r: '#d2504b', R: '#e88f8f', x: '#f7b6cb',
  o: '#f5a623', O: '#e0820f', y: '#ffd86b',
  m: '#f3e7c9', M: '#d9b57a', z: '#a9683f',
  q: '#aeb3b8', Q: '#6b7076', i: '#ddf3ee',
  v: '#6fa0e0', V: '#4a7dc0', d: '#b5764a',
};

const rgba = (hex) => {
  if (Array.isArray(hex)) return hex;
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
};
const canvas = (w, h) => ({ w, h, d: new Uint8Array(w * h * 4) });
function px(c, x, y, col) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const [r, g, b, a] = rgba(col);
  const i = (y * c.w + x) * 4;
  const A = a / 255;
  const dA = c.d[i + 3] / 255;
  const out = A + dA * (1 - A);
  for (let k = 0; k < 3; k++) c.d[i + k] = out ? Math.round(([r, g, b][k] * A + c.d[i + k] * dA * (1 - A)) / out) : 0;
  c.d[i + 3] = Math.round(out * 255);
}
function rect(c, x, y, w, h, col) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(c, x + i, y + j, col);
}
function blit(c, map, x, y, pal = {}) {
  map.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === '.') return;
    const col = pal[ch] ?? PAL[ch];
    if (!col) throw new Error(`Không có màu cho ký tự "${ch}"`);
    px(c, x + i, y + j, col);
  }));
}
const sprite = (map, pal) => {
  const c = canvas(Math.max(...map.map((r) => r.length)), map.length);
  blit(c, map, 0, 0, pal);
  return c;
};

function png(c) {
  const W = c.w * SCALE, H = c.h * SCALE;
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) {
    const row = y * (W * 4 + 1);
    for (let x = 0; x < W; x++) {
      const s = (Math.floor(y / SCALE) * c.w + Math.floor(x / SCALE)) * 4;
      raw.set(c.d.subarray(s, s + 4), row + 1 + x * 4);
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const head = Buffer.alloc(13);
  head.writeUInt32BE(W, 0); head.writeUInt32BE(H, 4); head.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', head), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const made = {};
function save(name, c) {
  fs.writeFileSync(path.join(OUT, `${name}.png`), png(c));
  made[name] = [c.w, c.h];
}

// ---------- nhân vật chibi 12×20 ----------
const HEAD = [
  '...hhhhhh...',
  '..hhhhhhhh..',
  '.hhhhhhhhhh.',
  '.hhsssssshh.',
  '.hssssssssh.',
  '.hskssssksh.',
  '.hssssssssh.',
  '..ssssssss..',
];
const BODY = ['...cccccc...', '..cccccccc..', '.sccaaaaccs.', '.sccaaaaccs.', '..ccaaaacc..', '..ccaaaacc..'];
const ARMS_UP = ['.s.cccccc.s.', '.sccccccccs.', '..ccaaaacc..', '..ccaaaacc..', '..ccaaaacc..', '..ccaaaacc..'];
const LEGS = ['..pppppppp..', '..ppp..ppp..', '..ppp..ppp..', '..ppp..ppp..', '..kkk..kkk..', '.kkkk..kkkk.'];
const LEGS_A = ['..pppppppp..', '..ppp..ppp..', '.ppp....ppp.', '.ppp....ppp.', '.kkk....kkk.', 'kkkk....kkkk'];
const LEGS_B = ['..pppppppp..', '...pppppp...', '...pppppp...', '....pppp....', '....kkkk....', '...kkkkkk...'];
const blink = HEAD.map((r, i) => (i === 5 ? '.hsessssesh.' : r));
const FRAMES = {
  idle: [...HEAD, ...BODY, ...LEGS],
  blink: [...blink, ...BODY, ...LEGS],
  walk1: [...HEAD, ...BODY, ...LEGS_A],
  walk2: [...HEAD, ...BODY, ...LEGS_B],
  work: [...HEAD, ...ARMS_UP, ...LEGS],
};
const LOOKS = {
  barista: { s: '#f2c9a0', e: '#d9a877', h: '#e9b13c', c: '#fbfaf7', a: '#8fcfc4', p: '#4a5a78' },
  guest0: { s: '#f2c9a0', e: '#d9a877', h: '#4a3326', c: '#e88f8f', a: '#e88f8f', p: '#4a5a78' },
  guest1: { s: '#e0ac7e', e: '#c08a5c', h: '#1b1f1d', c: '#6fa0e0', a: '#6fa0e0', p: '#3a3a3a' },
  guest2: { s: '#f6d6b8', e: '#dbb692', h: '#c9843a', c: '#f5c542', a: '#f5c542', p: '#6e4428' },
  guest3: { s: '#c98d5e', e: '#a8703f', h: '#2b2118', c: '#8fcfc4', a: '#8fcfc4', p: '#4a5a78' },
};

// ---------- đồ vật ----------
const ITEMS = {
  coffee: [['..dddddd..', '.wwwwwwww.', '.wwwwwwwwW', '.wwwwwwwwW', '..wwwwww..', '...wwww...', '.mmmmmmmm.', '..mmmmmm..']],
  tea: [['.....R..', '....R...', '.iiRiii.', '.iiiiii.', '.illlli.', '.illwli.', '.illlli.', '.ilwlli.', '.illlli.', '..llll..', '..iiii..']],
  cake: [['.....r.....', '....rr.....', '...wwww....', '..wwwwwww..', '.wwwwwwwww.', '.MMMMMMMMM.', '.wwwwwwwww.', '.MMMMMMMMM.', 'mmmmmmmmmmm']],
  plant: [[
    '......g......', '.....ggl.....', '..g..ggl..g..', '.ggl.ggl.ggl.', '.ggl.ggl.ggl.', '..ggggGgggl..', '...gggGggl...', '....ggGgl....',
    '....ggGgl....', '...zzzzzzz...', '..zzzzzzzzz..', '...zzzzzzz...', '...zzzzzzz...', '...zzzzzzz...', '....zzzzz....', '....zzzzz....',
  ]],
  sofa: [[
    '...vvvvvvvvvvvvvvvvvv...', '..vvvvvvvvvvvvvvvvvvvv..', '..vvvvvvvvvvvvvvvvvvvv..', '..vvvvvvvvvVvvvvvvvvvv..', 'VVvvvvvvvvvVvvvvvvvvvvVV', 'VVVvvvvvvvvVvvvvvvvvvVVV',
    'VVVUUUUUUUUUUUUUUUUUUVVV', 'VVVUUUUUUUUUUUUUUUUUUVVV', 'VVVUUUUUUUUUUUUUUUUUUVVV', 'VVVVVVVVVVVVVVVVVVVVVVVV', 'VVVVVVVVVVVVVVVVVVVVVVVV', '.VVVVVVVVVVVVVVVVVVVVVV.', '..BB................BB..', '..BB................BB..',
  ], { U: '#8fb8ee' }],
  radio: [['.........k....', '..........k...', '.nnnnnnnnnnnn.', 'nnBBBnnmmmmmnn', 'nBBnBBnmmrmmnn', 'nBnnnBnnnnnnnn', 'nBBnBBnnBBnBBn', 'nnBBBnnnBBnBBn', 'nnnnnnnnnnnnnn', '.nnnnnnnnnnnn.']],
  picture: [[
    'YYYYYYYYYYYYYY', 'YiiiiiiiiiiiiY', 'YiiiiiiiiyyiiY', 'YiiiiiiiiyyiiY', 'YiiiiigiiiiiiY', 'YiiiigggiiiiiY', 'YiigggggggiiiY', 'YigggggggggiiY', 'YggggggggggggY', 'YggggggggggggY', 'YYYYYYYYYYYYYY', 'YYYYYYYYYYYYYY',
  ], { Y: '#c79a3b' }],
  cat_1: [[
    '.o.o..........oo', '.ooo..........o.', 'ooooo.........o.', 'okoko..oooooooo.', 'ooroooooooooooo.', '.oooOoOoOooooo..', '..oooooooooooo..', '..oooooooooooo..', '..oo.oo..oo.oo..', '..oo.oo..oo.oo..', '..kk.kk..kk.kk..',
  ]],
  cat_2: [[
    '.o.o...........o', '.ooo..........oo', 'ooooo.........o.', 'okoko..oooooooo.', 'ooroooooooooooo.', '.oooOoOoOooooo..', '..oooooooooooo..', '..oooooooooooo..', '...oo.oo.oo.oo..', '..oo..oo.oo..oo.', '..kk..kk.kk..kk.',
  ]],
  rock: [['......qqqq......', '....qqqqqqqq....', '...qqwwqqqqqQ...', '..qqwqqqqqqqQQ..', '.qqqqqqqqqqqQQQ.', '.qqqqqqqqqqQQQQ.', 'qqqqqqqqqqQQQQQQ', 'qqqqqqqqQQQQQQQQ', 'QQQQQQQQQQQQQQQQ']],
  lotus: [['......xx......', '..xx.xRRx.xx..', '.xRRxxRRxxRRx.', '..xRRxyyxRRx..', '...xxxxxxxx...', '.gggggggggggg.', 'gggggGGGgggggg', '.gggggggggggg.']],
  coin: [['.OOOOO.', 'OyyyyyO', 'OyyOyyO', 'OyyOyyO', 'OyyOyyO', 'OyyyyyO', '.OOOOO.']],
  pearl: [['.uuuuu.', 'uwwiiiu', 'uwiiiiu', 'uiiiiiu', 'uiiiiiu', 'uiiiiiu', '.uuuuu.']],
  heart: [['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...']],
  sparkle: [['..y..', '..y..', 'yywyy', '..y..', '..y..']],
};
const MACHINE = [
  '.QQQQQQQQQQQQ.', 'QqqqqqqqqqqqqQ', 'QqqqqqqqqqqLqQ', 'QqqqqqqqqqqqqQ', 'QQQQQQQQQQQQQQ', 'QqqKKKKKKKKqqQ', 'QqqKKKQQKKKqqQ', 'QqqKKKQQKKKqqQ',
  'QqqKKKSSKKKqqQ', 'QqqKKKSSKKKqqQ', 'QqqKKwwwwKKqqQ', 'QqqKKwwwwKKqqQ', 'QqqKKKwwKKKqqQ', 'QQQQQQQQQQQQQQ', 'QqqqqqqqqqqqqQ', 'QQQQQQQQQQQQQQ',
];

// ---------- cá (đều nhìn sang trái) ----------
const FISH = [
  '.....fff......', '....bbbbb.....', '..bbbbbbbbb..f', '.bbbbbbbbbbbff', 'bbkbbbbbbbbbff', 'bbbbbbbbbbbbff', 'bbbbccccbbbbff', '.bbccccccbbbff', '..bbbbbbbbb..f', '....bbbbb.....',
];
const striped = FISH.map((r, j) => [...r].map((ch, i) => ((i === 5 || i === 6 || i === 10) && 'bc'.includes(ch) && j > 0 ? 'w' : ch)).join(''));
const SPECIES = {
  'fish-gold': [FISH, { b: '#f5a623', f: '#e0820f', c: '#fbd38a' }],
  'fish-clown': [striped, { b: '#f2762e', f: '#d95b16', c: '#f9a66e' }],
  'fish-puffer': [[
    '....y.y.y...', '..yyyyyyyy..', '.yyyyyyyyyy.', 'yykyyyyyyyyf', 'yyyyyyyyyyff', 'yyyyyyyyyyyf', 'ywwwwwwwwyy.', '.wwwwwwwww..', '..wwwwwww...', '...y.y.y....',
  ], { y: '#e8c76a', f: '#c9a544' }],
  'fish-shrimp': [[
    'k..k.........', '.kk.rrrrr....', '..rrRrRrRrr..', '.krrrrrrrrrr.', '..rRrRrRrrrr.', '...r.r.r.rrrr', '..........rrr', '.........rr..', '........rrr..',
  ], { r: '#f08a7a', R: '#e06a5a' }],
  'fish-turtle': [[
    '......GGGGGG....', '....GGgGGgGGG...', '...GGgGGGGgGGG..', '.ll.GGGGgGGGGGG.', 'lklGGgGGGGGgGGG.', 'lllGGGGGGGGGGGGl', '.llllllllllllll.', '..ll........ll..', '.lll.......lll..',
  ]],
};

// ---------- tiểu cảnh dùng chung ----------
const jar = (c, x, y, col) => { rect(c, x, y, 5, 6, col); rect(c, x, y - 1, 5, 1, PAL.m); rect(c, x + 1, y + 2, 3, 2, [255, 255, 255, 150]); };
const plates = (c, x, y) => { for (let i = 0; i < 4; i++) { rect(c, x, y - i * 2, 12, 1, PAL.w); rect(c, x + 1, y - 1 - i * 2, 10, 1, PAL.W); } };
const GLASS = [221, 243, 238, 205];
const glassCase = (c, x, y, w, h, shelfY) => {
  rect(c, x, y, w, h, GLASS);
  rect(c, x, y, w, 1, PAL.m); rect(c, x, y, 1, h, PAL.m); rect(c, x + w - 1, y, 1, h, PAL.m);
  rect(c, x + 1, shelfY, w - 2, 1, PAL.m);
};

function cafe() {
  const W = 180, H = 160;
  // 1. trời, biển, dải mây sát chân trời
  let c = canvas(W, H);
  rect(c, 0, 0, W, 106, '#9adfd9');
  rect(c, 0, 78, W, 28, '#7ccfcb');
  for (const [x, w] of [[4, 50], [60, 70], [136, 44]]) {
    rect(c, x, 88, w, 18, '#fad9b8');
    rect(c, x + 2, 84, w - 6, 6, '#fff1d6');
    rect(c, x + 8, 81, w - 22, 4, '#fff1d6');
    rect(c, x + 16, 79, w - 40, 2, '#fff1d6');
  }
  save('cafe_sky', c);

  // 2. tường, khung cửa, kệ hàng (ô cửa để trong suốt)
  c = canvas(W, H);
  rect(c, 0, 0, W, 21, PAL.t);
  for (let x = 9; x < W; x += 9) rect(c, x, 0, 1, 21, PAL.T);
  rect(c, 0, 7, W, 1, PAL.T); rect(c, 0, 14, W, 1, PAL.T);
  rect(c, 0, 20, W, 4, PAL.b); rect(c, 0, 24, W, 1, PAL.B);
  for (const x of [0, 35, 125, 176]) { rect(c, x, 25, 4, 81, PAL.b); rect(c, x, 25, 1, 81, PAL.n); }
  for (const x of [46, 144]) {
    rect(c, x, 0, 1, 11, PAL.B);
    rect(c, x - 2, 11, 5, 2, PAL.m); rect(c, x - 3, 13, 7, 3, PAL.m); rect(c, x - 4, 16, 9, 2, PAL.m); rect(c, x - 1, 18, 3, 2, PAL.y);
  }
  [52, 58, 65, 72, 103, 110, 117].forEach((x, i) => { rect(c, x, 22 + (i % 2) * 2, 5, 3, PAL.g); rect(c, x + 1, 25 + (i % 2) * 2, 3, 1, PAL.G); });
  rect(c, 165, 21, 2, 40, PAL.G);
  for (let k = 0; k < 6; k++) rect(c, k % 2 ? 161 : 167, 26 + k * 6, 4, 3, PAL.g);
  // bồn hoa
  rect(c, 6, 34, 27, 5, PAL.g); rect(c, 9, 32, 21, 2, PAL.g); rect(c, 7, 39, 25, 9, PAL.z);
  [[9, 33, PAL.x], [14, 31, '#f5a26b'], [20, 33, PAL.x], [25, 31, '#f5a26b'], [29, 34, PAL.y]].forEach(([x, y, col]) => rect(c, x, y, 2, 2, col));
  // kệ trái
  for (const y of [60, 74, 88]) rect(c, 5, y, 29, 2, PAL.b);
  for (let i = 0; i < 5; i++) { rect(c, 7 + i * 5, 56, 4, 4, PAL.m); rect(c, 8 + i * 5, 55, 2, 1, PAL.m); }
  for (let i = 0; i < 4; i++) rect(c, 7 + i * 7, 69, 5, 5, '#d9a45b');
  [PAL.u, PAL.m, PAL.u].forEach((col, i) => jar(c, 8 + i * 8, 82, col));
  // kệ dài giữa
  rect(c, 42, 63, 81, 3, PAL.b); rect(c, 45, 66, 2, 4, PAL.b); rect(c, 118, 66, 2, 4, PAL.b);
  for (let i = 0; i < 4; i++) { rect(c, 45 + i * 5, 55, 3, 8, PAL.R); rect(c, 46 + i * 5, 53, 1, 2, PAL.m); }
  rect(c, 69, 60, 12, 3, PAL.w); rect(c, 71, 57, 8, 3, PAL.x); rect(c, 73, 55, 4, 2, PAL.x);
  rect(c, 85, 56, 12, 7, PAL.M); rect(c, 85, 56, 12, 1, PAL.m);
  rect(c, 102, 52, 19, 5, PAL.g); rect(c, 105, 50, 13, 2, PAL.g); rect(c, 103, 57, 17, 6, PAL.z);
  [[105, 51], [109, 49], [113, 51], [117, 50]].forEach(([x, y]) => rect(c, x, y, 2, 2, PAL.y));
  rect(c, 42, 80, 24, 2, PAL.b);
  for (let i = 0; i < 3; i++) { rect(c, 45 + i * 7, 76, 4, 4, PAL.u); rect(c, 44 + i * 7, 73, 6, 3, PAL.x); rect(c, 46 + i * 7, 72, 2, 1, PAL.x); }
  // bảng thực đơn
  rect(c, 149, 49, 20, 27, PAL.b); rect(c, 151, 51, 16, 23, PAL.R);
  for (let i = 0; i < 5; i++) rect(c, 153, 54 + i * 4, i % 2 ? 9 : 12, 1, PAL.m);
  save('cafe_room', c);

  // 3. quầy: tủ kính, máy xay, tô dâu, kệ dưới, sàn ca rô
  c = canvas(W, H);
  glassCase(c, 18, 86, 41, 18, 95);
  for (let i = 0; i < 4; i++) rect(c, 22 + i * 9, 98, 7, 3, '#e0a85e');
  for (let i = 0; i < 5; i++) rect(c, 22 + i * 7, 90, 4, 4, '#f2c98a');
  rect(c, 64, 76, 14, 13, GLASS); rect(c, 65, 82, 12, 7, PAL.d); rect(c, 63, 74, 16, 2, PAL.q);
  rect(c, 62, 89, 18, 15, '#b9bdc2'); rect(c, 65, 92, 12, 4, PAL.Q); rect(c, 70, 99, 2, 2, PAL.Q);
  rect(c, 84, 91, 10, 2, PAL.r); rect(c, 82, 93, 14, 5, PAL.r);
  [[85, 94], [89, 92], [93, 95]].forEach(([x, y]) => px(c, x, y, PAL.w));
  rect(c, 81, 98, 16, 2, PAL.q); rect(c, 83, 100, 12, 3, PAL.q);
  glassCase(c, 134, 80, 37, 24, 92);
  rect(c, 137, 78, 14, 1, PAL.w); rect(c, 139, 74, 10, 4, '#d9a45b'); rect(c, 141, 72, 6, 2, '#d9a45b');
  rect(c, 152, 74, 8, 4, PAL.l); rect(c, 154, 72, 4, 2, PAL.l); rect(c, 162, 74, 8, 4, PAL.R);
  rect(c, 0, 105, 4, 38, PAL.t); rect(c, 172, 105, 8, 38, PAL.t);
  rect(c, 5, 107, 167, 35, '#7d5133');
  rect(c, 5, 121, 167, 2, PAL.n); rect(c, 5, 132, 167, 2, PAL.n); rect(c, 5, 140, 167, 2, PAL.n);
  for (const x of [5, 39, 125, 168]) rect(c, x, 107, 4, 35, PAL.n);
  rect(c, 2, 103, 173, 4, '#d9a86e'); rect(c, 2, 106, 173, 1, '#b98552');
  [[11, '#e9a9a9'], [18, '#e9a9a9'], [25, '#e9a9a9'], [46, PAL.u], [53, PAL.u], [60, PAL.u], [69, PAL.W], [76, PAL.W], [110, PAL.u], [117, PAL.u], [131, PAL.q], [138, PAL.q], [152, '#e9a9a9'], [159, '#e9a9a9']]
    .forEach(([x, col]) => jar(c, x, 115, col));
  rect(c, 90, 119, 16, 2, PAL.w); rect(c, 92, 116, 12, 3, PAL.l);
  [12, 95, 110, 144, 158].forEach((x) => plates(c, x, 131));
  [[46, PAL.t], [55, PAL.q], [64, '#f5d36b']].forEach(([x, col]) => jar(c, x, 126, col));
  rect(c, 78, 124, 3, 8, PAL.G); rect(c, 82, 124, 3, 8, PAL.G); rect(c, 79, 122, 1, 2, PAL.G); rect(c, 83, 122, 1, 2, PAL.G);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 20; k++) rect(c, k * 9, 142 + r * 6, 9, 6, (r + k) % 2 ? '#fbede0' : (r * 3 + k) % 5 === 0 ? '#efa9a0' : '#f6c9c0');
  rect(c, 0, 142, W, 1, '#b98552');
  save('cafe_counter', c);

  // bánh trong tủ kính phải (chỉ hiện khi đã mua Tủ bánh)
  c = canvas(33, 21);
  rect(c, 2, 9, 13, 1, PAL.w); rect(c, 4, 6, 9, 3, PAL.v); rect(c, 6, 5, 5, 1, PAL.v);
  for (let i = 0; i < 2; i++) { rect(c, 19 + i * 7, 6, 4, 4, '#c8703f'); rect(c, 18 + i * 7, 3, 6, 3, PAL.g); }
  for (let i = 0; i < 4; i++) { rect(c, 3 + i * 8, 17, 4, 4, '#f2c98a'); rect(c, 2 + i * 8, 14, 6, 3, i % 2 ? PAL.x : '#fff3ec'); }
  save('cafe_cakes', c);

  // 4. chậu hoa lớn phía trước
  c = canvas(W, H);
  rect(c, 157, 128, 22, 14, PAL.g); rect(c, 160, 124, 16, 4, PAL.g); rect(c, 154, 134, 6, 8, PAL.G); rect(c, 159, 142, 19, 4, PAL.G);
  [[160, 127, PAL.w], [167, 125, PAL.x], [174, 129, PAL.w], [163, 134, PAL.x], [171, 136, PAL.w], [156, 138, PAL.x]].forEach(([x, y, col]) => rect(c, x, y, 3, 3, col));
  rect(c, 159, 147, 19, 13, PAL.z); rect(c, 158, 145, 21, 3, PAL.b);
  save('cafe_front', c);

  // mây trôi: ba cỡ
  [[30, 12], [22, 9], [40, 15]].forEach(([w, h], i) => {
    c = canvas(w, h);
    const col = '#fff6e4';
    rect(c, 0, h - 4, w, 4, col); rect(c, 3, h - 7, w - 8, 3, col); rect(c, Math.round(w * 0.3), 1, Math.round(w * 0.4), h - 7, col); rect(c, Math.round(w * 0.38), 0, Math.round(w * 0.22), 1, col);
    rect(c, Math.round(w * 0.14), h - 9, Math.round(w * 0.2), 2, col);
    save(`cloud_${i}`, c);
  });
}

function aquarium() {
  const W = 180, H = 106;
  let c = canvas(W, H);
  rect(c, 0, 0, W, H, '#bfe9ee'); rect(c, 0, 32, W, 74, '#a6dde4'); rect(c, 0, 64, W, 42, '#8bd0d8');
  for (const x0 of [44, 118]) for (let y = 0; y < H; y++) rect(c, Math.round(x0 - y * 0.34), y, 14, 1, [255, 255, 255, 28]);
  for (let x = 0; x < W; x++) {
    const h = 10 + Math.round(2 * Math.sin(x / 14));
    rect(c, x, H - h, 1, h, '#e8d3a2'); px(c, x, H - h, '#f3e4bd');
  }
  [[30, 100], [72, 102], [108, 99], [150, 101]].forEach(([x, y]) => rect(c, x, y, 4, 2, '#cdb684'));
  save('tank_water', c);

  // mặt nước: hai khung hình xen kẽ để tạo gợn sóng
  for (const f of [0, 1]) {
    c = canvas(W, 4);
    for (let x = 0; x < W; x++) rect(c, x, 0, 1, (x + f * 6) % 12 < 6 ? 3 : 2, [255, 255, 255, 190]);
    save(`tank_surface_${f}`, c);
  }
  // rong: hai khung hình uốn ngược nhau
  for (const f of [0, 1]) {
    c = canvas(7, 26);
    for (let y = 0; y < 26; y++) {
      const x = 2 + Math.round(Math.sin(y / 3.2 + f * Math.PI) * 1.6 * (1 - y / 30));
      rect(c, x, y, 3, 1, PAL.G); px(c, x + 1, y, PAL.g);
    }
    save(`weed_${f}`, c);
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
cafe();
aquarium();
for (const [look, pal] of Object.entries(LOOKS)) for (const [frame, map] of Object.entries(FRAMES)) save(`${look}_${frame}`, sprite(map, pal));
for (const [name, [map, pal]] of Object.entries(ITEMS)) save(name, sprite(map, pal));
save('machine_idle', sprite(MACHINE, { L: PAL.Q, S: PAL.K }));
save('machine_brew', sprite(MACHINE, { L: '#ff6b57', S: PAL.d }));
for (const [name, [map, pal]] of Object.entries(SPECIES)) save(name, sprite(map, pal));

// Bảng tra cho app: tên → file và kích thước tính bằng pixel của thế giới game.
const lines = Object.entries(made).map(([n, [w, h]]) => `  '${n}': { src: require('../../../assets/game/${n}.png'), w: ${w}, h: ${h} },`);
fs.writeFileSync(
  path.join(ROOT, 'src', 'game', 'view', 'assets.ts'),
  `// File sinh tự động bởi scripts/make-game-assets.mjs. Đừng sửa tay.\nexport const ASSETS = {\n${lines.join('\n')}\n} as const;\n\nexport type AssetId = keyof typeof ASSETS;\n`,
);
console.log(`Đã ghi ${Object.keys(made).length} ảnh vào assets/game (×${SCALE}).`);
