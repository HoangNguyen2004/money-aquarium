// Khối dựng chung cho hai scene: khung thế giới, sprite pixel, vòng lặp game.
// Thế giới có tọa độ pixel riêng (vd 180×160); khung giữ đúng tỷ lệ đó nên ảnh không bao giờ bị méo,
// và mọi thứ được đặt bằng tọa độ thế giới × s (số điểm màn hình cho một pixel thế giới).
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Image, Platform, View, type ImageStyle, type StyleProp } from 'react-native';
import { C, R } from '../../theme';
import { ASSETS, type AssetId } from './assets';
import { ZenDecor, ZenFish } from './ZenArt';

// Trên web phải tắt làm mịn để pixel sắc cạnh; trên điện thoại ảnh đã được phóng sẵn ×6 nên gần như 1:1.
const CRISP = Platform.OS === 'web' ? ({ imageRendering: 'pixelated' } as object) : null;

export function Px({ id, s, x, y, scale = 1, flip, style }: { id: AssetId; s: number; x: number; y: number; scale?: number; flip?: boolean; style?: StyleProp<ImageStyle> }) {
  const a = ASSETS[id];
  return (
    <Image
      source={a.src}
      fadeDuration={0}
      style={[{ position: 'absolute', left: x * s, top: y * s, width: a.w * scale * s, height: a.h * scale * s }, flip && { transform: [{ scaleX: -1 }] }, CRISP, style]}
    />
  );
}

/** Icon pixel dùng ngoài scene (ví, cửa hàng): cao `size` điểm, giữ tỷ lệ. */
export function Icon({ id, size }: { id: AssetId; size: number }) {
  if (id === 'rock' || id === 'lotus') return <View style={{ width: size, height: size }}><ZenDecor id={id} /></View>;
  if (id.startsWith('fish-')) return <View style={{ width: size, height: size }}><ZenFish id={id} /></View>;
  const a = ASSETS[id];
  const k = size / Math.max(a.w, a.h);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Image source={a.src} fadeDuration={0} style={[{ width: a.w * k, height: a.h * k }, CRISP]} />
    </View>
  );
}

export function World({ w, h, label, children }: { w: number; h: number; label: string; children: (s: number) => React.ReactNode }) {
  const [width, setWidth] = useState(0);
  return (
    <View
      style={{ marginTop: 14, borderRadius: R.lg, overflow: 'hidden', aspectRatio: w / h, backgroundColor: C.card }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityLabel={label}
    >
      {width ? children(width / w) : null}
      {/* Theme tối: phủ một lớp đêm lên cả cảnh thay vì vẽ bộ ảnh thứ hai. */}
      {C.dark ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: '#0A1020', opacity: 0.38 }} /> : null}
    </View>
  );
}

/**
 * Vòng lặp game: gọi step(dt) mỗi khung hình và vẽ lại theo nhịp màn hình, tối đa 60 lần/giây.
 * requestAnimationFrame tự ngừng khi tab ẩn hoặc app xuống nền; dừng hẳn khi component bị gỡ.
 * Trả về đồng hồ của scene (giây) để tính các chuyển động lặp như mây, bong bóng.
 */
export function useTicker(step: (dt: number) => void, paused = false): number {
  const [, draw] = useState(0);
  const clock = useRef(0);
  const fn = useRef(step);
  fn.current = step;
  const stopped = useRef(paused);
  stopped.current = paused;
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let acc = 0;
    const loop = (now: number) => {
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      if (stopped.current) { raf = requestAnimationFrame(loop); return; }
      clock.current += dt;
      fn.current(dt);
      acc += dt;
      if (acc >= 1 / 60 - 0.001) {
        acc %= 1 / 60;
        draw((n) => n + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return clock.current;
}

/** Người dùng bật "Giảm chuyển động": bỏ các chuyển động trang trí (mây, bụi, đung đưa); gameplay vẫn chạy. */
export function useCalm(): boolean {
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (active) setCalm(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setCalm);
    return () => { active = false; subscription.remove(); };
  }, []);
  return calm;
}

export const FILL = { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' } as const;

export function Layer({ id }: { id: AssetId }) {
  return <Image source={ASSETS[id].src} fadeDuration={0} style={[FILL, CRISP]} />;
}
