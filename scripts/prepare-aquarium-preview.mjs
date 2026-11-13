// Isolated review fixture. Run after expo export; never touches the user's saved app data.
import fs from 'node:fs';
const fixture = { transactions: [], budgets: {}, plan: { income: 0, savings: 0 }, game: {
  enabled: true, cafeName: 'Hồ Mây', startedAt: '2026-11-12', coins: 120, xp: 180,
  pearls: 8, eggs: 1, ledger: [], reviewed: [], closedMonths: [],
  items: ['fish-gold', 'fish-clown', 'fish-puffer', 'fish-turtle', 'fish-shrimp', 'rock', 'lotus'], hidden: [], names: { 'fish-gold': 'Nắng', 'fish-clown': 'Cam', 'fish-puffer': 'Bông', 'fish-turtle': 'Rêu', 'fish-shrimp': 'Đào' },
  fishCare: { 'fish-gold': { days: 8, lastFed: '2026-11-11' }, 'fish-puffer': { days: 3, lastFed: '2026-11-11' }, 'fish-turtle': { days: 7, lastFed: '2026-11-11' }, 'fish-shrimp': { days: 7, lastFed: '2026-11-11' } },
  served: { date: '', count: 0 }, placed: {},
} };
const setup = `<script>
localStorage.setItem('so-chi-tieu:v1', ${JSON.stringify(JSON.stringify(fixture))});
let stage = 0;
const checks = [];
const timer = setInterval(() => {
  const tab = document.querySelector('[role="tab"][aria-label="Hồ cá"]');
  if (!stage && tab) { tab.click(); stage = 1; return; }
  const button = (label) => [...document.querySelectorAll('[role="button"]')].find(e => e.textContent === label);
  if (stage === 1 && button('Cho cá ăn')) { button('Cho cá ăn').click(); stage = 2; return; }
  if (stage === 2) {
    const saved = JSON.parse(localStorage.getItem('so-chi-tieu:v1') || '{}');
    if(saved.game?.fishCare?.['fish-clown']?.days === 1) {
      checks.push('feeding persisted', 'legacy save loaded');
      button('Cho cá ăn')?.click(); stage = 3; return;
    }
  }
  if(stage === 3) {
    const saved = JSON.parse(localStorage.getItem('so-chi-tieu:v1') || '{}');
    if(saved.game?.fishCare?.['fish-clown']?.days !== 1) throw new Error('Duplicate growth');
    checks.push('daily growth deduplicated');
    if (button('Tạm dừng')) { button('Tạm dừng').click(); stage = 4; return; }
  }
  if(stage === 4 && button('Tiếp tục')) { checks.push('pause'); button('Tiếp tục').click(); stage = 5; return; }
  if(stage === 5 && button('Chỉ ngắm')) { button('Chỉ ngắm').click(); stage = 6; return; }
  if(stage === 6 && button('Xong')) {
    checks.push('focus mode');
    document.title = 'PASS: ' + checks.join(', ');
    document.documentElement.dataset.aquariumChecks = checks.join(', ');
    console.info(document.title); clearInterval(timer);
  }
}, 180);
setTimeout(() => { clearInterval(timer); if(stage !== 6) document.title = 'FAIL: aquarium stage ' + stage; }, 12000);
</script>`;
fs.writeFileSync('dist/aquarium-preview.html', fs.readFileSync('dist/index.html', 'utf8').replace('<head>', '<head>' + setup));
console.log('Review page: dist/aquarium-preview.html');

const preview = fs.readFileSync('dist/aquarium-preview.html', 'utf8');
const from = preview.indexOf('let stage = 0;');
const to = preview.indexOf('</script>', from);
const openScene = `const demoTimer = setInterval(() => {
 const tab = document.querySelector('[role="tab"][aria-label="Hồ cá"]');
 if(tab) { tab.click(); clearInterval(demoTimer); }
}, 150);
setTimeout(() => clearInterval(demoTimer), 15000);
`;
fs.writeFileSync('dist/aquarium-demo.html', preview.slice(0, from) + openScene + preview.slice(to));
