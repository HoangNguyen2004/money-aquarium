import * as T from 'three';

// Side profile: longitudinal position, half-height, half-width, centre height.
type Section = [number, number, number, number];
const PROFILES: Record<string, Section[]> = {
  gold: [[0,0,0,-.04],[.05,.13,.09,-.02],[.16,.29,.19,.02],[.34,.45,.27,.04],[.52,.44,.26,.02],[.72,.29,.17,-.01],[.88,.12,.08,-.025],[1,.065,.045,-.025]],
  clown: [[0,0,0,-.02],[.04,.12,.075,0],[.17,.28,.15,.01],[.37,.36,.20,.02],[.58,.31,.17,0],[.79,.17,.09,-.01],[.92,.085,.045,0],[1,.07,.035,0]],
  puffer: [[0,0,0,.015],[.05,.18,.12,.02],[.19,.35,.29,.015],[.36,.43,.36,-.015],[.53,.39,.31,-.035],[.72,.25,.19,-.015],[.87,.11,.075,0],[1,.055,.04,0]],
};
export const fishKind = (id: string) => id === 'fish-puffer' ? 'puffer' : id === 'fish-clown' ? 'clown' : 'gold';
export function sectionAt(id: string, u: number) {
  const sections=PROFILES[fishKind(id)];
  let i=0; while(i<sections.length-2 && sections[i+1][0]<u)i++;
  const a=sections[i], b=sections[i+1], t=(u-a[0])/(b[0]-a[0]);
  return [1,2,3].map(k => {
    const before=sections[Math.max(0,i-1)], after=sections[Math.min(sections.length-1,i+2)];
    const m0=(b[k]-before[k])/(b[0]-before[0])*(b[0]-a[0]);
    const m1=(after[k]-a[k])/(after[0]-a[0])*(b[0]-a[0]);
    return (2*t*t*t-3*t*t+1)*a[k]+(t*t*t-2*t*t+t)*m0+(-2*t*t*t+3*t*t)*b[k]+(t*t*t-t*t)*m1;
  });
}
export function bodyGeometry(id: string, custom: boolean) {
  const pos:number[]=[], uv:number[]=[], indices:number[]=[];
  const rings=64, segments=40;
  for(let i=0;i<=rings;i++) {
    const u=i/rings, [height,width,centre]=sectionAt(id,u);
    for(let j=0;j<=segments;j++) {
      const angle=j/segments*Math.PI*2, y=centre+Math.cos(angle)*height;
      pos.push(-.96+u*1.92,y,Math.sin(angle)*width);
      uv.push(custom ? (55+u*180)/320 : u, custom ? (100-y*110)/200 : j/segments);
      if(i<rings && j<segments) { const a=i*(segments+1)+j,b=a+segments+1; indices.push(a,a+1,b,b,a+1,b+1); }
    }
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
const smooth=(a:number,b:number,x:number)=>{const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const hash=(a:number,b:number)=>{const v=Math.sin(a*127.1+b*311.7)*43758.5453;return v-Math.floor(v);};
/** Paint generated once per species; all detail travels with the skin, not the camera. */
export function skinTexture(id:string) {
  const w=768,h=384,data=new Uint8Array(w*h*4),kind=fishKind(id);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
    const u=x/(w-1),v=y/(h-1),top=(Math.cos(v*Math.PI*2)+1)/2;
    let rgb:number[];
    if(kind==='clown') {
      const bend=Math.sin(v*Math.PI*2)*.012+Math.cos(v*Math.PI*4)*.008;
      const band=Math.min(Math.abs(u-.20-bend)/.037,Math.abs(u-.51+bend)/.052,Math.abs(u-.85-bend)/.026);
      const white=1-smooth(.88,1.04,band),black=1-smooth(1.08,1.42,band);
      rgb=[226,91,22].map((c,i)=>T.MathUtils.lerp(T.MathUtils.lerp(c,[32,31,25][i],black),[242,237,214][i],white));
    } else if(kind==='puffer') {
      const belly=1-smooth(.32,.58,top);
      rgb=[149,155,65].map((c,i)=>T.MathUtils.lerp(c,[233,226,188][i],belly));
      const cx=u*13,cy=v*19,ix=Math.floor(cx),iy=Math.floor(cy);
      const r=.19+hash(ix,iy)*.12;
      const d=Math.hypot(cx-ix-.1-hash(ix,iy)*.8,cy-iy-.1-hash(iy,ix)*.8);
      const spot=(hash(ix+3,iy+2)>.2?1:0)*(1-smooth(r-.035,r+.025,d))*smooth(.38,.55,top)*smooth(.08,.15,u);
      rgb=rgb.map((c,i)=>T.MathUtils.lerp(c,[38,49,28][i],spot));
    } else {
      const belly=1-smooth(.15,.65,top);
      rgb=[220,115,29].map((c,i)=>T.MathUtils.lerp(c,[250,204,115][i],belly*.75));
    }
    // Staggered overlapping scales, reduced at the face. Puffers have fine skin instead.
    const row=Math.floor(v*36), sx=((u*43+(row%2)*.5)%1)-.5, sy=(v*36)%1;
    const rim=Math.exp(-Math.pow((Math.hypot(sx,sy*.65)-.48)*35,2));
    const scales=kind==='puffer'?0:(rim*.13-Math.exp(-Math.pow((sy-.35)*8,2))*.025)*smooth(.16,.29,u);
    const shade=.80+top*.17-scales+(hash(x,y)-.5)*.025;
    const i=(y*w+x)*4;for(let c=0;c<3;c++)data[i+c]=Math.max(0,Math.min(255,rgb[c]*shade));data[i+3]=255;
  }
  const texture=new T.DataTexture(data,w,h);texture.colorSpace=T.SRGBColorSpace;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}

export function scaleRelief(id: string) {
  const w=384,h=192,data=new Uint8Array(w*h*4),puffer=fishKind(id)==='puffer';
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const u=x/(w-1),v=y/(h-1),row=Math.floor(v*36);
    const sx=((u*43+(row%2)*.5)%1)-.5,sy=(v*36)%1;
    const edge=Math.exp(-Math.pow((Math.hypot(sx,sy*.65)-.48)*28,2));
    const height=puffer?.5+(hash(x,y)-.5)*.12:.65-edge*.45*smooth(.16,.29,u);
    const i=(y*w+x)*4;data[i]=data[i+1]=data[i+2]=Math.round(height*255);data[i+3]=255;
  }
  const t=new T.DataTexture(data,w,h);t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;
}
