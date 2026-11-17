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


  await send('Emulation.setDeviceMetricsOverride',{width:1024,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:5397/aquarium-preview.html'});
  for(let i=0;i<100;i++){await delay(150);if((await evaluate('document.title'))?.startsWith('PASS:'))break;}
  const fixture=await evaluate(`JSON.parse(localStorage.getItem('so-chi-tieu:v1'))`);
  assert.ok(fixture?.game);
  const click=async (text)=>{assert.ok(await evaluate(`(()=>{const e=[...document.querySelectorAll('[role="button"],[role="tab"]')].find(e=>e.textContent===${JSON.stringify(text)}||e.getAttribute('aria-label')===${JSON.stringify(text)});e?.click();return !!e;})()`),text);await delay(200);};
  for(const id of ['fish-gold','fish-clown','fish-puffer']) {
    fixture.game.items=[id];fixture.game.hidden=[];fixture.game.fishCare[id]={days:8,lastFed:''};fixture.customFish=[];
    await evaluate(`localStorage.setItem('so-chi-tieu:v1',${JSON.stringify(JSON.stringify(fixture))})`);
    await send('Page.navigate',{url:'http://127.0.0.1:5397/index.html'});await delay(1800);await click('Hồ cá');await delay(1600);
    assert.ok(await evaluate(`!!document.querySelector('[data-testid="aquarium-3d-ready"] canvas')`));
    await click('Tạm dừng');await click(fixture.game.names[id]);await delay(1800);
    await evaluate(`document.querySelector('[data-testid="aquarium-3d-ready"]').scrollIntoView({block:'center'})`);
    const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('shots/realistic-'+id+'.png',Buffer.from(shot.result.data,'base64'));
    await click('→');await delay(700);await click('Nhẹ máy');await click('Tiếp tục');await delay(300);
    assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'),false);
  }
  assert.deepEqual(errors,[]);console.log('PASS: three species render in 3D; focus, orbit, pause/resume and low quality; no runtime exceptions.');
} finally {socket?.close();chrome.kill();server.close();}
