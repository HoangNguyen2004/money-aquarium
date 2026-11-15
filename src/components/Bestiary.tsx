import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { C, R } from '../theme';
import { CATALOG, type Rarity } from '../game/catalog';
import { useStore } from '../store';
import { Icon as FishIcon } from '../game/view/kit';
import type { AssetId } from '../game/view/assets';
import { Card, Icon, SectionTitle, Text } from './ui';

export function Bestiary() {
  const {game} = useStore();
  const [filter,setFilter]=useState<Rarity|'all'>('all');
  const owned = CATALOG.filter(i=>game.items.includes(i.id)).length;
  return <>
    <SectionTitle>Sổ tay đại dương</SectionTitle>
    <Text style={{color:C.sub,lineHeight:21,marginBottom:12}}>{owned}/20 loài đã có · Tép anh đào của bạn vẫn được giữ trong kho. Những loài có nhãn “Sắp đến” chưa mở trong phiên bản này.</Text>
    <View style={{flexDirection:'row',gap:6,flexWrap:'wrap',marginBottom:14}}>{(['all','Common','Rare','Epic','Legendary','Event'] as const).map(r=><Pressable key={r} onPress={()=>setFilter(r)} accessibilityRole="button" accessibilityState={{selected:filter===r}} style={{padding:10,minHeight:44,borderRadius:R.md,backgroundColor:filter===r?C.primarySoft:C.card}}><Text style={{fontSize:12,color:filter===r?C.primary:C.sub}}>{r==='all'?'Tất cả':r==='Event'?'Sự kiện':r}</Text></Pressable>)}</View>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{CATALOG.filter(i=>filter==='all'||i.rarity===filter).map(item=><View key={item.id} testID={`catalog-${item.id}`} style={{width:'48%',flexGrow:1}}><Card style={{gap:8,minHeight:200}}>
      <View style={{height:64,alignItems:'center',justifyContent:'center'}}>{item.playable?<FishIcon id={item.id as AssetId} size={64}/>:<Icon name={item.rarity==='Event'?'alert-circle-outline':'fish-outline'} size={40} color={C.faint}/>}</View>
      <Text style={{fontWeight:'500',fontSize:14}}>{item.name}</Text>
      <Text style={{fontSize:11,color:game.items.includes(item.id)?C.primary:C.sub}}>{item.rarity} · {game.items.includes(item.id)?'Đã có':item.playable?'Có thể mở':'Sắp đến'}</Text>
      <Text style={{fontSize:12,color:C.sub,lineHeight:18}}>{item.condition}</Text>
    </Card></View>)}</View>
  </>;
}
