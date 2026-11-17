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

  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:5397/aquarium-preview.html'});
  for(let i=0;i<100;i++) { await delay(150); if((await evaluate('document.title'))?.startsWith('PASS:')) break; }
  const click = async (role, text) => { assert.ok(await evaluate(`(() => { const e = [...document.querySelectorAll('[role="${role}"]')].find(e => (e.textContent === ${JSON.stringify(text)} || e.getAttribute('aria-label') === ${JSON.stringify(text)})); e?.click(); return !!e; })()`),text); await delay(200); };
  await click('button','Xong'); await click('tab','Vẽ cá');
  const fill = async value => { await evaluate(`(() => { const e=document.querySelector('input[aria-label="Tên cá sáng tạo"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)}); e.dispatchEvent(new Event('input',{bubbles:true})); })()`); await delay(100); };
  await fill('Cá Mây');
  await evaluate(`document.querySelector('[data-testid="fish-drawing-canvas"]').scrollIntoView({block:'center'})`);
  const box = await evaluate(`(() => {const r=document.querySelector('[data-testid="fish-drawing-canvas"]').getBoundingClientRect();return {x:r.x+r.width*.4,y:r.y+r.height*.5};})()`);
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:box.x,y:box.y,button:'left',clickCount:1});
  for(let n=1;n<=10;n++) await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:box.x+n*3,y:box.y+Math.sin(n)*5,buttons:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:box.x+30,y:box.y,button:'left',clickCount:1}); await delay(200);
  await click('button','Hoàn tác'); await click('button','Làm lại nét');
  await delay(700);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('aquarium:fish-draft')).strokes.length`),1);
  await send('Page.navigate',{url:'http://127.0.0.1:5397/index.html'});await delay(2500);
  await click('tab','Hồ cá'); await click('tab','Vẽ cá');
  assert.equal(await evaluate(`document.querySelector('input[aria-label="Tên cá sáng tạo"]').value`),'Cá Mây');
  await click('button','Hoàn tác');await click('button','Làm lại nét');
  await click('button','Xem thử cá trong hồ 3D');await delay(1800);
  assert.ok(await evaluate(`!!document.querySelector('[data-testid="aquarium-3d-ready"] canvas')`));
  await evaluate(`document.querySelector('[data-testid="aquarium-3d-ready"]').scrollIntoView({block:'center'})`);
  fs.writeFileSync('shots/fish-preview-3d.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).result.data,'base64'));
  await click('button','Đóng xem thử 3D');
  await evaluate(`document.querySelector('[data-testid="fish-drawing-canvas"]').scrollIntoView({block:'center'})`);

  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'),false);
  fs.writeFileSync('shots/fish-studio-390.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).result.data,'base64'));
  await click('button','Lưu và thả cá vào hồ');
  const saved = await evaluate(`JSON.parse(localStorage.getItem('so-chi-tieu:v1')).customFish`);
  assert.equal(saved.length,1);assert.equal(saved[0].name,'Cá Mây');assert.equal(saved[0].strokes.length,1);assert.ok(saved[0].strokes[0].points.length>2);
  await delay(1800);
  assert.ok(await evaluate(`!!document.querySelector('[data-testid="aquarium-3d-ready"] canvas')`), 'Custom fish must remain in 3D');
  await evaluate(`document.querySelector('[data-testid="aquarium-3d-ready"]').scrollIntoView({block:'center'})`);
  fs.writeFileSync('shots/fish-custom-3d.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).result.data,'base64'));
  await click('button','Chuyển 2D');
  assert.ok(await evaluate(`!!document.querySelector('[data-testid="fish-art-${saved[0].id}"] svg')`));
  await click('tab','Vẽ cá');await click('button','Sửa cá');await fill('Cá Mây mới');await click('button','Lưu thay đổi');
  await send('Page.navigate',{url:'http://127.0.0.1:5397/index.html'});await delay(2500);
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('so-chi-tieu:v1')).customFish[0].name`),'Cá Mây mới');
  await click('tab','Hồ cá');await click('tab','Vẽ cá');
  assert.ok(await evaluate(`document.body.innerText.includes('Cá Mây mới')`));
  await click('button','Cất cá');
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('so-chi-tieu:v1')).customFish[0].inPond`),false);
  await click('button','Thả cá');
  await send('Emulation.setDeviceMetricsOverride',{width:1024,height:844,deviceScaleFactor:1,mobile:false});await delay(300);
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'),false);
  fs.writeFileSync('shots/fish-studio-1024.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).result.data,'base64'));
  await evaluate('window.confirm = () => true');
  await click('button','Xoá cá');
  assert.equal(await evaluate(`JSON.parse(localStorage.getItem('so-chi-tieu:v1')).customFish.length`),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: draw, undo/redo, draft recovery, 3D preview, save, 3D swim, edit, reload, store/release, delete; 390 and 1024 no overflow.');
} finally { socket?.close(); chrome.kill(); server.close(); }
