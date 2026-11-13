// Café Scene: chỉ vẽ. Mọi hành vi nằm ở sim/cafe.ts; file này đọc state mỗi khung hình và xếp lớp ảnh.
// Lớp từ xa đến gần: trời → mây → tường/kệ → nhân viên → quầy/máy → sàn (đồ, mèo, khách) → chậu hoa → hiệu ứng → vùng chạm.
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { C, R } from '../../theme';
import { Button, Text } from '../../components/ui';
import { MENU } from '../rules';
import { cheer, newCafe, order, stepCafe } from '../sim/cafe';
import type { AssetId } from './assets';
import { Icon, World, useCalm, useTicker } from './kit';
import { CozyRoom, CozyCounter, CozySprite as Px, CozyMenuIcon } from './CozyArt';

const W = 180;
const H = 160;
// Đồ đặt được: ray trượt ngang [min, max], hàng y, và hệ số phóng (đồ ở sàn gần người xem nên to gấp đôi).
export const CAFE_SPOTS: Record<string, { min: number; max: number; y: number; scale: number; start: number }> = {
  picture: { min: 4, max: 153, y: 28, scale: 1, start: 4 },
  sofa: { min: 2, max: 144, y: 126, scale: 1.3, start: 6 },
  plant: { min: 2, max: 142, y: 125, scale: 2, start: 142 },
};

const INFO: Record<string, string> = {
  machine: 'Máy pha cà phê. Khi khách gọi món, bấm món ở bảng dưới để nhân viên pha.',
  guest: 'Khách đang chờ món trong bong bóng.',
};

export function CafeView({ owned, placed, menu, tipsLeft, cheerTick, placing, onPlaced, onServe, onOpenInventory }: {
  owned: string[]; // id đồ của quán đang bày
  placed: Record<string, { x: number }>;
  menu: string[];
  tipsLeft: number;
  cheerTick: number; // tăng lên mỗi khi người chơi nhận thưởng: nhân viên vui mừng
  placing: string | null;
  onPlaced: (id: string, x: number | null) => void;
  onServe: () => number;
  onOpenInventory: () => void;
}) {
  const calm = useCalm();
  const sim = useRef(newCafe()).current;
  const [tip, setTip] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [info, setInfo] = useState<string | null>(null);
  const [ghost, setGhost] = useState<number | null>(null);
  const menuRef = useRef(menu);
  menuRef.current = menu;

  const time = useTicker((dt) => {
    for (const e of stepCafe(sim, dt, menuRef.current)) if (e === 'served') setTip(onServe());
  });
  useEffect(() => {
    if (cheerTick) cheer(sim);
  }, [cheerTick, sim]);
  useEffect(() => setGhost(null), [placing]);

  const has = (id: string) => owned.includes(id);
  const xOf = (id: string) => (placing === id && ghost !== null ? ghost : placed[id]?.x ?? CAFE_SPOTS[id].start);
  const g = sim.guest;
  const waiting = g?.state === 'WAITING';
  const brewing = sim.machine.state === 'BREWING';
  // Continuous poses keep the illustrated body stable between animation frames.
  const b = sim.barista;
  const walking = b.state === 'WALK';
  const stride = b.t * 11;
  const breath = calm ? 0 : Math.sin(time * 2.2) * 0.18;
  const work = !calm && b.state === 'BREW' ? Math.sin(b.t * 5) : 0;
  const hop = !calm && b.state === 'HAPPY' ? Math.sin(Math.min(1, b.t / 1.5) * Math.PI) : 0;
  const catPhase = time * 0.32;
  const catX = 93 + Math.cos(catPhase) * 35;
  const catLeft = Math.sin(catPhase) > 0;
  const guestWalking = g?.state === 'ENTERING' || g?.state === 'LEAVING';
  const guestStride = (g?.t ?? 0) * 11;

  function sell(id: string) {
    const r = order(sim, id);
    if (r === 'wrong') {
      // Đưa nhầm món: khách chỉ nhắc lại, không phạt.
      setWrong(Date.now());
      setTimeout(() => setWrong(0), 900);
    }
  }

  return (
    <View style={{ width: '100%', maxWidth: 620, alignSelf: 'center' }}>
      <World w={W} h={H} label="Quán cà phê">
        {(s) => (
          <>
            <CozyRoom />
            <View pointerEvents="none" style={{ position: 'absolute', left: 42 * s, top: 24 * s, width: 82 * s, height: 32 * s, overflow: 'hidden', opacity: 0.16 }}>
              <Px id="cloud_2" s={s} x={calm ? 24 : 82 - (time * 1.3 % 126)} y={0} />
            </View>
            {[39, 135].map((x, i) => (
              <View key={x} pointerEvents="none" style={{ position: 'absolute', left: (x - 9) * s, top: 9 * s, width: 16 * s, height: 16 * s, borderRadius: 10 * s, backgroundColor: '#FFD86B', opacity: 0.16 + (calm ? 0 : 0.06 * Math.sin(time * 1.3 + i * 2)) }} />
            ))}
            {has('picture') ? <Px id="picture" s={s} x={xOf('picture')} y={CAFE_SPOTS.picture.y} style={placing === 'picture' && { opacity: 0.75 }} /> : null}

            <Px id={b.state === 'HAPPY' ? 'barista_happy' : b.state === 'BREW' || b.state === 'SERVE' ? 'barista_work' : b.blink < 0 && !walking ? 'barista_blink' : 'barista_idle'} s={s} x={b.x} flip={b.goal === 'home'} y={90 + breath - hop * 2.2 - (!calm && walking ? (1 - Math.cos(stride * 2)) * 0.3 : 0)} style={calm ? undefined : { transform: [{ rotate: `${walking ? Math.sin(stride) * 1.4 : work * 1.2}deg` }, { scaleY: 1 + breath * 0.018 - hop * 0.025 }] }} />

            <CozyCounter s={s} />
            {has('cake') ? <Px id="cafe_cakes" s={s} x={139} y={76} /> : null}
            {has('radio') ? <Px id="radio" s={s} x={40} y={93} /> : null}
            <Px id={brewing ? 'machine_brew' : 'machine_idle'} s={s} x={116} y={86.5} />
            {/* hơi nước bốc lên từ máy (nhiều hơn khi đang pha) */}
            {(calm ? [] : brewing ? [0, 1, 2] : [0]).map((n) => {
              const p = (time * 0.6 + n * 0.37) % 1;
              return <View key={n} pointerEvents="none" style={{ position: 'absolute', left: (120 + n * 3) * s, top: (85 - p * 14) * s, transform: [{ translateX: Math.sin(p * Math.PI * 2 + n) * 2 * s }, { scale: 0.7 + p * 0.6 }], width: 2 * s, height: 5 * s, borderRadius: 3 * s, backgroundColor: '#FFFFFF', opacity: 0.65 * Math.sin(p * Math.PI) }} />;
            })}
            {sim.machine.state === 'FINISHED' ? <Px id="sparkle" s={s} x={121} y={80 + Math.sin(time * 10)} /> : null}

            {has('sofa') ? <Px id="sofa" s={s} x={xOf('sofa')} y={CAFE_SPOTS.sofa.y} scale={CAFE_SPOTS.sofa.scale} style={placing === 'sofa' && { opacity: 0.75 }} /> : null}
            {has('plant') ? (
              <Px id="plant" s={s} x={xOf('plant')} y={CAFE_SPOTS.plant.y} scale={2} style={[placing === 'plant' && { opacity: 0.75 }, !calm && { transform: [{ rotate: `${Math.sin(time * 1.4) * 2.5}deg` }] }]} />
            ) : null}
            {has('cat') ? <Px id="cat_1" s={s} x={calm ? 96 : catX} y={143 - (calm ? 0 : Math.abs(Math.sin(time * 7)) * Math.abs(Math.sin(catPhase)) * 0.4)} scale={1} flip={!calm && !catLeft} /> : null}

            {g ? (
              <>
                <Px id={`guest${g.look}_${g.state === 'HAPPY' ? 'work' : 'idle'}` as AssetId} s={s} x={g.x} y={119 + (calm ? 0 : guestWalking ? -(1 - Math.cos(guestStride * 2)) * 0.35 : Math.sin(time * 2 + g.id) * 0.16)} scale={1.7} flip={g.state === 'ENTERING'} style={calm ? undefined : { transform: [{ rotate: `${guestWalking ? Math.sin(guestStride) * 1.1 : 0}deg` }] }} />
                {g.state === 'WAITING' || g.state === 'ORDERED' || g.state === 'HAPPY' ? (
                  <View pointerEvents="none" style={{ position: 'absolute', left: (g.x + 3) * s, top: 104 * s, minWidth: 28 * s, height: 18 * s, paddingHorizontal: 3 * s, borderRadius: 4 * s, backgroundColor: '#FFFFFF', borderWidth: s, borderColor: wrong ? '#C8452F' : '#C9AA7A', alignItems: 'center', justifyContent: 'center' }}>
                    {g.state === 'HAPPY' ? (
                      tip ? <Text style={{ fontSize: 6.5 * s, fontWeight: '500', color: '#1F6B3A' }}>+{tip} xu</Text> : <Icon id="heart" size={10 * s} />
                    ) : (
                      <CozyMenuIcon id={g.order as 'coffee' | 'tea' | 'cake'} size={12 * s} />
                    )}
                  </View>
                ) : null}
              </>
            ) : null}

            {/* bụi sáng lơ lửng */}
            {(calm ? [] : [0, 1, 2, 3]).map((n) => {
              const p = (time * 0.05 + n * 0.25) % 1;
              return <View key={n} pointerEvents="none" style={{ position: 'absolute', left: (20 + n * 42 + Math.sin(time * 0.5 + n) * 6) * s, top: (95 - p * 60) * s, width: s, height: s, backgroundColor: '#FFF6E4', opacity: 0.7 * Math.sin(p * Math.PI) }} />;
            })}

            {/* vùng chạm */}
            {placing ? (
              <Pressable
                style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}
                onPress={(e) => {
                  const spot = CAFE_SPOTS[placing];
                  setGhost(Math.round(Math.max(spot.min, Math.min(spot.max, e.nativeEvent.locationX / s - 12))));
                }}
                accessibilityLabel="Chạm để chọn chỗ đặt"
              />
            ) : (
              <>
                <Pressable style={{ position: 'absolute', left: 114 * s, top: 83 * s, width: 25 * s, height: 27 * s }} onPress={() => setInfo(INFO.machine)} accessibilityLabel="Máy pha cà phê" />
                <Pressable style={{ position: 'absolute', left: 4 * s, top: 50 * s, width: 32 * s, height: 42 * s }} onPress={onOpenInventory} accessibilityLabel="Kệ hàng, mở kho đồ" />
                {g ? <Pressable style={{ position: 'absolute', left: (g.x + 3) * s, top: 104 * s, width: 28 * s, height: 60 * s }} onPress={() => setInfo(waiting ? `Khách muốn mua ${MENU.find((m) => m.id === g.order)?.name ?? ''}.` : INFO.guest)} accessibilityLabel="Khách" /> : null}
              </>
            )}
          </>
        )}
      </World>

      {placing ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' }}>
          <Text style={{ flex: 1, color: C.sub, fontSize: 13 }}>Chạm vào cảnh để chọn chỗ, rồi bấm Xong.</Text>
          <Button label="Hủy" kind="soft" onPress={() => onPlaced(placing, null)} />
          <Button label="Xong" onPress={() => onPlaced(placing, ghost)} disabled={ghost === null} />
        </View>
      ) : (
        <>
          {/* bảng pha chế: bấm đúng món khách đang gọi */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {MENU.map((m) => {
              const open = menu.includes(m.id);
              return (
                <Pressable
                  key={m.id}
                  onPress={() => sell(m.id)}
                  disabled={!open || !waiting}
                  style={({ pressed }) => ({ flex: 1, minHeight: 76, borderRadius: R.md, borderWidth: 1, borderColor: waiting && g?.order === m.id ? '#58988C' : C.line, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', gap: 4, opacity: 1, transform: [{ scale: pressed ? 0.96 : 1 }] })}
                  accessibilityRole="button"
                  accessibilityLabel={open ? `Bán ${m.name}` : `${m.name}, mở ở cấp ${m.level}`}
                >
                  <CozyMenuIcon id={m.id as 'coffee' | 'tea' | 'cake'} size={32} />
                  <Text style={{ fontSize: 12.5, fontWeight: '500', color: open ? C.ink : C.sub }}>{open ? m.name : `Cấp ${m.level}`}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={{ color: C.sub, fontSize: 12.5, marginTop: 8, paddingHorizontal: 4, lineHeight: 18 }}>
            {info ?? (waiting ? 'Khách đang chờ. Bấm đúng món trong bong bóng để nhân viên pha.' : sim.barista.state !== 'IDLE' && sim.barista.state !== 'HAPPY' ? 'Nhân viên đang pha chế…' : 'Khách sẽ ghé quán lần lượt. Chạm vào máy pha, kệ hàng hoặc khách để xem.')}
            {tipsLeft > 0 ? ` Hôm nay còn ${tipsLeft} lượt bán có xu.` : ' Hôm nay đã hết lượt có xu, bán tiếp cho vui thôi.'}
          </Text>
        </>
      )}
    </View>
  );
}
