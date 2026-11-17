import React, { useId } from 'react';
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg';
import { FISH_FRAME, type CustomFish } from '../game/customFish';
export function CustomFishArt({ fish }: { fish: Pick<CustomFish, 'color' | 'strokes'> }) {
  const clip = `fish${useId().replace(/[^a-z0-9]/gi, '')}`;
  return <Svg width="100%" height="100%" viewBox="0 0 320 200">
    <Defs><ClipPath id={clip}><Path d={FISH_FRAME} /></ClipPath></Defs>
    <G clipPath={`url(#${clip})`}>
      <Rect width={320} height={200} fill={fish.color} />
      {fish.strokes.map((s, i) => s.points.length === 1 ? <Circle key={i} cx={s.points[0][0]} cy={s.points[0][1]} r={s.width / 2} fill={s.erase ? fish.color : s.color} /> : <Path key={i} d={s.points.map(([x,y], j) => `${j ? 'L' : 'M'} ${x} ${y}`).join(' ')} stroke={s.erase ? fish.color : s.color} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round" fill="none" />)}
    </G>
    <Path d={FISH_FRAME} fill="none" stroke="#344C66" strokeWidth={2} />
    <Circle cx={86} cy={87} r={10} fill="#FFFFFF" /><Circle cx={83} cy={87} r={5} fill="#222B35" />
    <Path d="M 59 108 Q 70 114 77 105" fill="none" stroke="#344C66" strokeWidth={2} strokeLinecap="round" />
  </Svg>;
}
