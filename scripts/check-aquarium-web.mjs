import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const root = path.resolve('dist');
const basePath = process.env.AQUARIUM_BASE_PATH || '';
const server = http.createServer((req,res) => {
  const requested = decodeURIComponent(req.url.split('?')[0]);
  if (basePath && !requested.startsWith(basePath + '/')) { res.writeHead(404).end(); return; }
  const file = path.resolve(root, '.' + requested.slice(basePath.length));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try { res.setHeader('Content-Type', ({'.js':'application/javascript','.html':'text/html','.png':'image/png','.ttf':'font/ttf'})[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file)); } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(5397,'127.0.0.1',r));
fs.mkdirSync('.taste-skill', { recursive: true });
const profile = fs.mkdtempSync(path.resolve('.taste-skill/chrome-aquarium-check-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=9398','--user-data-dir='+profile,'about:blank'], {stdio:'ignore'});
const delay = ms => new Promise(r => setTimeout(r,ms));
let socket;
try {
  let pages;
  for(let n=0;n<150;n++) { try { pages = await (await fetch('http://127.0.0.1:9398/json')).json(); if(pages.length) break; } catch {} await delay(100); }
  assert.ok(pages?.some(p => p.type === 'page'), 'Chrome did not start its debugging endpoint');
  socket = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => socket.addEventListener('open',r,{once:true}));
  let seq=0; const pending=new Map(); const errors=[];
  socket.addEventListener('message', e => { const msg=JSON.parse(e.data); if(msg.id) { pending.get(msg.id)?.(msg); pending.delete(msg.id); } if(msg.method==='Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.text); });
  const send = (method,params={}) => new Promise(r => { const id=++seq; pending.set(id,r); socket.send(JSON.stringify({id,method,params})); });
  const evaluate = async expression => (await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result?.result?.value;
  await send('Runtime.enable');
  for(const width of [390,1024]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:'http://127.0.0.1:5397'+basePath+'/aquarium-preview.html'});
    let result;
    for(let i=0;i<100;i++) { await delay(150); result = await evaluate('document.title'); if(result?.startsWith('PASS:') || result?.startsWith('FAIL:')) break; }
    assert.ok(result?.startsWith('PASS:'),result);
    const stats = await evaluate(`({overflow:document.documentElement.scrollWidth > innerWidth, fish:document.querySelectorAll('[aria-label^="Xem "]').length, text:document.body.innerText})`);
    assert.equal(stats.overflow,false);
    assert.ok(await evaluate(`!!document.querySelector('[data-testid="aquarium-3d-ready"] canvas')`), '3D canvas must render without falling back'); assert.ok(!stats.text.includes('Quán của tôi'));
    const shot = await send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync('shots/aquarium-'+width+'.png',Buffer.from(shot.result.data,'base64'));
    const clickText = async (role, text) => evaluate(`(() => { const e = [...document.querySelectorAll('[role="${role}"]')].find(e => e.textContent === ${JSON.stringify(text)}); e?.click(); return !!e; })()`);
    assert.ok(await clickText('button', 'Xong')); await delay(200);
    assert.ok(await clickText('button', 'Chuyển 2D')); await delay(400);
    assert.ok(await clickText('tab', 'Cửa hàng')); await delay(300);
    assert.ok(await evaluate(`document.body.innerText.includes('Bạn đã mua hết') && !document.body.innerText.includes('Ghế sofa')`));
    assert.ok(await clickText('tab', 'Kho đồ')); await delay(300);
    assert.ok(await evaluate(`document.body.innerText.includes('Bộ sưu tập của bạn')`));
    assert.ok(await clickText('tab', 'Hồ cá')); await delay(400);
    assert.ok(await clickText('button', 'Chuyển 2D')); await delay(300);
    assert.ok(await evaluate(`(() => { const fish = document.querySelector('[aria-label="Xem Nắng"]'); fish?.click(); return !!fish; })()`));
    await delay(250);
    assert.ok(await evaluate(`document.body.innerText.includes('Vảy ánh mật ong') && document.body.innerText.includes('ngày chăm sóc')`));
    assert.ok(await evaluate(`(() => { const close = document.querySelector('[aria-label="Đóng"]'); close?.click(); return !!close; })()`));
    await delay(200);
    const normalShot = await send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync('shots/aquarium-normal-'+width+'.png',Buffer.from(normalShot.result.data,'base64'));
    console.log(width+'px: '+result+'; fish-only shop and inventory; five residents rendered; no horizontal overflow');
  }
  const click = async (role, text) => { const found = await evaluate(`(() => { const node = [...document.querySelectorAll('[role="${role}"]')].find(e=>e.textContent===${JSON.stringify(text)}); node?.click(); return !!node; })()`); assert.ok(found, 'Missing control: '+text); await delay(180); };
  const fill = async (label, value) => { assert.ok(await evaluate(`(() => { const e=document.querySelector('input[aria-label=${JSON.stringify(label)}]'); if(!e)return false; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));return true; })()`));await delay(100); };
  const saved = async () => evaluate(`JSON.parse(localStorage.getItem('so-chi-tieu:v1'))`);
  const before = await saved();
  await click('tab','Mục tiêu');await click('button','Tạo mục tiêu');
  await fill('Tên mục tiêu','Quỹ dự phòng UI');await fill('Số tiền','1000000');await click('button','Lưu mục tiêu');
  let state = await saved();assert.equal(state.goals.length,1);assert.equal(state.goals[0].target,1000000);
  await click('button','Góp thêm');await fill('Số tiền','300000');await click('button','Đã chuyển, ghi nhận');
  state=await saved();assert.equal(state.goals[0].contributions.length,1);assert.equal(state.goals[0].contributions[0].amount,300000);
  assert.deepEqual(state.transactions,before.transactions);assert.equal(state.game.food,before.game.food);
  assert.ok(await evaluate(`document.body.innerText.includes('30%')`));
  await click('tab','Sổ tay');assert.equal(await evaluate(`document.querySelectorAll('[data-testid^="catalog-"]').length`),20);
  await click('button','Sự kiện');assert.equal(await evaluate(`document.querySelectorAll('[data-testid^="catalog-"]').length`),1);
  await click('tab','Hồ cá');await delay(500);await click('button','Chuyển 2D');
  console.log('Goal creation, confirmed contribution, financial separation and 20-species catalog: PASS');
  // Review the same rendered artwork at a larger size, with no production gallery UI.
  await evaluate(`(() => {
    const names = { 'fish-gold': 'Cá vàng đuôi voan', 'fish-clown': 'Cá hề', 'fish-puffer': 'Cá nóc đốm', 'fish-turtle': 'Rùa tai vàng', 'fish-shrimp': 'Tép anh đào' };
    const art = [...document.querySelectorAll('[data-testid^="fish-art-"] svg')];
    const board = document.createElement('div');
    board.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#102E3C;color:#E5EEE8;padding:48px;font-family:system-ui';
    const heading = document.createElement('h1'); heading.textContent = 'Cư dân của Hồ Mây'; heading.style.cssText='font-weight:500;font-size:28px;margin:0 0 12px'; board.append(heading);
    const sub = document.createElement('p'); sub.textContent='Năm hình thể riêng · Vây và đuôi chuyển động độc lập'; sub.style.cssText='color:#8BB5B5;margin:0 0 36px'; board.append(sub);
    const grid = document.createElement('div'); grid.style.cssText='display:grid;grid-template-columns:repeat(3,1fr);gap:24px';
    art.forEach((svg,i) => { const card=document.createElement('div'); card.style.cssText='height:230px;background:#184354;border-radius:20px;padding:18px;text-align:center'; const frame=document.createElement('div');frame.style.cssText='height:180px';const copy=svg.cloneNode(true);copy.setAttribute('width','100%');copy.setAttribute('height','100%');frame.append(copy);card.append(frame);const label=document.createElement('p');label.textContent=names[svg.closest('[data-testid]').getAttribute('data-testid').replace('fish-art-', '')];label.style.cssText='margin:6px;font-size:15px;color:#C4DCD5';card.append(label);grid.append(card); });
    board.append(grid);document.body.append(board);return art.length;
  })()`);
  const gallery = await send('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync('shots/aquarium-species.png',Buffer.from(gallery.result.data,'base64'));
  assert.deepEqual(errors,[]);
} finally { socket?.close(); chrome.kill(); server.close(); }
