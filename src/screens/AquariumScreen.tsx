import { FishStudio } from '../components/FishStudio';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { C, R, themed } from '../theme';
import { addMonths, fmtShort, monthKey, monthLabel, shortDate, today } from '../format';
import { buyItem, closeMonth, placeItem, renameItem, reviewToday, startCafe, feedFishToday, toggleItem, useStore } from '../store';
import * as G from '../game/rules';
import { profileOf } from '../game/species';
import { AquariumExperience } from '../game/view/AquariumExperience';
import { waterStatus, habitStreak } from '../game/finance';
import { GoalsPanel } from '../components/GoalsPanel';
import { Bestiary } from '../components/Bestiary';
import { contributed, goalProgress, goalStage } from '../savings';
import { ZenFish } from '../game/view/ZenArt';
import { POND_SPOTS } from '../game/view/AquariumView';
import { Icon as Pix } from '../game/view/kit';
import type { AssetId } from '../game/view/assets';
import { Button, Card, Icon, ProgressBar, SectionTitle, Text, TextInput, confirm, notify } from '../components/ui';

type Pane = 'studio' | 'goals' | 'catalog' | 'pond' | 'missions' | 'shop' | 'inventory';
const PANES: [Pane, string][] = [['pond', 'Hồ cá'], ['studio', 'Vẽ cá'], ['goals', 'Mục tiêu'], ['catalog', 'Sổ tay'], ['missions', 'Nhiệm vụ'], ['shop', 'Cửa hàng'], ['inventory', 'Kho đồ']];
const SPOTS = { ...POND_SPOTS };

export function AquariumScreen({ onAdd, onPlan }: { onAdd: () => void; onPlan: () => void }) {
  const { game, transactions, plan, budgets, goals, customFish } = useStore();
  const [name, setName] = useState('');
  const [focus, setFocus] = useState(false);
  const [pane, setPane] = useState<Pane>('pond');
  // Chuyển mục: nội dung mới hiện dần lên.
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: false }).start();
  }, [pane, fade]);
  const [naming, setNaming] = useState<{ id: string; text: string } | null>(null);
  const [placing, setPlacing] = useState<string | null>(null); // món đang được chọn chỗ đặt
  const [feedTick, setFeedTick] = useState(0);
  const [reveal, setReveal] = useState<{ item: G.Item; tick: number } | null>(null); // cá mới mở khóa

  // Sổ thưởng có dòng cộng mới thì cho hiện "+10 xu" bay lên trên cảnh quán.
  const [pop, setPop] = useState({ text: '', tick: 0 });
  const seen = useRef(game.ledger.length);
  useEffect(() => {
    // Tiền bán hàng tự báo ở chỗ phục vụ khách, không tính ở đây.
    const fresh = game.ledger.slice(seen.current).filter((e) => !e.key.startsWith('serve:') && e.coins + e.xp + e.pearls + e.eggs > 0);
    seen.current = game.ledger.length;
    if (!fresh.length) return;
    const sum = (k: 'coins' | 'xp' | 'pearls' | 'eggs') => fresh.reduce((n, e) => n + e[k], 0);
    const text = (['coins', 'xp', 'pearls', 'eggs'] as const).filter((k) => sum(k)).map((k) => `+${sum(k)} ${k === 'xp' ? 'XP' : G.UNIT[k]}`).join(' · ');
    setPop((p) => ({ text, tick: p.tick + 1 }));
  }, [game.ledger]);

  if (!game.cafeName) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>Hồ cá của tôi</Text>
        <Text style={styles.sub}>Một góc nước yên tĩnh, lớn lên cùng thói quen ghi chép của bạn.</Text>
        <Card style={{ marginTop: 16, gap: 14 }}>
          <Intro icon={<Pix id="fish-clown" size={34} />} title="Chăm cá mỗi ngày" text="Ghi giao dịch và rà soát mỗi ngày để nhận xu, lên cấp, đón cá mới và trang trí hồ." />
          <Intro icon={<Pix id="fish-gold" size={34} />} title="Sưu tầm từng chút" text="Chi trong ngân sách để nhận ngọc trai và trứng, đổi lấy cá mới." />
          <Intro icon={<View style={{ width: 34, alignItems: 'center' }}><Icon name="gift" size={26} color={C.primary} /></View>} title="Phần thưởng là ảo" text="Xu, ngọc, cá không đổi ra tiền thật. Nghỉ vài ngày cũng không mất gì." />
        </Card>
        <SectionTitle>Tên hồ cá</SectionTitle>
        <TextInput value={name} onChangeText={setName} placeholder="Ví dụ: Hồ Mây" placeholderTextColor={C.faint} maxLength={24} style={styles.input} accessibilityLabel="Tên hồ cá" />
        <Button label="Tạo hồ cá" onPress={() => startCafe(name)} style={{ marginTop: 12 }} />
      </ScrollView>
    );
  }

  const t = today();
  const ctx: G.Ctx = { transactions, plan, budgets };
  const lv = G.level(game.xp);
  const water = waterStatus(ctx, t);
  const streak = habitStreak(game, ctx, t);
  const linkedGoal = naming ? goals.find((g)=>g.fishId===naming.id) : undefined;
  function feedNow() {
    const why = feedFishToday();
    if (why) { notify('Chăm cá',why); return; }
    setFeedTick((n)=>n+1);
  }
  const shown = (where: G.Item['where']) => G.ITEMS.filter((i) => i.where === where && game.items.includes(i.id) && !game.hidden.includes(i.id));
  const loggedToday = transactions.some((x) => x.date === t);
  const reviewed = game.reviewed.includes(t);
  const limit = G.dailyLimit(ctx, t);
  const spentToday = G.spent(ctx, (d) => d === t);
  const week = G.reviewedThisWeek(game, t);
  const lastMonth = addMonths(monthKey(t), -1);
  const has = (key: string) => game.ledger.some((e) => e.key === key);

  function donePlacing(id: string, x: number | null) {
    if (x !== null) placeItem(id, x);
    setPlacing(null);
  }

  function buy(item: G.Item) {
    confirm(`Mua ${item.name}?`, `Giá ${item.cost} ${G.UNIT[item.currency]}.`, () => {
      const why = buyItem(item.id);
      if (why) return notify('Chưa mua được', why);
      if (item.fish) {
        setReveal((r) => ({ item, tick: (r?.tick ?? 0) + 1 }));
        setPane('pond');
      }
    }, 'Mua');
  }

  const fishInfo = naming ? G.ITEMS.find((i) => i.id === naming.id) : undefined;
  const doneToday = [has(`first-tx:${t}`), reviewed, has(`budget-day:${t}`)];
  const nextUp = !doneToday[0]
    ? 'Ghi giao dịch đầu tiên hôm nay để nhận 10 xu, 5 XP và 3 phần thức ăn.'
    : !doneToday[1]
      ? 'Rà soát hôm nay để nhận 10 xu, 5 XP và 2 phần thức ăn.'
      : !doneToday[2] && limit <= 0
        ? 'Đặt kế hoạch để nhận ngọc khi chi trong ngân sách.'
        : 'Hôm nay bạn đã làm xong phần của mình. Hẹn mai nhé.';
  const banner = (
    <Pressable onPress={() => setPane('missions')} style={styles.banner} accessibilityRole="button">
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 15, fontWeight: '500' }}>Nhiệm vụ hôm nay</Text>
          <Text style={{ fontSize: 13, color: C.primary, fontWeight: '500' }}>{doneToday.filter(Boolean).length}/3 hoàn thành</Text>
        </View>
        <Text style={{ fontSize: 13, color: C.sub, marginTop: 4, lineHeight: 19 }}>{nextUp}</Text>
      </View>
      <Icon name="chevron-forward" size={18} color={C.faint} />
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1} numberOfLines={1}>{game.cafeName}</Text>
          <Text style={{ color: C.sub, marginTop: 2 }}>Cấp {lv} · Khu vườn dưới nước</Text>
        </View>
        <Chip id="coin" value={game.coins} label="xu" />
        <Chip id="pearl" value={game.pearls} label="ngọc trai" />
      </View>
      <View style={{ marginTop: 10, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <ProgressBar value={(game.xp % G.XP_PER_LEVEL) / G.XP_PER_LEVEL} height={5} />
        </View>
        <Text style={{ fontSize: 12, color: C.sub }}>{game.xp % G.XP_PER_LEVEL}/{G.XP_PER_LEVEL} XP{game.eggs ? ` · ${game.eggs} trứng` : ''}</Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingHorizontal: 4 }}>
        <Text style={{ color: C.sub, fontSize: 12 }}>MỘT CHÚT BÌNH YÊN MỖI NGÀY</Text>
        <Button label={focus ? 'Xong' : 'Chỉ ngắm'} kind="soft" onPress={() => { setFocus(!focus); setPane('pond'); setNaming(null); }} />
      </View>
      {!focus ? <View style={styles.segment}>
        {PANES.map(([id, label]) => (
          <Pressable key={id} onPress={() => setPane(id)} style={[styles.segItem, pane === id && { backgroundColor: C.card }]} accessibilityRole="tab" accessibilityState={{ selected: pane === id }}>
            <Text style={{ fontSize: 12.5, fontWeight: '500', color: pane === id ? C.ink : C.sub }} numberOfLines={1}>{label}</Text>
          </Pressable>
        ))}
      </View> : null}

      {!focus ? <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:10,marginTop:12,paddingHorizontal:4}}>
        <Icon name="nutrition-outline" size={19} color={C.primary}/><Text style={{fontSize:13}} accessibilityLabel={`${game.food} phần thức ăn`}>{game.food} phần thức ăn</Text>
        <Text style={{color:C.sub,fontSize:12}}>· {streak} ngày ghi chép</Text>
      </View> : null}
      <RewardPop text={pop.text} tick={pop.tick} />
      <Animated.View style={{ opacity: fade }}>
      {pane === 'pond' ? (
        <>
          <AquariumExperience
            health={water.health}
            goalStages={Object.fromEntries(goals.map((g)=>[g.fishId,goalStage(g)]))}
            customFish={customFish.filter(f => f.inPond)}
            fish={[...shown('pond').filter((i) => i.fish).map((i) => i.id), ...customFish.filter(f => f.inPond).map(f => f.id)]}
            decor={shown('pond').filter((i) => !i.fish).map((i) => i.id)}
            names={Object.fromEntries(shown('pond').map((i) => [i.id, game.names[i.id] || i.name]).concat(customFish.map(f => [f.id, f.name])))}
            care={game.fishCare ?? {}}
            placed={game.placed}
            feedTick={feedTick}
            placing={placing && placing in POND_SPOTS ? placing : null}
            onPlaced={donePlacing}
            onFish={(id) => { if (focus) return; if (id.startsWith('custom-')) return; if (!focus) setNaming({ id, text: game.names[id] ?? '' }); }}
          />
          <Reveal item={reveal?.item} tick={reveal?.tick ?? 0} />
          {!focus ? <Pressable accessibilityRole="button" accessibilityLabel="Xem nhịp chi tiêu" onPress={onPlan} style={[styles.banner,{padding:12}]}><Icon name="water-outline" color={C.primary}/><View style={{flex:1}}><Text style={{fontSize:13,fontWeight:'500'}}>{water.label}</Text><Text style={{color:C.sub,fontSize:12,lineHeight:18,marginTop:3}}>{water.limit>0?`Đã chi ${fmtShort(water.actual)} · Nhịp đến hôm nay ${fmtShort(water.expected)}`:water.hint}</Text></View><Icon name="chevron-forward" size={16} color={C.faint}/></Pressable> : null}
          {!focus && naming && fishInfo ? (
            <Card style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 80, height: 58 }}><ZenFish id={fishInfo.id} days={game.fishCare?.[fishInfo.id]?.days ?? 0} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '500' }}>{fishInfo.name}</Text>
                  <Text style={{ fontSize: 12.5, color: C.sub, marginTop: 2 }}>
                    {G.growthLabel(game.fishCare?.[fishInfo.id]?.days ?? 0)} · về hồ ngày {shortDate(game.ledger.find((e) => e.key === `buy:${fishInfo.id}`)?.at ?? game.startedAt)}
                  </Text>
                </View>
                <Pressable onPress={() => setNaming(null)} hitSlop={12} accessibilityLabel="Đóng">
                  <Icon name="close" size={20} color={C.sub} />
                </Pressable>
              </View>
              <Text style={{ color: C.sub, fontSize: 13, lineHeight: 20, marginTop: 10 }}>{profileOf(fishInfo.id).description}</Text>
              <Text style={{ color: C.primary, fontSize: 12, marginTop: 10 }}>{profileOf(fishInfo.id).rarity} · {Math.min(7, game.fishCare?.[fishInfo.id]?.days ?? 0)}/7 ngày chăm sóc</Text>
              <View style={{ marginTop: 8 }}><ProgressBar value={(game.fishCare?.[fishInfo.id]?.days ?? 0) / 7} height={5} /></View>
              <Text style={{ color: C.sub, fontSize: 12, marginTop: 6 }}>Cá nhỏ → Cá non (3 ngày) → Trưởng thành (7 ngày)</Text>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 12 }}>
                <TextInput value={naming.text} onChangeText={(text) => setNaming({ ...naming, text })} placeholder="Đặt tên cho cá" placeholderTextColor={C.faint} maxLength={20} style={[styles.input, { flex: 1, backgroundColor: C.bg }]} accessibilityLabel="Tên của cá" />
                <Button label="Lưu" onPress={() => { renameItem(naming.id, naming.text); setNaming(null); }} />
              </View>
              {linkedGoal ? <View style={{gap:8,marginTop:12}}><Text style={{fontWeight:'500'}}>{linkedGoal.name} · {Math.round(goalProgress(linkedGoal)*100)}%</Text><ProgressBar value={goalProgress(linkedGoal)}/><Text style={{fontSize:12,color:C.sub}}>Đã góp {fmtShort(contributed(linkedGoal))} / {fmtShort(linkedGoal.target)}</Text><Button label="Xem mục tiêu & góp thêm" kind="soft" onPress={()=>setPane('goals')}/></View> : null}
              <Button label="Cho ăn" kind="soft" onPress={feedNow} style={{ marginTop: 10 }} />
            </Card>
          ) : !focus ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <Text style={{ flex: 1, color: C.sub, fontSize: 12.5, lineHeight: 18, paddingHorizontal: 4 }}>Chạm vào cá để xem và đặt tên. Chạm vào nước để tạo sóng.</Text>
              <Button label="Cho cá ăn" kind="soft" onPress={feedNow} />
            </View>
          ) : null}
          {!focus ? <><Text style={{ color: C.sub, fontSize: 12, marginTop: 12, textAlign: 'center' }}>Mỗi lần cho ăn dùng 1 phần · Ghi chép hoặc rà soát để nhận thêm. Nghỉ vài hôm cũng không mất cá.</Text>
          {banner}</> : null}
        </>
      ) : null}

      <View style={{ display: pane === 'studio' ? 'flex' : 'none' }}><FishStudio onPond={() => setPane('pond')} /></View>
      {pane === 'goals' ? <GoalsPanel /> : null}
      {pane === 'catalog' ? <Bestiary /> : null}
      {pane === 'missions' ? (
        <>
          <SectionTitle>Hôm nay</SectionTitle>
          <Card style={{ paddingVertical: 4 }}>
            <Mission done={has(`first-tx:${t}`)} title="Ghi giao dịch đầu tiên" reward="10 xu + 5 XP + 3 thức ăn" action={loggedToday ? undefined : ['Ghi', onAdd]} />
            <View style={styles.sep} />
            <Mission done={reviewed} title={loggedToday ? 'Rà soát giao dịch hôm nay' : 'Xác nhận hôm nay không phát sinh'} reward="10 xu + 5 XP + 2 thức ăn" action={reviewed ? undefined : [loggedToday ? 'Đã rà soát' : 'Xác nhận', reviewToday]} />
            <View style={styles.sep} />
            {limit > 0 ? (
              <Mission
                done={has(`budget-day:${t}`)}
                title="Trong ngân sách ngày"
                reward={`1 ngọc khi rà soát · đã chi ${fmtShort(spentToday)} / ${fmtShort(limit)}`}
                warn={spentToday > limit}
              />
            ) : (
              <Mission done={false} title="Trong ngân sách ngày" reward="Cần đặt kế hoạch để nhận ngọc" action={['Đặt', onPlan]} />
            )}
          </Card>

          <SectionTitle>Tuần này</SectionTitle>
          <Card>
            <Mission done={has(`week:${G.weekStart(t)}`)} title={`Rà soát ${G.WEEK_GOAL} ngày trong tuần`} reward={`3 ngọc + 30 xu · ${Math.min(week, G.WEEK_GOAL)}/${G.WEEK_GOAL} ngày`} flush />
            <View style={{ marginTop: 10 }}>
              <ProgressBar value={week / G.WEEK_GOAL} height={5} />
            </View>
          </Card>

          <SectionTitle>Tháng</SectionTitle>
          <Card style={{ paddingVertical: 4 }}>
            {G.canClose(game, lastMonth, t) ? (
              <Mission done={false} title={`Chốt ${monthLabel(lastMonth)}`} reward="Trong ngân sách: 10 ngọc + 1 trứng" action={['Chốt', () => confirm(`Chốt ${monthLabel(lastMonth)}?`, 'Hãy chắc là bạn đã ghi đủ giao dịch của tháng. Chốt rồi không tính lại.', () => closeMonth(lastMonth), 'Chốt')]} />
            ) : (
              <Mission done={game.closedMonths.includes(lastMonth)} title={`Chốt ${monthLabel(monthKey(t))} khi hết tháng`} reward="Trong ngân sách: 10 ngọc + 1 trứng" />
            )}
          </Card>

          <SectionTitle>Sổ thưởng</SectionTitle>
          <Card style={{ paddingVertical: 4 }}>
            {game.ledger.length === 0 ? <Text style={{ color: C.sub, paddingVertical: 12 }}>Chưa có phần thưởng nào. Ghi một giao dịch để bắt đầu.</Text> : null}
            {[...game.ledger].reverse().slice(0, 60).map((e, n) => (
              <View key={e.key}>
                {n ? <View style={styles.sep} /> : null}
                <View style={styles.item}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14.5 }}>{e.label}</Text>
                    <Text style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{shortDate(e.at)}</Text>
                  </View>
                  <Text style={{ fontSize: 13.5, fontWeight: '500', color: e.coins + e.pearls + e.eggs < 0 ? C.sub : C.primary }}>
                    {(['coins', 'xp', 'pearls', 'eggs', 'food'] as const).filter((k) => e[k]).map((k) => `${(e[k] ?? 0) > 0 ? '+' : ''}${e[k]} ${k === 'food' ? 'thức ăn' : k === 'xp' ? 'XP' : G.UNIT[k]}`).join(' · ')}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {pane === 'shop' || pane === 'inventory' ? (
        <>
          {pane === 'inventory' && game.items.length <= 1 ? (
            <Text style={{ color: C.sub, marginTop: 16, paddingHorizontal: 4, lineHeight: 20 }}>Kho mới chỉ có con cá đầu tiên. Sang Cửa hàng để sắm thêm cá và đồ trang trí hồ.</Text>
          ) : null}
          {(['pond'] as const).map((where) => {
            const list = G.ITEMS.filter((i) => i.where === where && game.items.includes(i.id) === (pane === 'inventory'));
            if (!list.length) return null;
            return (
              <React.Fragment key={where}>
                <SectionTitle>{pane === 'shop' ? 'Cá & trang trí' : 'Bộ sưu tập của bạn'}</SectionTitle>
                <Card style={{ paddingVertical: 4 }}>
                  {list.map((i, n) => {
                    const locked = lv < i.level;
                    const stored = game.hidden.includes(i.id);
                    return (
                      <View key={i.id}>
                        {n ? <View style={styles.sep} /> : null}
                        <View style={styles.item}>
                          <Pix id={(i.id === 'cat' ? 'cat_1' : i.id) as AssetId} size={36} />
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '500' }}>{i.name}</Text>
                            <Text style={{ fontSize: 12.5, color: C.sub, marginTop: 2 }}>
                              {pane === 'inventory' ? (stored ? 'Đang cất trong kho' : i.fish ? G.growthLabel(game.fishCare?.[i.id]?.days ?? 0) : 'Đang bày') : locked ? `Mở ở cấp ${i.level}` : `${i.cost} ${G.UNIT[i.currency]}`}
                            </Text>
                          </View>
                          {pane === 'shop' ? (
                            <Button label="Mua" onPress={() => buy(i)} disabled={locked || game[i.currency] < i.cost} />
                          ) : (
                            <>
                              {i.id in SPOTS && !stored ? (
                                <Button label="Đặt chỗ" kind="soft" onPress={() => { setPlacing(i.id); setPane('pond'); }} />
                              ) : null}
                              <Button label={stored ? (i.fish ? 'Thả cá' : 'Bày') : 'Cất'} kind="soft" onPress={() => toggleItem(i.id)} />
                            </>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </Card>
              </React.Fragment>
            );
          })}
          {pane === 'shop' && G.ITEMS.filter((i) => i.where === 'pond').every((i) => game.items.includes(i.id)) ? <Text style={{ color: C.sub, marginTop: 16, paddingHorizontal: 4 }}>Bạn đã mua hết mọi thứ trong cửa hàng.</Text> : null}
        </>
      ) : null}

      </Animated.View>
    </ScrollView>
  );
}

/** Phần thưởng mới: nhãn "+10 xu" hiện giữa cảnh rồi bay lên ví ở góc trên phải. */
function RewardPop({ text, tick }: { text: string; tick: number }) {
  const p = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!tick) return;
    p.setValue(0);
    Animated.timing(p, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start();
  }, [tick, p]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.pop, {
        opacity: p.interpolate({ inputRange: [0, 0.08, 0.8, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateX: p.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0, 90] }) },
          { translateY: p.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, -14, -190] }) },
          { scale: p.interpolate({ inputRange: [0, 0.35, 1], outputRange: [1, 1.08, 0.55] }) },
        ],
      }]}
    >
      <Pix id="coin" size={16} />
      <Text style={{ color: C.invInk, fontWeight: '500', fontSize: 14 }}>{text}</Text>
    </Animated.View>
  );
}

/** Hoạt cảnh mở khóa cá mới: con cá phóng to bật ra giữa hồ cùng tia sáng, rồi tan đi. */
function Reveal({ item, tick }: { item?: G.Item; tick: number }) {
  const p = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!tick) return;
    p.setValue(0);
    Animated.timing(p, { toValue: 1, duration: 2400, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [tick, p]);
  if (!item) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.reveal, { opacity: p.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] }), transform: [{ scale: p.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.3, 1.15, 1] }) }] }]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Pix id="sparkle" size={14} />
        <Pix id={item.id as AssetId} size={56} />
        <Pix id="sparkle" size={14} />
      </View>
      <Text style={{ fontSize: 14, fontWeight: '500', color: '#0A3A52', marginTop: 4 }}>{item.name} đã về hồ!</Text>
    </Animated.View>
  );
}

function Chip({ id, value, label }: { id: AssetId; value: number; label: string }) {
  return (
    <View style={styles.chip} accessibilityLabel={`${value} ${label}`}>
      <Pix id={id} size={16} />
      <Text style={{ fontSize: 13.5, fontWeight: '500', fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}

function Intro({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '500' }}>{title}</Text>
        <Text style={{ color: C.sub, marginTop: 2, lineHeight: 20 }}>{text}</Text>
      </View>
    </View>
  );
}

function Mission({ done, title, reward, action, warn, flush }: { done: boolean; title: string; reward: string; action?: [string, () => void]; warn?: boolean; flush?: boolean }) {
  return (
    <View style={[styles.item, flush && { paddingVertical: 0 }]}>
      <Icon name={done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={done ? C.primary : C.faint} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '500' }}>{title}</Text>
        <Text style={{ fontSize: 12.5, color: warn ? C.warn : C.sub, marginTop: 2 }}>{done ? 'Đã nhận' : reward}</Text>
      </View>
      {action && !done ? <Button label={action[0]} kind="soft" onPress={action[1]} /> : null}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  h1: { fontSize: 24, fontWeight: '500', color: C.ink, paddingHorizontal: 4 },
  sub: { color: C.sub, marginTop: 4, paddingHorizontal: 4, lineHeight: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.card, paddingHorizontal: 10, minHeight: 32, borderRadius: 999 },
  pop: { position: 'absolute', alignSelf: 'center', top: 230, zIndex: 2, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: C.inv },
  reveal: { position: 'absolute', alignSelf: 'center', top: 44, zIndex: 2, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: R.lg, paddingHorizontal: 18, paddingVertical: 12 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: R.lg, padding: 16, marginTop: 12 },
  input: { backgroundColor: C.card, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  segment: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 4, backgroundColor: C.line, borderRadius: R.md, padding: 4, marginTop: 16 },
  segItem: { flexGrow: 1, flexBasis: '30%', alignItems: 'center', justifyContent: 'center', minHeight: 40, borderRadius: R.md - 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: C.line },
}));
