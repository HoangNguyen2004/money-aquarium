import React, { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as T from 'three';
import { fishKind, sectionAt } from './fishAnatomy';

type FinKind='tail'|'dorsal'|'anal'|'pectoral';
/** Subdivided membrane with radial rays and a flexible trailing edge. */
export function FishFin({ id, kind, time, calm, map, color }: { id:string; kind:FinKind; time:React.RefObject<number>; calm:boolean; map?:T.Texture|null; color:string }) {
  const species=fishKind(id);
  const geometry=useMemo(()=>{
    const pos:number[]=[],uv:number[]=[],colors:number[]=[],idx:number[]=[];
    const across=80,along=12,c=new T.Color(color),dark=new T.Color(species==='clown'?'#252B26':'#81572E');
    for(let a=0;a<=across;a++) {
      const s=a/across,theta=(s-.5)*(kind==='tail'?1.65:1.45);
      let ex:number,ey:number;
      if(kind==='tail') {
        const length=species==='gold'? .70+.44*Math.pow(Math.abs(s-.5)*2,1.1) : species==='clown'?.52:.43;
        ex=Math.cos(theta)*length;ey=Math.sin(theta)*length;
      } else if(kind==='dorsal'||kind==='anal') {
        ex=species==='puffer'?.38+s*.48:-.55+s*1.24;ey=(kind==='anal'?-1:1)*Math.pow(Math.sin(Math.PI*s),.75)*(species==='gold'?.43:species==='puffer'?.24:.24);
      } else {ex=.13+Math.cos(theta)*.43;ey=-.10+Math.sin(theta)*.30;}
      for(let b=0;b<=along;b++) {
        const r=b/along;
        const attached=kind==='dorsal'||kind==='anal';
        const bx=attached?ex:0;
        const [height,,centre]=sectionAt(id,(bx+.96)/1.92);
        const by=attached ? centre+height*(kind==='anal'?-1:1)*.97 : 0;
        pos.push(bx+(ex-bx)*r,by+ey*r,Math.sin(s*Math.PI)*r*r*.035);
        uv.push(kind==='tail'?(235+ex*r*57)/320:(150+ex*r*60)/320,(100-ey*r*74)/200);
        const ray=Math.pow(Math.abs(Math.cos(s*Math.PI*16)),24)*.33;
        const edge=species==='clown'?T.MathUtils.smoothstep(r,.87,1)*.8:0;
        const tint=c.clone().lerp(dark,Math.max(ray,edge));colors.push(tint.r,tint.g,tint.b);
        if(a<across&&b<along){const i=a*(along+1)+b;idx.push(i,i+1,i+along+1,i+1,i+along+2,i+along+1);}
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();return g;
  },[species,kind,color]);
  const rest=useMemo(()=>Float32Array.from(geometry.attributes.position.array),[geometry]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame(()=>{const p=geometry.attributes.position,t=calm?0:time.current;for(let i=0;i<p.count;i++){const r=(i%13)/12; p.setZ(i,rest[i*3+2]+Math.sin(t*(species==='puffer'?8:4.2)-r*3.5+rest[i*3+1]*3)*r*r*(kind==='tail'?.09:.045));}p.needsUpdate=true;geometry.computeVertexNormals();});
  return <mesh geometry={geometry}><meshStandardMaterial color="#FFFFFF" map={map} vertexColors={!map} side={T.DoubleSide} transparent opacity={species==='puffer'?.48:.76} roughness={.48} metalness={0} depthWrite={false} /></mesh>;
}
