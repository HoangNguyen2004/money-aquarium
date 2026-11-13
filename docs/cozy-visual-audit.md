# Cozy Money Café — visual audit and art pipeline

## Scope

Visual-only change. `src/game/sim/cafe.ts`, rules, store, reward ledger and navigation remain unchanged. Existing owned/hidden items, placement coordinates, order callbacks and reduced-motion behavior are retained. The aquarium scene stays on its existing renderer.

## Audit

The old renderer already used React Native Images, not PixiJS Graphics. Its source, `scripts/make-game-assets.mjs`, drew rectangles and character grids at 180×160 scene units, then enlarged them six times. Characters contained only 12×20 unique pixels. Enlarging the PNG did not add detail.

Replacement targets: room, counter, machine, pastry case, barista poses, customer poses, plant, sofa, radio, picture, cat and menu thumbnails. Simple geometric light, steam, dust and invisible hitboxes are appropriate to keep. No furniture or people are drawn with CSS or Graphics in the new café.

## User reference

The reference was supplied in conversation after the first art pass. The final room and counter were regenerated using that image as the art-direction reference. No user reference file was found locally; no copy is silently bundled.

Reference palette: deep turquoise tiled walls, seafoam sky, cream clouds, warm reddish amber beams, coral/cream checkerboard floor. Tall rectangular windows and overlapping shelves create depth. The counter has open shelves full of jars, tins and stacked crockery. Fine grain/dither rather than enlarged coarse pixels. A small chibi behind the counter, with larger foreground guests.

The first ornate arched-window background and carved counter were discarded from the app. Final images are new generated artwork, not the reference flattened into a playable scene.

## Assets and composition

Generated with the built-in `image_gen` tool. Production files live in `assets/game/cozy/`; the separate hand-maintained renderer is `src/game/view/CozyArt.tsx`. Running the legacy `npm run assets` does not overwrite this subdirectory.

- `room.png`: architecture, sky, shelves, hanging leaves, lamps and floor. No baked-in barista, machine, display case or furniture on floor.
- `counter.png`: transparent open-shelf wooden counter. Separate from the room and characters.
- `characters-props.png`: 4×4 transparent atlas: machine, pastry case, sofa, plant; barista idle/blink/walk1/walk2; work/happy and two guest poses; boy guest poses, cat, radio.
- `guests.png`: 4×2 transparent atlas with two additional customer designs and dedicated idle, two walking poses and happy pose. All four simulation look IDs have distinct designs.
- `details.png`: 3×2 transparent atlas: framed painting, coffee, tea; cake, cloud, curled cat. Initial output had an opaque background and was rejected; a second background-removal generation produced real alpha, validated by decoding the PNG.

Draw order: room → masked drifting cloud → lamp glow → optional picture → animated barista → counter → cake case/radio/machine → steam → optional floor furniture/cat → guest/order bubble → subtle dust → touch regions. Machine and pastry case appear once. The guest stands in front; barista lower body is occluded by the service counter.

Room uses `cover` with preserved source aspect ratio. Sprites use source cell proportions; no tiny legacy sprites are enlarged for café furniture or characters. Scene remains 180×160 simulation units, responsive and capped at 620 display points. Screen HUD stays outside the art. Shop/inventory thumbnails reuse the same assets.

## Prompt set

Art direction shared by all prompts: high-detail modern cozy anime pixel illustration, fine clusters, warm natural light, turquoise/cream/coral/honey wood, no coarse 8-bit shapes, no UI, no text.

Room prompt: use user reference for art direction; square architecture layer; deep turquoise square tiles and warm wood beams; huge rectangular windows with seafoam sky/cream clouds and distant foliage; narrow ingredient shelf; trailing leaves and two simple lamps; lower part pink/cream checkerboard floor and diagonal sunlight; exclude counter, machines, people and floor furniture; exclude arched windows and ornate carving.

Counter prompt: isolated transparent straight front-view open-shelf warm wood cafe counter; stacked plates, mint tins, jars and bowls in two lower shelves; entirely empty worktop; no machine, cake, character, wall or floor; fine pixel grain matching reference.

Main atlas prompt: exact 4×4 grid with transparent gutters; espresso machine, curved glass pastry case, coral sofa, flowering plant; four barista idle/blink/walking poses; barista work/happy, girl customer idle/walk; boy customer idle/walk, orange cat and radio; detailed faces, clothing and materials; consistent proportions.

Details prompt: exact 3×2 atlas; painting, cappuccino, iced tea, cake slice, cloud, curled cat. Follow-up: remove background only, preserve exact object positions and opaque whites inside object silhouettes, genuine alpha.

## Commands

```sh
node scripts/check-cozy-assets.mjs
npm run typecheck
npm test
npx expo export --platform web --output-dir dist
node scripts/prepare-cafe-preview.mjs
```

`dist/cafe-preview.html` is a separate actual-app review entry using synthetic saved game data and selecting the existing café tab. Use a dedicated disposable browser profile. It is not a production route and does not change defaults or touch the user's real saved game. It is recreated after each export.

## Remaining quality work / limits

Generated atlas art is a significant visual replacement, not a claim of final hand-authored pixel animation. Some atlas silhouettes approach cell boundaries and should receive an artist's trim/pivot pass. The two original guest designs have one illustrated walking pose each (movement is still animated); the cat reuses one walking image rather than a true two-frame gait. Barista has dedicated idle, blink, two walk, work and happy drawings.

The background's baked clouds stay still; a subtle additional cloud moves inside a window mask. Hanging background foliage is static; the independently owned plant sways. Sunlight and environment shadows are painted into the room; there is no dynamic relighting. Furniture and character atlases have a softer, more ornamental treatment than the reference's grainy architecture; a future artist pass can tighten the match further.

The five PNGs total roughly 11 MiB uncompressed file transfer. No lossy compression was applied to pixel textures. Native Android/iOS device appearance and GPU memory have not yet been measured. The existing APK in the root is not rebuilt by a web export.

Additional guest prompt: exact 4×2 transparent grid, blonde ponytail girl in teal overalls and bespectacled chestnut-haired boy in rust cardigan; each has idle, two walking poses, happy holding cup, consistent high-detail chibi anime pixel style.

## Verification evidence

- `npm run typecheck`: passed.
- `npm test`: receipt, reward/game rules, fish simulation and café simulation all passed.
- `node scripts/check-cozy-assets.mjs`: all five PNGs passed resolution/alpha validation; total 10.69 MiB.
- Expo production web export: passed.
- `shots/cafe-mobile.png`: actual app at 390×844, inspected after correcting clipped sofa and counter placement.
- `shots/cafe-320-served.png`: actual app at 320×740 after programmatically pressing the correct existing order button. Coins increased from 120 to 123; daily rewarded sales remaining decreased from 10 to 9. This confirms the view still triggers the existing serve/reward flow. The customer had left by capture time.
- Screenshots use synthetic test balances. No real financial records were modified.

The screenshot script reports some images as “loaded but invisible.” React Native Web uses a visible CSS background and a hidden `<img>` for the same Image; the actual screenshots show these layers correctly. This warning is not a missing-asset claim. The unchanged floating add button overlaps the mission card at 320px; it is outside the game art and was retained as requested for existing navigation.

Comparison against the user reference: matching turquoise rectangular-window architecture, cream cloud layers, open wooden storage shelves, checkerboard floor and warm sunlight. Characters now have readable faces/hair/clothing. Remaining mismatch is the softer ornamentation of some generated props and character art; visual parity with hand-authored reference art is not claimed.

### Frontend skill gate

`GATE: FAIL 28 (round 1 of 3)`. No waivers were added and the checker was not changed. This is not a passed quality gate. The gate is designed for marketing websites; the brief requires keeping the React Native app and its navigation. Rebuilding the app into marketing sections to clear it would violate that scope.

Open finding categories (the full machine output is in `.taste-skill/gate.json` and `.taste-skill/gate/`):

- `empty-visual` ×4: React Native Web's hidden image elements; visible background-image counterparts verified in screenshots.
- `spill` ×2: deliberately cropped multi-cell atlas images inside sprite masks.
- `tilt`: required plant swaying animation.
- `copy-headline`, `copy-actions`, `moment-none`, `hero-screen` ×3, `one-section` ×2, `container-edges` ×4, `row-lines`, `off-grid`, `container`: landing-page conventions, incompatible with retaining the current app layout and its three order buttons.
- `overlap-text`: existing floating assistant action over mission text on desktop; not introduced by the art renderer.
- `text-contrast` ×2 and `contrast`: existing pane/mission muted labels and dimmed order buttons. Removed the new renderer's whole-button opacity so order labels retain full contrast; this later scoped correction was typechecked and exported.
- `collide` ×2 at 320: checker measures the untruncated café name (screenshot shows ellipsis with separated balances), plus existing floating assistant button over text. The latter remains a real pre-existing layout issue outside this game-art change.

13 nonblocking warnings: image buttons/order controls, button wording, heading scale, centered labels, copy length and image captions (the app's game instructions). Copy lint could not run because the existing React Native application has no marketing `<main>/<section>/<h1>` structure. There is no website palette/hero deal, assumed business detail, invented branding, external photo slot, contact form or canonical domain in this scoped game-art edit. Colors and composition come from the user's reference. No web performance score is claimed.

Final tablet check: `shots/cafe-tablet.png` at 768×1024 inspected; the 620-point scene cap keeps the room proportional, the barista is behind the counter, furniture stays within the frame, and HUD/menu remain outside the artwork. `shots/cafe-mobile.png` was refreshed from the final export after restoring the finished-brew sparkle and correcting order-label opacity. The gate's count above records the earlier run; it was not presented as a clean final pass.
