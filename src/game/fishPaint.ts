import type { CustomFish } from './customFish';
/** Platform-independent rasterizer. Erasing reveals the current body colour. */
export function rasterFish(fish: Pick<CustomFish, 'color' | 'strokes'>) {
  const pixels = new Uint8Array(320 * 200 * 4);
  const rgb = (hex: string) => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16));
  const base = rgb(fish.color);
  for (let i=0;i<pixels.length;i+=4) { pixels.set(base,i); pixels[i+3]=255; }
  for (const stroke of fish.strokes) {
    const color = stroke.erase ? base : rgb(stroke.color), radius = stroke.width/2;
    for (let j=0;j<stroke.points.length;j++) {
      const a=stroke.points[Math.max(0,j-1)], b=stroke.points[j];
      const dx=b[0]-a[0], dy=b[1]-a[1], length=dx*dx+dy*dy;
      for(let y=Math.max(0,Math.floor(Math.min(a[1],b[1])-radius));y<=Math.min(199,Math.ceil(Math.max(a[1],b[1])+radius));y++) {
        for(let x=Math.max(0,Math.floor(Math.min(a[0],b[0])-radius));x<=Math.min(319,Math.ceil(Math.max(a[0],b[0])+radius));x++) {
          const t=length ? Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/length)) : 0;
          const coverage=Math.max(0,Math.min(1,radius+0.5-Math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)));
          const i=(y*320+x)*4;
          for(let c=0;c<3;c++) pixels[i+c]=Math.round(pixels[i+c]*(1-coverage)+color[c]*coverage);
        }
      }
    }
  }
  return pixels;
}
