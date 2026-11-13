import React, { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { growthStage, profileOf } from '../species';

type FishArtProps = { id: string; time?: number; speed?: number; days?: number; eating?: boolean };

// All artwork faces left. Each species has a distinct silhouette and articulated parts.
export function ZenFish({ id, time = 0, speed = 0, days = 7, eating = false }: FishArtProps) {
  const p = profileOf(id);
  const stage = growthStage(days);
  const adult = stage === 'ADULT';
  const young = stage === 'FRY';
  const t = time * (p.cadence + speed * 0.035) + p.phase;
  const stroke = Math.sin(t);
  const fin = Math.sin(t + 1.2);
  const instance = useId().replace(/[^a-zA-Z0-9]/g, '');
  const prefix = instance + id.replace(/[^a-z]/g, '') + stage;
  const body = `${prefix}body`, tail = `${prefix}tail`, pearl = `${prefix}pearl`;
  const ray = (paths: string[], color = '#FFE8BF', opacity = 0.42) => paths.map((d, i) => <Path key={i} d={d} fill="none" stroke={color} strokeWidth="0.65" opacity={opacity} />);
  const eye = (x: number, y: number, r = 2.2) => <G><Circle cx={x} cy={y} r={r+0.9} fill="#E8DAB6" /><Circle cx={x} cy={y} r={r} fill="#122D34" /><Circle cx={x-0.5} cy={y-0.65} r={r*0.28} fill="#FFFFFF" /></G>;
  return <Svg width="100%" height="100%" viewBox="0 0 100 70">
    <Defs>
      <LinearGradient id={body} x1="0%" y1="0%" x2="25%" y2="100%">
        <Stop stopColor={id === 'fish-clown' ? '#FFBE63' : id === 'fish-puffer' ? '#A7AF70' : id === 'fish-turtle' ? '#8DB28A' : id === 'fish-shrimp' ? '#FFAB8D' : '#FFE8A3'} />
        <Stop offset="0.46" stopColor={id === 'fish-clown' ? '#ED7D35' : id === 'fish-puffer' ? '#D0CB8F' : id === 'fish-turtle' ? '#4F8973' : id === 'fish-shrimp' ? '#D96552' : '#ECB35F'} />
        <Stop offset="1" stopColor={id === 'fish-clown' ? '#B74B2C' : id === 'fish-puffer' ? '#FFF0C8' : id === 'fish-turtle' ? '#295B56' : id === 'fish-shrimp' ? '#A83F3B' : '#D68043'} />
      </LinearGradient>
      <LinearGradient id={tail} x1="0%" y1="0%" x2="100%" y2="60%"><Stop stopColor="#EDB366" stopOpacity="0.85" /><Stop offset="0.55" stopColor="#F8D397" stopOpacity="0.65" /><Stop offset="1" stopColor="#FFF5DA" stopOpacity="0.25" /></LinearGradient>
      <RadialGradient id={pearl} cx="30%" cy="20%" rx="65%" ry="75%"><Stop stopColor="#FFF7DC" stopOpacity="0.65" /><Stop offset="1" stopColor="#FFF7DC" stopOpacity="0" /></RadialGradient>
    </Defs>
    {id === 'fish-turtle' ? <>
      {/* Four limbs have opposing paddle phases; the shell stays steady. */}
      <G rotation={stroke*20} origin="47,27"><Path d="M43 28Q26 7 42 10Q50 14 53 29Z" fill="#739B79" stroke="#3C6A61" strokeWidth="0.8" />{ray(['M43 24L39 14M46 24L43 15'], '#B6CCA0')}</G>
      <G rotation={-stroke*18} origin="69,28"><Path d="M66 28Q76 10 84 18L76 34Z" fill="#4D7D69" /></G>
      <Path d="M76 35L91 39L76 41Z" fill="#6D987A" />
      <Path d="M37 32Q17 17 11 29Q7 37 20 41L40 43Z" fill={`url(#${body})`} stroke="#37675C" strokeWidth="0.7" />
      <Path d="M14 28L30 34M13 34L30 38" stroke="#D8C981" strokeWidth="1.8" fill="none" />
      <Path d="M31 39Q33 15 56 14Q79 15 81 39Q65 56 40 48Z" fill="#2D665B" stroke="#AAC08C" strokeWidth="1.5" />
      <Path d="M39 38L44 23L57 19L69 26L74 41L61 49L46 46Z" fill="#508571" stroke="#8EAA7A" strokeWidth="1" />
      {!young ? <Path d="M48 28L58 25L66 32L62 42L50 42L44 35Z" fill="#668F73" stroke="#AEC18A" strokeWidth="0.9" /> : null}
      {adult ? ray(['M48 28L44 23M58 25L57 19M66 32L69 26M62 42L61 49M50 42L46 46M44 35L39 38'], '#A6BD86', 0.8) : null}
      <Path d="M36 34Q42 17 59 18" fill="none" stroke="#D9DDB0" strokeWidth="1.3" opacity="0.3" />
      <G rotation={-stroke*24} origin="45,44"><Path d="M41 40Q24 50 31 60Q41 61 53 46Z" fill="#74A184" stroke="#3B6C60" strokeWidth="0.8" />{ray(['M36 54L44 45M39 56L48 46'], '#C0CBA0')}</G>
      <G rotation={stroke*20} origin="70,44"><Path d="M67 42Q78 58 85 50L76 39Z" fill="#568B74" /></G>
      {eye(16,30,1.7)}<Path d="M10 36L15 37" stroke="#2E5B52" strokeWidth="0.8" />
    </> : id === 'fish-shrimp' ? <>
      <G fill="none" stroke="#E8B3A0" strokeWidth="0.65" opacity="0.9">
        <Path d={`M27 30Q5 ${8+fin*2} 3 17M27 31Q7 ${21+fin*2} 2 28M28 34Q13 40 5 39`} />
        {[0,1,2,3,4].map(n => <Path key={n} d={`M${32+n*6} ${40+n*0.5}Q${25+n*6+Math.sin(t+n)*2} 52 ${20+n*6} ${53+Math.sin(t+n)*3}`} />)}
      </G>
      <G rotation={stroke*4} origin="67,38"><Path d="M61 31Q83 34 85 49L78 55Q68 47 62 44Z" fill={`url(#${body})`} stroke="#FFD0AD" strokeWidth="0.7" /><Path d="M80 49Q94 44 95 53L87 59L80 54Q82 63 75 63L73 53Z" fill="#DC876B" />{ray(['M82 51L91 51M79 53L78 60'], '#FFE6BD')}</G>
      <Path d="M24 34L28 23L32 29Q48 19 63 29Q74 35 72 44Q51 54 30 42Z" fill={`url(#${body})`} stroke="#E8AE8D" strokeWidth="0.7" />
      <Path d="M30 28Q42 22 54 27" fill="none" stroke="#FFE1B7" strokeWidth="2" opacity="0.55" />
      {(young ? [40,56] : [40,48,56,64]).map((x,n) => <Path key={x} d={`M${x} ${26+n}Q${x-5} 35 ${x-2} 46`} fill="none" stroke="#852F35" strokeWidth="0.9" opacity="0.5" />)}
      {(adult ? [0,1,2,3,4,5] : []).map(n => <Circle key={n} cx={34+n*5} cy={34+(n%2)*5} r="0.9" fill="#FFCCA0" opacity="0.5" />)}
      {eye(28,30,1.4)}<Path d="M25 37L20 39" stroke="#F2CEAC" strokeWidth="0.8" />
    </> : id === 'fish-puffer' ? <>
      <G rotation={stroke*8} origin="65,35"><Path d="M63 35L88 25Q84 35 89 44L65 40Z" fill="#C2BB82" stroke="#EFE1AC" strokeWidth="0.7" />{ray(['M67 36L85 29M67 37L86 35M67 38L86 41'])}</G>
      <G rotation={fin*18} origin="49,21"><Path d="M44 23Q50 10 58 17L58 27Z" fill="#A9AC73" opacity="0.8" /></G>
      <Path d="M17 35Q17 16 38 13Q61 9 70 30Q76 49 54 56Q28 62 18 43Z" fill={`url(#${body})`} stroke="#E8DDB1" strokeWidth="0.6" />
      <Path d="M20 40Q42 48 69 37Q67 57 44 57Q27 55 20 40Z" fill="#F9ECCD" opacity="0.75" />
      {[0,1,2].flatMap(row => [0,1,2,3,4,5].map(col => <Ellipse key={`${row}-${col}`} cx={29+col*6+(row%2)*2} cy={20+row*7+Math.sin(col)*2} rx={1.1+(col%2)*0.3} ry="1.1" fill="#5E784F" opacity={0.65-row*0.12} />))}
      {adult ? ray(['M24 19L22 15M34 14L33 10M46 13L47 9M58 17L61 14M66 24L70 23'], '#D5CD97', 0.8) : null}
      <Ellipse cx="36" cy="23" rx="18" ry="10" fill={`url(#${pearl})`} />
      <G rotation={fin*28} origin="44,37"><Path d="M44 34Q61 34 58 48Q47 51 44 34" fill="#EDDDA8" opacity="0.7" />{ray(['M46 37L55 45M46 37L57 41'])}</G>
      {eye(24,30,young ? 3.1 : 2.7)}<Circle cx="17" cy="39" r={eating ? 2 : 1} fill="#6B6751" />
    </> : id === 'fish-clown' ? <>
      <G rotation={stroke*12} origin="69,35"><Path d="M67 35Q80 19 91 23Q86 35 92 46Q78 50 67 38Z" fill="#E88743" stroke="#253D3D" strokeWidth="1.5" />{ray(['M72 35L87 26M72 36L87 34M72 37L88 43'])}</G>
      <Path d="M30 25Q36 8 48 15L61 14L68 29M37 43Q48 61 63 46" fill="#E98B46" stroke="#263B3C" strokeWidth="1.4" />
      {ray(['M36 23L40 15M43 22L47 15M51 23L54 16M57 24L60 16M44 46L49 53M51 45L56 52'])}
      <Path d="M12 34Q15 19 34 21Q55 17 72 32L72 39Q49 53 28 47Q17 44 12 38Z" fill={`url(#${body})`} stroke="#283C3B" strokeWidth="1.1" />
      <Path d="M27 22Q34 34 28 47L35 48Q41 34 34 21Z M48 21Q43 33 49 49L56 46Q51 34 56 24Z M65 29L63 43L68 41L70 32Z" fill="#FFF1D6" stroke="#304442" strokeWidth="1.2" />
      <Path d="M17 31Q21 24 26 24" fill="none" stroke="#FFD592" strokeWidth="1.5" opacity="0.8" />
      {adult ? [0,1,2].flatMap(row => [0,1,2,3].map(col => <Path key={`${row}-${col}`} d={`M${37+col*2.7} ${28+row*5}q3 2 0 4`} fill="none" stroke="#FFD29A" strokeWidth="0.5" opacity="0.28" />)) : null}
      <G rotation={fin*22} origin="36,36"><Path d="M35 33Q50 36 44 46Q35 44 35 33Z" fill="#F7A359" stroke="#32413A" strokeWidth="0.7" />{ray(['M37 36L43 42M37 36L44 39'])}</G>
      {eye(21,32,young ? 2.8 : 2.1)}<Path d={eating ? 'M12 36Q7 38 13 40' : 'M12 37L16 38'} fill="none" stroke="#493A30" strokeWidth="0.9" />
    </> : <>
      {/* Goldfish: long split veil tail, layered fin rays, scalloped scales. */}
      <G rotation={stroke*(adult ? 10 : 15)} origin="60,35" scale={young ? 0.72 : adult ? 1 : 0.88}>
        <Path d="M57 34Q75 13 92 10Q85 25 94 31Q79 37 65 37Q85 40 94 59Q78 56 58 40Z" fill={`url(#${tail})`} stroke="#F9DEAC" strokeWidth="0.55" />
        <Path d="M62 35Q84 25 90 14M62 36Q82 30 91 29M62 38Q79 43 90 55M63 38Q81 39 90 47" stroke="#FFF0C9" strokeWidth="0.8" fill="none" opacity="0.5" />
        {adult ? ray(['M65 33Q77 21 84 17M66 35Q80 28 87 25M65 39Q77 47 85 52M66 38Q82 42 87 45'], '#F7CA85', 0.6) : null}
      </G>
      <G rotation={fin*3} origin="40,24"><Path d="M26 26Q33 6 47 9Q44 15 61 26Z" fill={`url(#${tail})`} stroke="#EAC389" strokeWidth="0.6" />{ray(['M32 24L38 12M39 24L42 12M46 24L47 17M52 25L52 21'])}</G>
      <Path d="M40 43Q52 63 61 49L55 40" fill={`url(#${tail})`} opacity="0.8" />
      <Path d="M13 34Q15 23 27 21Q43 14 58 26Q64 30 65 36Q59 47 42 49Q20 51 13 39Z" fill={`url(#${body})`} stroke="#F1CD93" strokeWidth="0.6" />
      <Path d="M18 40Q35 49 57 41Q46 52 28 47Z" fill="#FBE5B2" opacity="0.45" />
      {!young ? [0,1,2,3].flatMap(row => [0,1,2,3,4].map(col => <Path key={`${row}-${col}`} d={`M${30+col*5+(row%2)*2} ${25+row*4.5}q5 2.5 0 5`} stroke="#B97D42" strokeWidth="0.55" fill="none" opacity={adult ? 0.32 : 0.18} />)) : null}
      <Ellipse cx="33" cy="28" rx="18" ry="8" fill={`url(#${pearl})`} />
      <Path d="M26 26Q32 32 27 40" fill="none" stroke="#BC7D45" strokeWidth="0.9" opacity="0.65" />
      <G rotation={fin*20} origin="32,35"><Path d="M31 33Q49 38 41 52Q31 48 31 33Z" fill={`url(#${tail})`} stroke="#F3D5A2" strokeWidth="0.5" />{ray(['M33 36L39 48M33 36L41 43'])}</G>
      {eye(21,32,young ? 2.8 : 2.2)}<Path d={eating ? 'M14 36Q8 38 14 40' : 'M13 37Q16 39 18 37'} stroke="#94613A" strokeWidth="0.8" fill="none" />
    </>}
  </Svg>;
}

export function ZenWater({ time, calm }: { time: number; calm: boolean }) {
  const t = calm ? 0 : time;
  return <Svg width="100%" height="100%" viewBox="0 0 180 180" preserveAspectRatio="none">
    <Defs>
      <LinearGradient id="water" x2="0.3" y2="1"><Stop stopColor="#287C88" /><Stop offset="0.45" stopColor="#155368" /><Stop offset="1" stopColor="#092B42" /></LinearGradient>
      <RadialGradient id="light" cx="0.3" cy="0" rx="0.8" ry="0.9"><Stop stopColor="#A4EFDC" stopOpacity="0.32" /><Stop offset="1" stopColor="#A4EFDC" stopOpacity="0" /></RadialGradient>
      <LinearGradient id="sand" x2="0" y2="1"><Stop stopColor="#4C7774" /><Stop offset="1" stopColor="#173E4C" /></LinearGradient>
    </Defs>
    <Rect width="180" height="180" fill="url(#water)" /><Rect width="180" height="180" fill="url(#light)" />
    {[15,62,108].map((x,i) => <Path key={x} d={`M${x} 0L${x+12} 0L${x+65} 164L${x+29} 164Z`} fill="#BDFFE4" opacity={0.025 + Math.sin(t * 0.3+i)*0.009} />)}
    <Path d="M0 158Q40 147 91 161T180 154V180H0Z" fill="url(#sand)" />
    <Path d="M0 168Q52 157 108 170T180 164" fill="none" stroke="#76A295" opacity="0.18" strokeWidth="0.5" />
    {[3,10,17,158,166,174].map((x,i) => <G key={x} rotation={Math.sin(t*0.65+i)*3} origin={`${x},171`}><Path d={`M${x} 173Q${x-12} 146 ${x+1} ${114+(i%3)*13}Q${x+6} 148 ${x} 173`} fill={i%2 ? '#39877F' : '#206666'} /><Path d={`M${x} 172Q${x+14} 151 ${x+9} 139Q${x+2} 151 ${x} 172`} fill="#4E9A87" opacity="0.6" /></G>)}
    {[0,1,2,3,4,5,6,7].map((n) => { const p = (t*(0.025+n*0.002)+n/8)%1; return <Circle key={n} cx={24+n*19+Math.sin(t*0.4+n)*3} cy={170-p*170} r={n%3===0 ? 0.85 : 0.4} fill="#D5FFF2" opacity={Math.sin(p*Math.PI)*0.25} />; })}
  </Svg>;
}

export function ZenDecor({ id }: { id: string }) {
  return <Svg width="100%" height="100%" viewBox="0 0 48 32">
    {id === 'rock' ? <><Path d="M3 28L9 14L23 8L34 15L43 29Z" fill="#73958E" /><Path d="M9 14L23 8L19 24L3 28Z" fill="#95B2A3" /><Path d="M23 8L34 15L43 29L19 24Z" fill="#577A78" /><Path d="M10 15L20 12M26 26L38 28" stroke="#B6C9B4" strokeWidth="1" opacity="0.5" /></> : <><Ellipse cx="24" cy="25" rx="21" ry="5" fill="#508C7C" /><Path d="M24 25Q5 15 12 10Q20 9 24 25M24 25Q43 15 36 10Q28 9 24 25" fill="#EBC6BA" /><Path d="M24 25Q10 10 19 7L24 18L29 7Q38 10 24 25" fill="#FFDFD1" /><Path d="M24 24Q16 12 24 3Q32 12 24 24" fill="#FFF0D9" /><Circle cx="24" cy="22" r="3" fill="#E0B66D" /></>}
  </Svg>;
}
