import React, { Suspense, lazy, useState } from 'react';
import { View } from 'react-native';
import { AquariumView } from './AquariumView';
import { Button, Text } from '../../components/ui';
import { C } from '../../theme';

export type AquariumProps = React.ComponentProps<typeof AquariumView> & { health?: number; goalStages?: Record<string,number> };
const ThreeAquarium = lazy(()=>import('./three/ThreeAquarium'));
class SceneBoundary extends React.Component<{ children: React.ReactNode; onFallback:()=>void }, { failed: boolean }> {
  state = { failed:false };
  static getDerivedStateFromError() { return {failed:true}; }
  componentDidCatch() { this.props.onFallback(); }
  render() { return this.state.failed ? null : this.props.children; }
}
export function AquariumExperience(props: AquariumProps) {
  const [mode,setMode]=useState<'2d'|'3d'>('3d');
  const [fallback,setFallback]=useState(false);
  const effectiveMode = props.placing ? '2d' : mode;
  return <>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:10}}>
      <Text style={{fontSize:12,color:C.sub}}>{fallback?'Đang dùng hồ 2D trên thiết bị này':effectiveMode==='3d'?'Một góc đại dương của bạn':'Hồ cá 2D'}</Text>
      <Button label={mode==='3d'?'Chuyển 2D':'Chuyển 3D'} kind="soft" onPress={()=>{setFallback(false);setMode(mode==='3d'?'2d':'3d');}} />
    </View>
    {effectiveMode==='3d' ? <SceneBoundary onFallback={()=>{setFallback(true);setMode('2d');}}><Suspense fallback={<Text style={{padding:24,color:C.sub}}>Đang chuẩn bị hồ cá…</Text>}><ThreeAquarium {...props} /></Suspense></SceneBoundary> : <AquariumView {...props} />}
  </>;
}
