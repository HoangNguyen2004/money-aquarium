// Run after expo export. A separate review page in a fresh browser profile;
// the production entry and real saved data are never changed.
import fs from 'node:fs';
const file = 'dist/index.html';
const fixture = { transactions: [], budgets: {}, plan: { income: 0, savings: 0 }, game: {
  enabled: true, cafeName: 'Cozy Money Café', startedAt: '2026-11-12', coins: 120, xp: 160,
  pearls: 8, eggs: 0, ledger: [], reviewed: [], closedMonths: [],
  items: ['cake', 'radio', 'sofa', 'plant', 'cat'], hidden: [], names: {},
  served: { date: '', count: 0 }, placed: {},
} };
const setup = `<script>
localStorage.setItem('so-chi-tieu:v1', ${JSON.stringify(JSON.stringify(fixture))});
const previewTimer = setInterval(() => {
 const tab = document.querySelector('[role="tab"][aria-label="Quán của tôi"]');
 if(tab) { tab.click(); clearInterval(previewTimer); }
}, 100);
setTimeout(() => clearInterval(previewTimer), 15000);
// Optional real UI flow: serve the waiting order once, then expose the persisted result.
if (new URLSearchParams(location.search).has('serve')) {
 let clicked = false;
 const serveTimer = setInterval(() => {
  if (!clicked) {
   const wanted = [...document.querySelectorAll('[aria-label^="Bán "]')].find(e =>
    e.getAttribute('aria-disabled') !== 'true' && getComputedStyle(e).borderColor === 'rgb(88, 152, 140)');
   if(wanted) { wanted.click(); clicked = true; }
  }
  const saved = JSON.parse(localStorage.getItem('so-chi-tieu:v1') || '{}');
  if(saved.game?.served?.count > 0) {
   document.documentElement.dataset.cafeServed = String(saved.game.served.count);
   document.title = 'Cafe UI verified: served ' + saved.game.served.count;
   clearInterval(serveTimer);
  }
 }, 100);
 setTimeout(() => clearInterval(serveTimer), 20000);
}

</script>`;
fs.writeFileSync('dist/cafe-preview.html', fs.readFileSync(file, 'utf8').replace('<head>', '<head>'+setup));
fs.writeFileSync('dist/cafe-serve-preview.html', fs.readFileSync('dist/cafe-preview.html', 'utf8').replace("new URLSearchParams(location.search).has('serve')", 'true'));
console.log('Review page: dist/cafe-preview.html (synthetic game fixture)');
