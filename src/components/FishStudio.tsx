import { AquariumExperience } from '../game/view/AquariumExperience';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View, type ViewStyle, type GestureResponderEvent } from 'react-native';
import { Button, Card, Text, TextInput, confirm, notify } from './ui';
import { CustomFishArt } from './CustomFishArt';
import { C } from '../theme';
import { FISH_COLORS, validCustomFish, type CustomFish, type FishStroke } from '../game/customFish';
import { saveCustomFish, deleteCustomFish, toggleCustomFish, useStore } from '../store';

export function FishStudio({ onPond }: { onPond: () => void }) {
  const { customFish } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [base, setBase] = useState(FISH_COLORS[0]);
  const [ink, setInk] = useState(FISH_COLORS[1]);
  const [width, setWidth] = useState(10);
  const [eraser, setEraser] = useState(false);
  const [preview, setPreview] = useState(false);
  const [strokes, setStrokes] = useState<FishStroke[]>([]);
  const [redo, setRedo] = useState<FishStroke[]>([]);
  const [active, setActive] = useState<FishStroke | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState('');
  useEffect(() => { let alive=true; AsyncStorage.getItem('aquarium:fish-draft').then(raw => {
    if (!alive || !raw) return;
    try { const f=JSON.parse(raw); if(validCustomFish(f)) { setName(f.name); setBase(f.color); setStrokes(f.strokes); setEditing(f.id === 'custom-draft' ? null : f.id); setDraftStatus('Đã khôi phục bản nháp'); } } catch {}
  }).catch(()=>{}).finally(()=>{if(alive)setDraftReady(true);}); return()=>{alive=false;}; },[]);
  useEffect(() => {
    if(!draftReady)return;
    const timer=setTimeout(()=>{ AsyncStorage.setItem('aquarium:fish-draft',JSON.stringify({id:editing??'custom-draft',name,color:base,strokes,inPond:true})).then(()=>setDraftStatus('Đã lưu bản nháp trên thiết bị')).catch(()=>setDraftStatus('Không lưu được bản nháp. Bộ nhớ thiết bị có thể đã đầy.')); },500);
    return()=>clearTimeout(timer);
  },[draftReady,editing,name,base,strokes]);
  const drawing = useRef<FishStroke | null>(null);
  const canvasWidth = useRef(320);
  const point = (e: GestureResponderEvent): [number, number] => [Math.round(Math.max(0, Math.min(320, e.nativeEvent.locationX / canvasWidth.current * 320))), Math.round(Math.max(0, Math.min(200, e.nativeEvent.locationY / canvasWidth.current * 320)))];
  function finish() { const s = drawing.current; drawing.current = null; setActive(null); if (s) { setStrokes(prev => [...prev, s]); setRedo([]); } }
  function reset() { setPreview(false); setEditing(null); setName(''); setStrokes([]); setRedo([]); setBase(FISH_COLORS[0]); setActive(null); drawing.current = null; }
  function edit(f: CustomFish) { setEditing(f.id); setName(f.name); setBase(f.color); setStrokes(f.strokes); setRedo([]); setActive(null); drawing.current = null; }
  const draft = { color: base, strokes: active ? [...strokes, active] : strokes };
  if (!draftReady) return <Text style={{ padding: 24 }}>Đang mở xưởng vẽ…</Text>;
  return <View style={{ gap: 14, marginTop: 16, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
    <Text style={{ fontSize: 22, fontWeight: '500' }}>Xưởng vẽ cá</Text>
    <Text style={{ color: C.sub, lineHeight: 21 }}>Vẽ bằng ngón tay hoặc chuột. Nét vẽ được giữ trong khung cá; mắt và miệng luôn ở phía trên.</Text>
    <Card style={{ gap: 12 }}>
      <Text style={{ color: C.sub, fontSize: 12 }} accessibilityLiveRegion="polite">{draftStatus}</Text>
      <Text>Tên cá</Text>
      <TextInput accessibilityLabel="Tên cá sáng tạo" placeholder="Ví dụ: Cá Mây" maxLength={24} value={name} onChangeText={setName} style={{ borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12 }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[4,10,22].map(n => <Button key={n} label={`${width === n ? '✓ ' : ''}${n === 4 ? 'Mảnh' : n === 10 ? 'Vừa' : 'Dày'}`} kind="soft" onPress={() => setWidth(n)} />)}
        <Button label={eraser ? 'Bút vẽ' : '✓ Bút vẽ'} kind="soft" onPress={() => setEraser(false)} />
        <Button label={eraser ? '✓ Tẩy' : 'Tẩy'} kind="soft" onPress={() => setEraser(!eraser)} />
        <Button label="Hoàn tác" kind="soft" disabled={!strokes.length} onPress={() => { setRedo([...redo, strokes[strokes.length-1]]); setStrokes(strokes.slice(0,-1)); }} />
        <Button label="Làm lại nét" kind="soft" disabled={!redo.length} onPress={() => { setStrokes([...strokes, redo[redo.length-1]]); setRedo(redo.slice(0,-1)); }} />
        <Button label="Xoá nét vẽ" kind="soft" disabled={!strokes.length} onPress={() => confirm('Xoá các nét vẽ?', 'Giữ lại khung và màu thân cá.', () => { setStrokes([]); setRedo([]); }, 'Xoá nét')} />
      </View>
      <View testID="fish-drawing-canvas" accessibilityLabel="Khung vẽ cá" onLayout={e => { canvasWidth.current = e.nativeEvent.layout.width; }} style={{ width: '100%', aspectRatio: 1.6, backgroundColor: '#EDF5F2', borderRadius: 16, overflow: 'hidden', touchAction: 'none' } as ViewStyle & { touchAction: string }}
        onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderTerminationRequest={() => false}
        onResponderGrant={e => { if (strokes.length >= 160) return notify('Đã đạt giới hạn nét', 'Hoàn tác hoặc xoá bớt nét để vẽ tiếp.'); const s = { erase: eraser, color: ink, width, points: [point(e)] }; drawing.current = s; setActive(s); }}
        onResponderMove={e => { const s = drawing.current; if (!s || s.points.length >= 600) return; const p = point(e); const last = s.points[s.points.length - 1]; if (Math.hypot(p[0]-last[0], p[1]-last[1]) < 1) return; const next = { ...s, points: [...s.points, p] }; drawing.current = next; setActive(next); }}
        onResponderRelease={finish} onResponderTerminate={finish}>
        <View pointerEvents="none" style={{ flex: 1 }}><CustomFishArt fish={draft} /></View>
      </View>
      <Text>Màu thân cá</Text><Palette value={base} onChange={setBase} label="Màu thân" />
      <Text>Màu bút</Text><Palette value={ink} onChange={c => { setInk(c); setEraser(false); }} label="Màu bút" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text>Màu riêng</Text><TextInput key={ink} defaultValue={ink} maxLength={7} autoCapitalize="characters" accessibilityLabel="Mã màu bút" placeholder="#55B9A4" onEndEditing={e => { const c=e.nativeEvent.text.trim(); if (/^#[0-9a-f]{6}$/i.test(c)) { setInk(c); setEraser(false); } else notify('Mã màu chưa đúng', 'Nhập dấu # và 6 ký tự màu, ví dụ #55B9A4.'); }} style={{ flex: 1, minHeight: 44, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 10 }} /></View>
      <Text style={{ color: C.sub, fontSize: 12 }}>Tẩy xoá màu vẽ và giữ đúng màu thân khi đổi nền. Tối đa 160 nét mỗi cá · 12 cá cá nhân hoá.</Text>
      <Button label={preview ? 'Đóng xem thử 3D' : 'Xem thử cá trong hồ 3D'} kind="soft" onPress={() => setPreview(!preview)} />
      {preview ? <AquariumExperience fish={['custom-preview']} customFish={[{ ...draft, id: 'custom-preview', name: name || 'Cá của bạn', inPond: true }]} decor={[]} names={{ 'custom-preview': name || 'Cá của bạn' }} placed={{}} care={{'custom-preview':{days:7,lastFed:''}}} feedTick={0} placing={null} onPlaced={() => {}} onFish={() => {}} /> : null}
      <Button label={editing ? 'Lưu thay đổi' : 'Lưu và thả cá vào hồ'} onPress={() => { if (!name.trim()) return notify('Thiếu tên cá', 'Hãy đặt tên cho chú cá của bạn.'); const why = saveCustomFish({ id: editing ?? '', name: name.trim(), color: base, strokes, inPond: editing ? customFish.find(f => f.id === editing)?.inPond ?? true : true }); if (why) return notify('Chưa lưu được', why); reset(); onPond(); }} />
      {editing ? <Button label="Tạo cá khác" kind="soft" onPress={() => confirm('Tạo cá khác?', 'Các thay đổi chưa lưu sẽ bị bỏ.', reset, 'Tạo cá')} /> : null}
    </Card>
    <Text style={{ fontSize: 18, fontWeight: '500' }}>Cá của bạn · {customFish.length}/12</Text>
    {!customFish.length ? <Text style={{ color: C.sub }}>Chú cá đầu tiên đang chờ nét vẽ của bạn.</Text> : null}
    {customFish.map(f => <Card key={f.id} style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ width: 100, height: 64 }}><CustomFishArt fish={f} /></View><View style={{ flex: 1 }}><Text style={{ fontWeight: '500' }}>{f.name}</Text><Text style={{ color: C.sub, fontSize: 12 }}>{f.inPond ? 'Đang bơi trong hồ' : 'Đang ở bộ sưu tập'}</Text></View></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}><Button label="Sửa cá" kind="soft" onPress={() => { if (strokes.length || name) confirm('Mở cá để sửa?', 'Bản vẽ chưa lưu hiện tại sẽ bị bỏ.', () => edit(f), 'Mở cá'); else edit(f); }} /><Button label={f.inPond ? 'Cất cá' : 'Thả cá'} kind="soft" onPress={() => toggleCustomFish(f.id)} /><Button label="Xoá cá" kind="soft" onPress={() => confirm(`Xoá ${f.name}?`, 'Cá và nét vẽ sẽ bị xoá khỏi thiết bị.', () => { deleteCustomFish(f.id); if (editing === f.id) reset(); }, 'Xoá cá')} /></View>
    </Card>)}
  </View>;
}
function Palette({ value, onChange, label }: { value: string; onChange: (c: string) => void; label: string }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{FISH_COLORS.map(c => <Pressable key={c} accessibilityRole="button" accessibilityLabel={`${label} ${c}`} accessibilityState={{ selected: value === c }} onPress={() => onChange(c)} style={{ width: 44, height: 44, padding: 5, borderWidth: 2, borderColor: value === c ? C.primary : C.line, borderRadius: 22 }}><View style={{ flex: 1, borderRadius: 18, backgroundColor: c }} /></Pressable>)}</View>;
}
