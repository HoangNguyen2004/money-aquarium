// Aquarium Scene: chỉ vẽ. Cá bơi theo sim/fish.ts; file này xếp lớp nước, rong, đồ trang trí, cá, thức ăn, bong bóng.
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { C } from '../../theme';
import { Button, Text } from '../../components/ui';
import { feed, newTank, poke, stepTank, syncFish } from '../sim/fish';
import { SPECIES, profileOf } from '../species';
import { Px, World, useCalm, useTicker } from './kit';
import { ZenDecor, ZenFish, ZenWater } from './ZenArt';

const W = 180;
export const POND_SPOTS: Record<string, { min: number; max: number; y: number; start: number }> = {
  rock: { min: 2, max: 154, y: 150, start: 22 },
  lotus: { min: 4, max: 154, y: 4, start: 128 },
};

export function AquariumView({ fish, care = {}, decor, names, placed, feedTick, placing, onPlaced, onFish }: {
  care?: Record<string, { days: number; lastFed: string }>;
  fish: string[]; // id các loài đang thả
  decor: string[]; // id đồ trang trí đang bày
  names: Record<string, string>;
  placed: Record<string, { x: number }>;
  feedTick: number; // tăng lên mỗi lần người chơi bấm cho ăn
  placing: string | null;
  onPlaced: (id: string, x: number | null) => void;
  onFish: (id: string) => void;
}) {
  const calm = useCalm();
  const tank = useRef(newTank()).current;
  const [ghost, setGhost] = useState<number | null>(null);
  const [ring, setRing] = useState<{ x: number; y: number; at: number } | null>(null);

  const key = fish.join(',');
  useEffect(() => syncFish(tank, fish), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (feedTick) feed(tank);
  }, [feedTick, tank]);
  useEffect(() => setGhost(null), [placing]);

  const turns = useRef<Record<string, number>>({});
  const [paused, setPaused] = useState(false);
  const time = useTicker((dt) => {
    stepTank(tank, dt);
    for (const f of tank.fish) {
      const target = f.face === 1 ? -1 : 1;
      const current = turns.current[f.id] ?? target;
      turns.current[f.id] = current + (target - current) * (1 - Math.exp(-dt * 8));
    }
  }, paused);
  const xOf = (id: string) => (placing === id && ghost !== null ? ghost : placed[id]?.x ?? POND_SPOTS[id].start);
  const ringAge = ring ? time - ring.at : 9;

  return (
    <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center' }}>
      <World w={W} h={180} label="Hồ cá">
        {(s) => (
          <>
            <View pointerEvents="none" style={{ position: 'absolute', width: '100%', height: '100%' }}><ZenWater time={time} calm={calm} /></View>
            {/* chạm vào nước: vòng sóng (đặt dưới cá để cá vẫn chạm được) */}
            {placing ? null : (
              <Pressable
                style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}
                onPress={(e) => setRing({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY, at: time })}
                accessibilityLabel="Mặt nước, chạm để tạo sóng"
              />
            )}
            {!calm && ring && ringAge < 0.9 ? (
              <View pointerEvents="none" style={{ position: 'absolute', left: ring.x - 20, top: ring.y - 20, width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#FFFFFF', opacity: 0.3 * (1 - ringAge / 0.9), transform: [{ scale: 0.2 + ringAge * 1.4 }] }} />
            ) : null}

            {decor.includes('rock') ? <View pointerEvents="none" style={{ position: 'absolute', left: xOf('rock') * s, top: 150 * s, width: 24*s, height: 16*s, opacity: placing === 'rock' ? 0.75 : 1 }}><ZenDecor id="rock" /></View> : null}
            {decor.includes('lotus') ? <View pointerEvents="none" style={{ position: 'absolute', left: xOf('lotus') * s, top: 4 * s, width: 24*s, height: 16*s, opacity: placing === 'lotus' ? 0.75 : 1 }}><ZenDecor id="lotus" /></View> : null}

            {/* bong bóng nổi lên */}
            {(calm ? [] : [0, 1, 2]).map((n) => {
              const p = (time * (0.16 + n * 0.03) + n * 0.4) % 1;
              return <View key={n} pointerEvents="none" style={{ position: 'absolute', left: (30 + n * 55 + Math.sin(time * 2 + n) * 2) * s, top: (160 - p * 150) * s, width: (3 - (n % 2)) * s, height: (3 - (n % 2)) * s, borderWidth: s * 0.6, borderRadius: 20, borderColor: '#FFFFFF', opacity: 0.3 * Math.sin(p * Math.PI) }} />;
            })}
            {/* thức ăn đang rơi */}
            {tank.food.map((p) => <View key={p.id} pointerEvents="none" style={{ position: 'absolute', left: p.x * s, top: p.y * s * 1.65, width: 2 * s, height: 2 * s, backgroundColor: '#8A5A3C' }} />)}

            {tank.fish.map((f) => {
              const profile = profileOf(f.id);
              if (!SPECIES[f.id]) return null;
              // đuôi vẫy: thân co giãn nhẹ theo tốc độ; đang ăn thì há to một nhịp
              const days = care[f.id]?.days ?? 0;
              const size = days >= 7 ? 1.2 : days >= 3 ? 1.02 : 0.82;
              const speed = Math.hypot(f.vx, f.vy);
              const tilt = Math.atan2(f.vy, Math.max(4, Math.abs(f.vx))) * 15;
              const width = profile.width * size * s;
              const height = profile.height * size * s;
              return (
                <React.Fragment key={f.id}>
                  <View testID={`fish-art-${f.id}`} pointerEvents="none" style={{ position: 'absolute', left: f.x * s - width / 2, top: f.y * s * 1.65 - height / 2, width, height, transform: [{ scaleX: turns.current[f.id] ?? (f.face === 1 ? -1 : 1) }, { rotate: `${-tilt}deg` }] }}><ZenFish id={f.id} time={calm ? 0 : time} speed={speed} days={days} eating={f.mood === 'eat'} /></View>
                  {f.mood === 'happy' || f.mood === 'eat' ? <Px id="heart" s={s} x={f.x - 3} y={f.y * 1.65 - 16 - (1.2 - f.t) * 3} /> : null}
                  <View pointerEvents="none" style={{ position: 'absolute', left: (f.x - 20) * s, top: f.y * 1.65 * s + height * 0.4, width: 40 * s }}>
                    <Text style={{ textAlign: 'center', fontSize: 5.2 * s, color: '#D2EAE6' }} numberOfLines={1}>{names[f.id] || ''}</Text>
                  </View>
                  {placing ? null : (
                    <Pressable
                      onPress={() => { poke(tank, f.id); onFish(f.id); }}
                      style={{ position: 'absolute', left: f.x * s - 22, top: f.y * s * 1.65 - 22, width: 44, height: 44 }}
                      accessibilityLabel={`Xem ${names[f.id] || 'cá'}`}
                    />
                  )}
                </React.Fragment>
              );
            })}

      {placing ? (
              <Pressable
                style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}
                onPress={(e) => {
                  const spot = POND_SPOTS[placing];
                  setGhost(Math.round(Math.max(spot.min, Math.min(spot.max, e.nativeEvent.locationX / s - 8))));
                }}
                accessibilityLabel="Chạm để chọn chỗ đặt"
              />
            ) : null}
          </>
        )}
      </World>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <Text style={{ color: C.sub, fontSize: 12 }}>{fish.length} cư dân · Khu vườn của bạn</Text>
        <Button label={paused ? 'Tiếp tục' : 'Tạm dừng'} kind="soft" onPress={() => setPaused((v) => !v)} />
      </View>
      {fish.length === 0 && !placing ? <Text style={{ color: C.sub, textAlign: 'center', marginTop: 12 }}>Hồ đang yên tĩnh. Thả cá từ bộ sưu tập để bắt đầu.</Text> : null}
      {placing ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' }}>
          <Text style={{ flex: 1, color: C.sub, fontSize: 13 }}>Chạm vào hồ để chọn chỗ, rồi bấm Xong.</Text>
          <Button label="Hủy" kind="soft" onPress={() => onPlaced(placing, null)} />
          <Button label="Xong" onPress={() => onPlaced(placing, ghost)} disabled={ghost === null} />
        </View>
      ) : null}
    </View>
  );
}
