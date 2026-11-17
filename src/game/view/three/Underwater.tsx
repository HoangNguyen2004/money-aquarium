import React, { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as T from 'three';

/** Caustic light on the sand; deterministic and independent of DOM/canvas APIs. */
export function Sand({ time, calm }: { time: React.RefObject<number>; calm: boolean }) {
  const uniforms = useMemo(() => ({ clock: { value: 0 } }), []);
  useFrame(() => { uniforms.clock.value = calm ? 0 : time.current; });
  return <mesh rotation={[-Math.PI/2,0,0]} position={[0,-2.45,0]}>
    <planeGeometry args={[40,40]} />
    <shaderMaterial uniforms={uniforms} vertexShader={`varying vec2 uvSand; void main(){uvSand=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
      fragmentShader={`varying vec2 uvSand; uniform float clock;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){
        vec2 p=uvSand*70.; float t=clock*.22;
        vec2 q=p+vec2(sin(p.y*.8+t),cos(p.x*.7-t))*.65;
        float a=abs(sin(q.x+sin(q.y*1.3+t))*.65+cos(q.y-t)*.35);
        float b=abs(cos(q.x*.83-t)*.6+sin(q.y*1.2+t)*.4);
        float light=pow(1.-min(a,b),18.);
        float grain=hash(floor(uvSand*2600.));
        vec3 sand=mix(vec3(.20,.29,.26),vec3(.49,.49,.36),grain*.28+.48);
        sand+=vec3(.28,.38,.25)*light*.6;
        float depth=smoothstep(.36,.65,uvSand.y);
        gl_FragColor=vec4(mix(sand,vec3(.035,.14,.16),depth*.65),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`} />
  </mesh>;
}

export function WaterSurface({ time, calm }: { time: React.RefObject<number>; calm: boolean }) {
  const geometry = useMemo(() => new T.PlaneGeometry(14,10,36,26), []);
  useEffect(() => () => geometry.dispose(),[geometry]);
  useFrame(() => {
    const p=geometry.attributes.position, t=calm ? 0 : time.current;
    for(let i=0;i<p.count;i++) p.setZ(i,Math.sin(p.getX(i)*2+t*.7)*.025+Math.cos(p.getY(i)*2.8-t*.5)*.018);
    p.needsUpdate=true; geometry.computeVertexNormals();
  });
  return <mesh geometry={geometry} rotation={[Math.PI/2,0,0]} position={[0,2.65,-1]}>
    <meshPhysicalMaterial color="#73C4BF" transparent opacity={0.18} roughness={0.15} metalness={0.15} side={T.DoubleSide} depthWrite={false} />
  </mesh>;
}

export function Gravel({ low }: { low: boolean }) {
  const geometry=useMemo(()=>new T.IcosahedronGeometry(1,0),[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <group>{Array.from({length:low?22:55},(_,i)=>{
    const n=Math.sin(i*127.1)*43758.5453, r=n-Math.floor(n);
    return <mesh key={i} geometry={geometry} position={[Math.sin(i*2.39)*4.7,-2.42+0.04*r,Math.cos(i*1.71)*2.8]} scale={[.035+r*.09,.025+r*.04,.04+r*.06]} rotation={[i,i*.7,0]}><meshStandardMaterial color={i%3===0?'#9B9D80':i%3===1?'#657F75':'#435E59'} roughness={0.95} /></mesh>;
  })}</group>;
}
