# Aquarium artwork manifest — 12/11/2026

The active aquarium uses original code-native SVG illustrations in `src/game/view/ZenArt.tsx`; there are no new downloaded or generated bitmap assets and no third-party image licenses to resolve.

| Entity | Structure | Animated parts | Growth detail |
|---|---|---|---|
| `fish-gold` | Rounded goldfish body, gill line, scalloped scales, translucent split veil tail | Tail, dorsal fin, pectoral fin | Shorter juvenile tail, scales from juvenile, adult fin rays |
| `fish-clown` | Elongated body, 3 cream bands with dark borders, compact fan tail | Tail and pectoral fin | Larger relative fry eye; adult scale marks |
| `fish-puffer` | Rounded body, olive dorsal spots, cream belly, small tail | Rapid pectoral fin, dorsal fin, tail | Larger relative fry eye; adult spine outlines |
| `fish-shrimp` | Segmented curved abdomen, rostrum, antennae, swimming legs, tail fan | Antennae, alternating legs, abdomen/tail | Fewer division marks on fry, adult speckling |
| `fish-turtle` | Head/neck, patterned shell, four limbs and tail | Opposing front/hind paddles | Simplified fry shell, juvenile central plate, adult plate joins |
| Water | Depth gradient, light shafts, sand, plants, suspended particles | Slow light intensity, leaves and particles | N/A |
| Decorations | Faceted rock, lotus | Static | N/A |

Species metadata, swimming cadence, speed, size, phase offset and preferred depth are in `src/game/species.ts`. Rarity is a game label. The mixed ecosystem is illustrative and does not specify real aquarium compatibility.

The legacy pixel atlas remains in the repository for data/assets compatibility. It is not the source of active fish illustrations. The small heart, coin and pearl effects still use legacy icons.

Validation: TypeScript and simulation/reward tests passed. Headless Chrome checked 390px and 1024px layouts, five residents, feeding/persistence, once-per-day growth, pause/resume, focus mode, species detail panel and shop/inventory. Device FPS, native SVG performance and long-running battery use remain unmeasured.
