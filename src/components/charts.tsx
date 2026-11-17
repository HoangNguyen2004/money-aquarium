import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { DISPLAY, Text } from './ui';
import { C } from '../theme';
import { cat } from '../categories';
import { fmtShort } from '../format';
import type { CatStat } from '../report';

export function Donut({ data, size = 190 }: { data: CatStat[]; size?: number }) {
  const stroke = 28;
  const top = data[0];
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const gap = data.length > 1 ? 3 : 0;
  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.line} strokeWidth={stroke} fill="none" />
          {data.map((d) => {
            const len = d.pct * circ;
            const el = (
              <Circle
                key={d.id}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={cat(d.id).color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${Math.max(0, len - gap)} ${circ}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
        </G>
      </Svg>
      {top ? (
        <>
          <Text style={{ fontSize: 11, color: C.sub }}>Lớn nhất</Text>
          <Text style={{ fontFamily: DISPLAY, fontSize: 28, fontWeight: '700', color: C.ink }}>{Math.round(top.pct * 100)}%</Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: cat(top.id).color }}>{cat(top.id).name}</Text>
        </>
      ) : null}
    </View>
  );
}

/** Cột chi theo ngày trong tháng. */
export function DayBars({ values, highlight }: { values: number[]; highlight?: number }) {
  const max = Math.max(...values, 1);
  const H = 96;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: H, gap: 2 }}>
        {values.map((v, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: v > 0 ? Math.max(3, (v / max) * H) : 2,
              borderRadius: 3,
              backgroundColor: v === 0 ? C.line : i === highlight ? C.primary : C.accent,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontSize: 11, color: C.faint }}>1</Text>
        <Text style={{ fontSize: 11, color: C.faint }}>{Math.ceil(values.length / 2)}</Text>
        <Text style={{ fontSize: 11, color: C.faint }}>{values.length}</Text>
      </View>
      <Text style={{ fontSize: 11.5, color: C.sub, marginTop: 6 }}>Ngày cao nhất: {fmtShort(max === 1 ? 0 : max)}</Text>
    </View>
  );
}
