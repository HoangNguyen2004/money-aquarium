import React, { Suspense, lazy, useState } from 'react';
import { Pressable, View } from 'react-native';
import { AquariumView } from './AquariumView';
import { Text } from '../../components/ui';
import { C } from '../../theme';

export type AquariumProps = React.ComponentProps<typeof AquariumView> & { health?: number; goalStages?: Record<string,number>; lead?: React.ReactNode };
const ThreeAquarium = lazy(()=>import('./three/ThreeAquarium'));
class SceneBoundary extends React.Component<{ children: React.ReactNode; onFallback:()=>void }, { failed: boolean }> {
  state = { failed:false };
  static getDerivedStateFromError() { return {failed:true}; }
  componentDidCatch() { this.props.onFallback(); }
  render() { return this.state.failed ? null : this.props.children; }
}
export function AquariumExperience({ lead, ...props }: AquariumProps) {
  const [mode,setMode]=useState<'2d'|'3d'>('3d');
  const [fallback,setFallback]=useState(false);
  const effectiveMode = props.placing ? '2d' : mode;
  return <>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:12,gap:8}}>
      {lead ?? <Text style={{fontSize:12,color:C.sub,flexShrink:1}}>{fallback?'Đang dùng hồ 2D trên thiết bị này':effectiveMode==='3d'?'Một góc đại dương của bạn':'Hồ cá 2D'}</Text>}
      <View style={{flexDirection:'row',backgroundColor:C.card,borderRadius:999,padding:3,boxShadow:`0 2px 8px ${C.shadow}`}}>
        {(['2d','3d'] as const).map((m)=>(
          <Pressable key={m} accessibilityRole="button" accessibilityLabel={m==='3d'?'Chuyển 3D':'Chuyển 2D'} onPress={()=>{setFallback(false);setMode(m);}} style={{paddingHorizontal:14,paddingVertical:7,borderRadius:999,backgroundColor:mode===m?C.primary:'transparent'}}>
            <Text style={{fontSize:13,fontWeight:'700',color:mode===m?'#fff':C.sub}}>{m.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
    </View>
    {effectiveMode==='3d' ? <SceneBoundary onFallback={()=>{setFallback(true);setMode('2d');}}><Suspense fallback={<Text style={{padding:24,color:C.sub}}>Đang chuẩn bị hồ cá…</Text>}><ThreeAquarium {...props} /></Suspense></SceneBoundary> : <AquariumView {...props} />}
  </>;
}
