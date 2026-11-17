import { Sand, WaterSurface, Gravel } from './Underwater';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PixelRatio, View } from 'react-native';
import { useFrame, useThree } from '@react-three/fiber';
import * as T from 'three';
import { Canvas } from './CanvasHost';
import { FishMesh } from './FishMesh';
import { newTank, syncFish, feed, poke, stepTank, type Tank } from '../../sim/fish';
import { useCalm } from '../kit';
import { Button, Text } from '../../../components/ui';
import { C } from '../../../theme';
import type { AquariumProps } from '../AquariumExperience';

function CameraRig({ angle, selected, tank }: { angle: number; selected: string | null; tank: Tank }) {
  const { camera, size } = useThree();
  const target = useMemo(() => new T.Vector3(),[]);
  const look = useMemo(() => new T.Vector3(),[]);
  useFrame((_,dt) => {
    const fish = selected ? tank.fish.find((f)=>f.id===selected) : undefined;
    const x = fish ? (fish.x-90)/22 : 0;
    const y = fish ? (50-fish.y)/19 : -0.1;
    const distance = (fish ? 5.4 : 10.8)*Math.max(1,size.height/size.width);
    target.set(Math.sin(angle)*3 + x,fish ? y+.35 : .8,distance);
    camera.position.lerp(target,1-Math.exp(-dt*2));
    target.set(x,y,0);
    look.lerp(target,1-Math.exp(-dt*3));
    camera.lookAt(look);
  });
  return null;
}
function Plants({ calm, time, low }: { calm: boolean; time: React.RefObject<number>; low: boolean }) {
  const group = useRef<T.Group>(null);
  useFrame(() => { group.current?.children.forEach((leaf,i) => { leaf.rotation.z = calm ? 0 : Math.sin(time.current*(0.45+(i%3)*0.08)+i*1.7)*0.09; leaf.rotation.x = calm ? 0 : Math.cos(time.current*.35+i)*.055; }); });
  const shape = useMemo(() => { const s = new T.Shape(); s.moveTo(0,0);s.bezierCurveTo(-0.4,0.8,0.3,1.8,0.15,2.5);s.bezierCurveTo(0.6,1.3,0.3,0.5,0,0);return new T.ShapeGeometry(s,16); },[]);
  return <group ref={group}>{Array.from({length:low?10:18},(_,i) => <group key={i} position={[(i%2 ? -1 : 1)*(2.7+(i%4)*0.23),-2.4,-1.2+(i%3)*0.6]} rotation={[0,i*0.65,0]} scale={0.5+(i%4)*0.2}><mesh geometry={shape}><meshStandardMaterial color={i%2?'#367B70':'#266D69'} side={T.DoubleSide} roughness={0.5} /></mesh></group>)}</group>;
}
function Particles({ calm, time, low }: { calm: boolean; time: React.RefObject<number>; low: boolean }) {
  const points = useRef<T.Points>(null);
  const count = low ? 30 : 70;
  const base = useMemo(()=>Array.from({length:count},(_,i)=>[(Math.sin(i*12.98)*0.5+0.5)*8-4,(i/count)*6-3,Math.cos(i*7.3)*2]),[count]);
  const position = useMemo(()=>new Float32Array(base.flat()),[base]);
  useFrame(()=>{
    if (!points.current || calm) return;
    const p = points.current.geometry.attributes.position;
    for(let i=0;i<count;i++) p.setY(i,((base[i][1]+3+time.current*(0.04+(i%3)*0.01))%6)-3);
    p.needsUpdate=true;
  });
  return <points ref={points}><bufferGeometry><bufferAttribute attach="attributes-position" args={[position,3]} /></bufferGeometry><pointsMaterial size={0.025} color="#D3F3E6" transparent opacity={0.3} depthWrite={false} /></points>;
}
function Quality({ low }: { low: boolean }) {
  const { gl } = useThree();
  useEffect(()=> { gl.setPixelRatio(low ? 1 : Math.min(1.5,PixelRatio.get())); },[gl,low]);
  return null;
}
function Food({ tank }: { tank: Tank }) {
  const mesh = useRef<T.InstancedMesh>(null);
  const dummy = useMemo(()=>new T.Object3D(),[]);
  useFrame(()=>{ if(!mesh.current)return; mesh.current.count = tank.food.length; tank.food.forEach((p,i)=> {dummy.position.set((p.x-90)/22,(50-p.y)/19,0.15);dummy.scale.setScalar(1);dummy.updateMatrix();mesh.current!.setMatrixAt(i,dummy.matrix);});mesh.current.instanceMatrix.needsUpdate=true; });
  return <instancedMesh ref={mesh} args={[undefined,undefined,18]}><sphereGeometry args={[0.036,6,5]} /><meshStandardMaterial color="#D9A261" /></instancedMesh>;
}
function WorldScene({ tank, time, paused, calm, low, angle, selected, onSelect, care, goalStages, health, decor, placed, customFish }: {
  tank: Tank; time: React.RefObject<number>; paused: boolean; calm: boolean; low: boolean; angle: number; selected: string|null; onSelect: (id:string)=>void;
  customFish: AquariumProps['customFish']; care: AquariumProps['care']; goalStages: AquariumProps['goalStages']; health: number; decor: string[]; placed: AquariumProps['placed'];
}) {
  useFrame((_,delta)=> { if(paused)return; const dt=Math.min(delta,0.05); time.current+=dt; stepTank(tank,dt); });
  return <>
    <color attach="background" args={[health < 0.8 ? '#1C4655' : '#104652']} />
    <fog attach="fog" args={['#104652',10,24]} />
    <ambientLight intensity={0.35} color="#A0D7CF" />
    <hemisphereLight args={['#C3EFE1','#234D59',0.85]} />
    <directionalLight position={[-3,6,5]} intensity={2.1} color="#F9E5BB" />
    <pointLight position={[3,1,1]} color="#4DB8B5" intensity={12} distance={12} />
    <Quality low={low} /><CameraRig angle={angle} selected={selected} tank={tank} />
    <Sand time={time} calm={calm} /><Gravel low={low} /><WaterSurface time={time} calm={calm} />
    <mesh position={[0,0,-4]}><planeGeometry args={[20,12]} /><meshStandardMaterial color="#0C3949" roughness={1} /></mesh>
    {[-3.5,-1.9,0.5,3.8].map((x,i)=><mesh key={x} position={[x,0.5,-2-i*0.2]} rotation={[0,0,-0.17]}><coneGeometry args={[0.65,8,8,1,true]} /><meshBasicMaterial color="#C5F5DE" transparent opacity={0.025} side={T.DoubleSide} depthWrite={false} /></mesh>)}
    {[-3.5,-2.7,2.8,3.6].map((x,i)=><mesh key={x} position={[x,-2.2,-1.4+(i%2)*0.3]} rotation={[0,i,0]} scale={[0.6+(i%2)*0.4,0.3+(i%3)*0.1,0.5]}><dodecahedronGeometry args={[1,1]} /><meshStandardMaterial color={i%2?'#597F79':'#426D6D'} roughness={0.9} /></mesh>)}
    {decor.includes('rock') ? <mesh position={[((placed.rock?.x??22)-90)/22,-2.17,0.5]} scale={[0.6,0.42,0.5]}><dodecahedronGeometry args={[1,1]} /><meshStandardMaterial color="#9BB3A2" roughness={0.85} /></mesh> : null}
    {decor.includes('lotus') ? <group position={[((placed.lotus?.x??128)-90)/22,2.2,-0.6]}>{Array.from({length:7},(_,i)=><mesh key={i} rotation={[0,i*Math.PI/3.5,0.5]} position={[Math.sin(i)*0.15,0,Math.cos(i)*0.15]} scale={[0.13,0.24,0.1]}><sphereGeometry args={[1,12,10]} /><meshStandardMaterial color="#F6D1BA" roughness={0.5} /></mesh>)}</group> : null}
    <Plants calm={calm} time={time} low={low} /><Particles calm={calm} time={time} low={low} /><Food tank={tank} />
    {tank.fish.map(f=><FishMesh key={f.id} fish={f} custom={customFish?.find(c=>c.id===f.id)} time={time} days={care?.[f.id]?.days??0} paused={paused} calm={calm} goalStage={goalStages?.[f.id]} selected={selected===f.id} onSelect={()=>{poke(tank,f.id);onSelect(f.id);}} />)}
  </>;
}

export default function ThreeAquarium(props: AquariumProps) {
  const tank = useRef(newTank()).current;
  const time = useRef(0);
  const calm = useCalm();
  const [paused,setPaused] = useState(false), [low,setLow]=useState(false), [angle,setAngle]=useState(0);
  const [selected,setSelected]=useState<string|null>(null);
  const [ready,setReady]=useState(false);
  // Populate before the first frame, then preserve the existing mutable fish between prop updates.
  syncFish(tank,props.fish);
  const key = props.fish.join(',');
  useEffect(()=>{syncFish(tank,props.fish); if(selected && !props.fish.includes(selected))setSelected(null);},[key,tank,selected]);
  useEffect(()=>{if(props.feedTick)feed(tank);},[props.feedTick,tank]);
  return <View style={{ width:'100%', maxWidth:620, alignSelf:'center' }}>
    <View testID={ready?"aquarium-3d-ready":"aquarium-3d"} accessibilityLabel="Hồ cá 3D tương tác" style={{ height:460, borderRadius:28, overflow:'hidden', marginTop:14, backgroundColor:'#104652' }}>
      <Canvas camera={{ position:[0,0.8,8.8],fov:46 }} gl={{ antialias:true, alpha:false, powerPreference:'low-power', toneMapping:T.ACESFilmicToneMapping, toneMappingExposure:1.15 }} onCreated={()=>setReady(true)}>
        <WorldScene tank={tank} time={time} paused={paused} calm={calm} low={low} angle={angle} selected={selected} onSelect={(id)=>{setSelected(id);props.onFish(id);}} customFish={props.customFish} care={props.care} goalStages={props.goalStages} health={props.health??1} decor={props.decor} placed={props.placed} />
      </Canvas>
      {!ready ? <View pointerEvents="none" style={{position:'absolute',inset:0,alignItems:'center',justifyContent:'center'}}><Text style={{color:'#D6E8DF'}}>Đang mở hồ cá…</Text></View> : null}
      <View pointerEvents="box-none" style={{ position:'absolute',left:14,right:14,bottom:14,flexDirection:'row',gap:8,justifyContent:'center' }}>
        <Button label="←" kind="soft" onPress={()=>setAngle(a=>Math.max(-0.65,a-0.2))} style={{backgroundColor:'#ECF4E5DD',minWidth:44}} />
        <Button label="Góc ban đầu" kind="soft" onPress={()=>{setAngle(0);setSelected(null);}} style={{backgroundColor:'#ECF4E5DD'}} />
        <Button label="→" kind="soft" onPress={()=>setAngle(a=>Math.min(0.65,a+0.2))} style={{backgroundColor:'#ECF4E5DD',minWidth:44}} />
      </View>
    </View>
    <View style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:10,flexWrap:'wrap'}}>
      <Text style={{color:C.sub,fontSize:12,flex:1}}>{props.fish.length} cư dân · Chạm cá để xem</Text>
      <Button label={low?'Chi tiết':'Nhẹ máy'} kind="soft" onPress={()=>setLow(v=>!v)} />
      <Button label={paused?'Tiếp tục':'Tạm dừng'} kind="soft" onPress={()=>setPaused(v=>!v)} />
    </View>
    <View style={{flexDirection:'row',gap:6,flexWrap:'wrap',marginTop:10}}>{props.fish.map(id=><Button key={id} label={props.names[id] || id} kind="soft" onPress={()=>{setSelected(id);props.onFish(id);}} />)}</View>
  </View>;
}
