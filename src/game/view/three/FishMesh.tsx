import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as T from 'three';
import type { Fish } from '../../sim/fish';
import { profileOf } from '../../species';

function bodyGeometry(id: string) {
  const geometry = new T.BufferGeometry();
  const positions: number[] = [], colors: number[] = [], indices: number[] = [];
  const color = new T.Color(), segments = 32, rings = 32;
  for (let i = 0; i <= rings; i++) {
    const u = i / rings, x = -0.88 + u * 1.7;
    const puffer = id === 'fish-puffer';
    const radius = Math.pow(Math.sin(Math.PI * u), puffer ? 0.55 : 0.72) * (puffer ? 0.64 : 0.48) * (puffer ? 1 : 1.18 - u * 0.6);
    for (let j = 0; j <= segments; j++) {
      const angle = j / segments * Math.PI * 2;
      const y = Math.cos(angle) * radius, z = Math.sin(angle) * radius * (puffer ? 0.85 : 0.6);
      positions.push(x, y, z);
      const top = (Math.cos(angle) + 1) / 2;
      if (id === 'fish-clown') {
        const band = [0.23, 0.52, 0.81].some((b) => Math.abs(u-b) < 0.055);
        const edge = !band && [0.23, 0.52, 0.81].some((b) => Math.abs(u-b) < 0.077);
        color.set(band ? '#FFF5DB' : edge ? '#283637' : '#EE863E');
      } else if (puffer) {
        const dot = Math.sin(u*85 + Math.floor(angle*6)*2) * Math.cos(angle*18) > 0.66 && top > 0.42;
        color.set(dot ? '#526C46' : top < 0.4 ? '#F5E6BD' : '#B5B576');
      } else {
        const scale = Math.pow(Math.abs(Math.sin(u*110 + Math.floor(j/3)*1.4)), 12) * 0.12;
        color.setHSL(0.105 - u*0.012, 0.72, 0.58 + (1-top)*0.12 - scale);
      }
      color.multiplyScalar(0.78 + top*0.25);
      colors.push(color.r,color.g,color.b);
      if (i < rings && j < segments) {
        const a = i*(segments+1)+j, b = a+segments+1;
        indices.push(a,a+1,b,b,a+1,b+1);
      }
    }
  }
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors,3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

function Fin({ points, color, opacity = 0.75 }: { points: [number,number][]; color: string; opacity?: number }) {
  const geometry = useMemo(() => {
    const shape = new T.Shape(); points.forEach(([x,y],i) => i ? shape.lineTo(x,y) : shape.moveTo(x,y)); shape.closePath();
    return new T.ShapeGeometry(shape,12);
  }, [points]);
  return <mesh geometry={geometry}><meshStandardMaterial color={color} side={T.DoubleSide} transparent opacity={opacity} roughness={0.4} metalness={0.12} depthWrite={false} /></mesh>;
}
const TAIL: [number,number][] = [[0,0],[0.4,0.16],[0.9,0.54],[0.77,0.05],[0.94,-0.5],[0.38,-0.19]];
const DORSAL: [number,number][] = [[-0.46,0.25],[-0.2,0.76],[0.12,0.82],[0.46,0.22]];
const PECTORAL: [number,number][] = [[0,0],[0.3,-0.3],[0.45,-0.32],[0.31,0.08]];

function Eye({ position }: { position: [number,number,number] }) {
  return <group position={position}><mesh><sphereGeometry args={[0.09,12,10]} /><meshStandardMaterial color="#F3E7C2" roughness={0.25} /></mesh><mesh position={[-0.025,0.006,position[2] > 0 ? 0.058 : -0.058]}><sphereGeometry args={[0.058,12,10]} /><meshStandardMaterial color="#08232D" roughness={0.05} metalness={0.2} /></mesh></group>;
}
function Stroke({ points, color, radius = 0.009 }: { points: T.Vector3[]; color: string; radius?: number }) {
  const geo = useMemo(() => new T.TubeGeometry(new T.CatmullRomCurve3(points),20,radius,4,false),[points,radius]);
  return <mesh geometry={geo}><meshStandardMaterial color={color} roughness={0.55} /></mesh>;
}

export function FishMesh({ fish, days, paused, calm, time, goalStage, selected, onSelect }: {
  fish: Fish; days: number; paused: boolean; calm: boolean; time: React.RefObject<number>; goalStage?: number; selected: boolean; onSelect: () => void;
}) {
  const root = useRef<T.Group>(null), tail = useRef<T.Group>(null), left = useRef<T.Group>(null), right = useRef<T.Group>(null);
  const profile = profileOf(fish.id);
  const geometry = useMemo(() => bodyGeometry(fish.id),[fish.id]);
  const turtle = fish.id === 'fish-turtle', shrimp = fish.id === 'fish-shrimp';
  const size = days >= 7 ? 0.95 : days >= 3 ? 0.82 : 0.72;
  const yaw = useRef(0);
  const finColor = (goalStage??0)>=2 ? '#9ADCCF' : fish.id === 'fish-clown' ? '#EEA45D' : fish.id === 'fish-puffer' ? '#DBD59E' : '#F5D69D';
  useFrame((_,dt) => {
    if (!root.current) return;
    const f = fish, phase = profile.phase;
    root.current.position.set((f.x-90)/22, (50-f.y)/19, Math.sin(phase)*0.75);
    const desired = f.face === 1 ? Math.PI : 0;
    let diff = Math.atan2(Math.sin(desired-yaw.current),Math.cos(desired-yaw.current));
    if (!paused) yaw.current += diff*(1-Math.exp(-dt*5));
    root.current.rotation.set(0,yaw.current, Math.atan2(-f.vy,Math.max(5,Math.abs(f.vx)))*0.18*(f.face===1?-1:1));
    const t = calm ? phase : time.current * profile.cadence + phase;
    if (tail.current) tail.current.rotation.y = Math.sin(t)*0.28;
    if (left.current) left.current.rotation.x = Math.sin(t+0.7)*(turtle?0.45:0.3);
    if (right.current) right.current.rotation.x = Math.sin(t+2.8)*(turtle?0.45:0.3);
  });
  return <group ref={root} scale={size} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
    {selected || (goalStage ?? 0) >= 3 ? <mesh rotation={[-Math.PI/2,0,0]} position={[0,-0.75,0]}><ringGeometry args={[0.75,0.8,48]} /><meshBasicMaterial color={(goalStage ?? 0)>=3 ? '#FFDB86' : '#8CDED4'} transparent opacity={0.65} side={T.DoubleSide} /></mesh> : null}
    {turtle ? <>
      <mesh scale={[0.92,0.46,0.7]}><sphereGeometry args={[1,24,18]} /><meshStandardMaterial color="#468772" roughness={0.45} metalness={0.15} /></mesh>
      <mesh position={[0,0.08,0]} scale={[0.8,0.46,0.63]}><sphereGeometry args={[1,20,14]} /><meshStandardMaterial color="#76A17C" wireframe roughness={0.5} /></mesh>
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
      <mesh geometry={geometry}><meshStandardMaterial vertexColors roughness={0.34} metalness={0.13} /></mesh>
      <Eye position={[-0.6,0.16,fish.id==='fish-puffer'?0.4:0.24]} /><Eye position={[-0.6,0.16,fish.id==='fish-puffer'?-0.4:-0.24]} />
      <group ref={tail} position={[0.74,0,0]} scale={(fish.id==='fish-gold' ? (days>=7 ? 1 : 0.72) : 0.65)*((goalStage??0)>=1?1.12:1)}>
        <Fin points={TAIL} color={finColor} />
        <group rotation={[0,0.24,0]}><Fin points={TAIL} color={finColor} opacity={0.4} /></group>
        {[-0.35,-0.18,0,0.18,0.35].map(y => <Stroke key={y} points={[new T.Vector3(0,0,0.01),new T.Vector3(0.4,y*0.4,0.015),new T.Vector3(0.82,y,0.015)]} color="#FFF1CF" radius={0.005} />)}
      </group>
      <group scale={fish.id==='fish-puffer'?0.5:1}><Fin points={DORSAL} color={finColor} opacity={0.65} /></group>
      <group ref={left} position={[-0.23,-0.06,0.3]} rotation={[0,0.4,0]}><Fin points={PECTORAL} color={finColor} /></group>
      <group ref={right} position={[-0.23,-0.06,-0.3]} rotation={[0,-0.4,0]}><Fin points={PECTORAL} color={finColor} /></group>
    </>}
  </group>;
}
