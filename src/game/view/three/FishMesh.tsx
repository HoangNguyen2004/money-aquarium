import { bodyGeometry, skinTexture, scaleRelief, fishKind } from './fishAnatomy';
import { FishFin } from './FishFin';
import { rasterFish } from '../../fishPaint';
import type { CustomFish } from '../../customFish';
import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as T from 'three';
import type { Fish } from '../../sim/fish';
import { profileOf } from '../../species';

function Fin({ points, color, opacity = 0.75, map }: { map?: T.Texture | null; points: [number,number][]; color: string; opacity?: number }) {
  const geometry = useMemo(() => {
    const shape = new T.Shape(); points.forEach(([x,y],i) => i ? shape.lineTo(x,y) : shape.moveTo(x,y)); shape.closePath();
    const g = new T.ShapeGeometry(shape,12);
    const p = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i=0;i<p.count;i++) uv.setXY(i,(235+p.getX(i)*60)/320,(100-p.getY(i)*108)/200);
    return g;
  }, [points]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry}><meshStandardMaterial map={map} color={map ? "#FFFFFF" : color} side={T.DoubleSide} transparent opacity={opacity} roughness={0.4} metalness={0.12} depthWrite={false} /></mesh>;
}
const TAIL: [number,number][] = [[0,0],[0.4,0.16],[0.9,0.54],[0.77,0.05],[0.94,-0.5],[0.38,-0.19]];

function Eye({ position, size = 1 }: { position: [number,number,number]; size?: number }) {
  const side=position[2]>0?1:-1;
  return <group position={position} scale={size}>
    <mesh scale={[1,1,.55]}><sphereGeometry args={[.068,20,16]} /><meshPhysicalMaterial color="#8E743D" roughness={.28} clearcoat={.6} /></mesh>
    <mesh position={[-.008,0,side*.032]} scale={[.82,1,.32]}><sphereGeometry args={[.046,20,16]} /><meshPhysicalMaterial color="#101B19" roughness={.12} clearcoat={1} clearcoatRoughness={.08} /></mesh>
    <mesh position={[-.018,.019,side*.046]} scale={[1,1,.3]}><sphereGeometry args={[.009,8,6]} /><meshBasicMaterial color="#DCE7DC" /></mesh>
  </group>;
}
function Stroke({ points, color, radius = 0.009 }: { points: T.Vector3[]; color: string; radius?: number }) {
  const geo = useMemo(() => new T.TubeGeometry(new T.CatmullRomCurve3(points),20,radius,4,false),[points,radius]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo}><meshStandardMaterial color={color} roughness={0.55} /></mesh>;
}

export function FishMesh({ fish, custom, days, paused, calm, time, goalStage, selected, onSelect }: {
  fish: Fish; custom?: CustomFish; days: number; paused: boolean; calm: boolean; time: React.RefObject<number>; goalStage?: number; selected: boolean; onSelect: () => void;
}) {
  const root = useRef<T.Group>(null), tail = useRef<T.Group>(null), left = useRef<T.Group>(null), right = useRef<T.Group>(null);
  const profile = profileOf(fish.id);
  const geometry = useMemo(() => bodyGeometry(fish.id, !!custom),[fish.id, !!custom]);
  const texture = useMemo(() => { if (!custom) return skinTexture(fish.id); const t = new T.DataTexture(rasterFish(custom),320,200); t.colorSpace = T.SRGBColorSpace; t.magFilter=T.LinearFilter; t.minFilter=T.LinearFilter; t.needsUpdate=true; return t; }, [custom,fish.id]);
  useEffect(() => () => { texture?.dispose(); }, [texture]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const relief=useMemo(()=>scaleRelief(fish.id),[fish.id]);
  useEffect(()=>()=>relief.dispose(),[relief]);
  const rest = useMemo(() => Float32Array.from(geometry.attributes.position.array), [geometry]);
  const phaseOffset = useMemo(() => [...fish.id].reduce((n,c)=>n+c.charCodeAt(0),0)*0.37,[fish.id]);
  const kind=fishKind(fish.id);
  const mouth=useRef<T.Group>(null);
  const turtle = fish.id === 'fish-turtle', shrimp = fish.id === 'fish-shrimp';
  const size = days >= 7 ? 0.95 : days >= 3 ? 0.82 : 0.72;
  const yaw = useRef(0);
  const finColor = custom?.color ?? ((goalStage??0)>=2 ? '#9ADCCF' : fish.id === 'fish-clown' ? '#DF7D38' : fish.id === 'fish-puffer' ? '#C5C194' : '#EDB35D');
  useFrame((_,dt) => {
    if (!root.current) return;
    const f = fish, phase = profile.phase + phaseOffset;
    root.current.position.set((f.x-90)/22, (50-f.y)/19, Math.sin(phase + (calm ? 0 : time.current*0.18))*1.05);
    const desired = f.face === 1 ? Math.PI : 0;
    let diff = Math.atan2(Math.sin(desired-yaw.current),Math.cos(desired-yaw.current));
    if (!paused) yaw.current += diff*(1-Math.exp(-dt*5));
    root.current.rotation.set(0,yaw.current, Math.atan2(-f.vy,Math.max(5,Math.abs(f.vx)))*0.18*(f.face===1?-1:1));
    const t = calm ? phase : time.current * profile.cadence + phase;
    const amplitude = (kind==='puffer'?.012:.025) + Math.min(.055, Math.hypot(f.vx,f.vy)*.002);
    const p=geometry.attributes.position;
    for(let i=0;i<p.count;i++) { const x=rest[i*3]; p.setZ(i,rest[i*3+2]+Math.sin(t-x*2.5)*amplitude*Math.pow(Math.max(0,(x+.96)/1.92),2)); }
    p.needsUpdate=true;
    geometry.computeVertexNormals();
    if(mouth.current)mouth.current.scale.y=1+Math.sin(t*.55)*.16;
    if (tail.current) { tail.current.rotation.y = Math.sin(t-1.8)*(kind==='puffer'?.15:.24); tail.current.position.z=Math.sin(t-1.8)*amplitude; }
    if (left.current) left.current.rotation.x = Math.sin(t+0.7)*(turtle?0.45:0.3);
    if (right.current) right.current.rotation.x = Math.sin(t+2.8)*(turtle?0.45:0.3);
  });
  return <group ref={root} scale={size} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
    {selected || (goalStage ?? 0) >= 3 ? <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.75,0]}><ringGeometry args={[0.75,0.8,48]} /><meshBasicMaterial color={(goalStage ?? 0)>=3 ? '#FFDB86' : '#8CDED4'} transparent opacity={0.65} side={T.DoubleSide} /></mesh> : null}
    {turtle ? <>
      <mesh scale={[0.92,0.46,0.7]}><sphereGeometry args={[1,24,18]} /><meshStandardMaterial color="#468772" roughness={0.45} metalness={0.15} /></mesh>

      <mesh position={[-1.02,-0.02,0]} scale={[0.4,0.25,0.25]}><sphereGeometry args={[1,20,14]} /><meshStandardMaterial color="#8DB797" roughness={0.45} /></mesh>
      <Eye position={[-1.19,0.08,0.18]} /><Eye position={[-1.19,0.08,-0.18]} />
      <group ref={left} position={[-0.43,-0.16,0]}>{[-1,1].map(s => <mesh key={s} position={[0,0,s*0.72]} rotation={[s*0.4,0,-0.5]} scale={[0.35,0.09,0.58]}><sphereGeometry args={[1,16,10]} /><meshStandardMaterial color="#6FA68A" /></mesh>)}</group>
      <group ref={right} position={[0.54,-0.15,0]}>{[-1,1].map(s => <mesh key={s} position={[0,0,s*0.57]} scale={[0.28,0.08,0.37]}><sphereGeometry args={[1,16,10]} /><meshStandardMaterial color="#63947C" /></mesh>)}</group>
    </> : shrimp ? <>
      {Array.from({length:7},(_,i) => <mesh key={i} position={[-0.68+i*0.25,0.12-Math.pow(i/6,2)*0.5,0]} scale={[0.22,0.3-i*0.017,0.23-i*0.013]}><sphereGeometry args={[1,16,12]} /><meshStandardMaterial color={i%2 ? '#DB816B' : '#E69A7B'} roughness={0.4} /></mesh>)}
      <Eye position={[-0.81,0.3,0.17]} /><Eye position={[-0.81,0.3,-0.17]} />
      {[-1,1].map(s => <Stroke key={s} points={[new T.Vector3(-0.8,0.25,s*0.12),new T.Vector3(-1.25,0.8,s*0.28),new T.Vector3(-1.9,0.7,s*0.4)]} color="#F3C3A4" />)}
      <group ref={left}>{Array.from({length:5},(_,i)=>[-1,1].map(s=><Stroke key={`${i}-${s}`} points={[new T.Vector3(-0.4+i*0.24,-0.08,s*0.14),new T.Vector3(-0.6+i*0.24,-0.5,s*0.3),new T.Vector3(-0.85+i*0.24,-0.58,s*0.45)]} color="#DCB091" />))}</group>
      <group ref={tail} position={[1,-0.4,0]}><Fin points={TAIL} color="#E5A184" /></group>
    </> : <>
      <mesh geometry={geometry}><meshPhysicalMaterial map={texture} bumpMap={custom?null:relief} bumpScale={kind==='puffer'?.004:.012} roughness={.48} metalness={0} clearcoat={.22} clearcoatRoughness={.3} /></mesh>
      {[-1,1].map(side => <Stroke key={side} points={[
        new T.Vector3(-.43,.21,side*(kind==='puffer'?.29:.18)),
        new T.Vector3(-.32,.04,side*(kind==='puffer'?.35:.25)),
        new T.Vector3(-.39,-.18,side*(kind==='puffer'?.29:.20)),
      ]} color={custom?.color ?? (kind==='clown'?'#9E5229':kind==='puffer'?'#797D4A':'#B67730')} radius={.006} />)}
      <Eye position={[-.65,.13,kind==='puffer'?.278:kind==='clown'?.135:.17]} size={kind==='puffer'?1.18:.88} />
      <Eye position={[-.65,.13,kind==='puffer'?-.278:kind==='clown'?-.135:-.17]} size={kind==='puffer'?1.18:.88} />
      <group ref={mouth} position={[-.954,-.025,0]} rotation={[0,Math.PI/2,0]}>
        <mesh scale={[.8,1,.35]}><torusGeometry args={[.038,.009,8,24]} /><meshStandardMaterial color={custom?.color ?? (kind==='puffer'?'#B7B592':'#B9864B')} roughness={.6} /></mesh>
        <mesh position={[0,0,-.005]}><circleGeometry args={[.032,24]} /><meshStandardMaterial color="#453D2B" side={T.DoubleSide} /></mesh>
      </group>
      <group ref={tail} position={[.94,-.018,0]} scale={(days>=7?1:.84)*((goalStage??0)>=1?1.08:1)}>
        <group rotation={[0,kind==='gold'?.13:0,0]}><FishFin id={fish.id} kind="tail" map={custom?texture:null} color={finColor} time={time} calm={calm} /></group>
        {kind==='gold'?<group rotation={[0,-.17,0]} position={[0,0,-.04]}><FishFin id={fish.id} kind="tail" map={custom?texture:null} color={finColor} time={time} calm={calm} /></group>:null}
      </group>
      <FishFin id={fish.id} kind="dorsal" color={finColor} time={time} calm={calm} />
      <group scale={[.82,.76,1]} position={[.14,-.02,0]}><FishFin id={fish.id} kind="anal" color={finColor} time={time} calm={calm} /></group>
      <group ref={left} position={[-.27,-.06,kind==='puffer'?.33:.22]} rotation={[0,-.65,-.22]} scale={kind==='puffer'?.68:.8}><FishFin id={fish.id} kind="pectoral" color={finColor} time={time} calm={calm} /></group>
      <group ref={right} position={[-.27,-.06,kind==='puffer'?-.33:-.22]} rotation={[0,.65,-.22]} scale={kind==='puffer'?.68:.8}><FishFin id={fish.id} kind="pectoral" color={finColor} time={time} calm={calm} /></group>
    </>}
  </group>;
}
