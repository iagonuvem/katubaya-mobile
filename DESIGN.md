# katūbayá design guidelines

How the katūbayá interface is designed, and how to keep it that way. Since October 2026 the app
is a **farm game**: the farm map is home, the weekly ritual is the mission, and every feature is
a place on the map or a move. The visual source of truth is the design canvas
**"Katūbayá mobile gamificado"** (claude.ai artifact `4JzTVUjXqjHjNRhZw1jucL`), built on the
**Katūbayá** design system (artifact `YFD9pHx4QozAxX8NiV9tUZ`). This document turns that canvas
into rules for the code.

The rules are still grounded in Apple's Human Interface Guidelines (HIG), applied as principles to
a web PWA. Where a rule comes from the HIG the page is cited as `page.md › Heading`; the pages are
vendored under `.claude/skills/apple-design/references/hig/`.

The interface language is pt-BR with an en locale. This document is in English, like the rest of
`docs/`; UI copy examples stay in pt-BR.

## 1. Purpose and thesis

katūbayá has one job: a farmer standing in the field logs what the farm produced in a few taps,
and once a week turns that log into a sellable WhatsApp message. The game exists to make that
week feel like tending a place, never like filling forms.

- **Thesis.** Fast, offline, one hand, and alive. The map shows the farm as it is today.
- **Signature element.** The playable map (`/`): plots, pens, the storehouse (paiol), the market
  stall (feira), the ritual board and the processing house, each a button. Little people on the
  map act out what the farm needs right now: harvesting a ready plot, scouting an unobserved one,
  watering a dry one, hoeing an empty bed, milking, collecting eggs, carrying a crate to the paiol.
- **Second signature.** The weekly ritual: Observar → Colher → Paiol → Feira → Mandar → Guardar.
  Each step lights up by itself when its action happens. A closed ritual grows the farm tree.
- **Feeling.** Calm competence with a toy-like warmth: soil and paper, raised "game" buttons
  that sink when pressed, sprites with soft 3D shading. Delight comes from the farm reacting to
  real work, not from points.

Apple's eight principles (`design-principles.md`) are the first filter for any screen:

| Principle | What it means here |
| --- | --- |
| Purpose | Each screen has one job. If a control does not serve it, cut it. |
| Agency | People can skip optional steps, undo with an adjustment, and never lose data silently. |
| Responsibility | Data stays on the device. Claims are true: "Funciona sem internet: Pronto" only shows once the service worker is active. |
| Familiarity | Bottom navigation, sheets, back buttons and forms behave like the platform. |
| Flexibility | Works at 375 px, at 200 % text, light and dark, keyboard and screen reader. |
| Simplicity | The map summarises; details live one tap away in a sheet or a screen. |
| Craft | Spacing, alignment, wording and motion are finished. No placeholder controls. |
| Delight | The farm reacts. Never a score, a streak or a countdown (§9). |

## 2. Platform scope and navigation

React + Vite + Tailwind PWA, local-first on Dexie (IndexedDB), installable with a Workbox service
worker (`vite-plugin-pwa`, app shell precached). The HIG applies as principles and foundations,
not as native conventions (`cross-platform.md`).

- **Home is the map.** Every other screen is one or two taps from it and has a Back (‹) or Close
  (×) button in the top-left. Flows that create something (Colher, Plantar, Processar, Observar,
  Novo Lote, Ajustar Cabeças, Abrir talhão) use × and end on a "done" state with two buttons:
  do another / go back to the farm.
- **Bottom navigation:** Sítio | raised **+** | Mandar. The + opens the **mochila** (quick
  actions bottom sheet). On the map, Mandar copies the current market list straight to the
  clipboard; elsewhere it opens the Feira. Deliberate deviation (`tab-bars.md › Best practices`):
  the bar holds one action button because logging production must be reachable from every screen.
- **Sheets** (`sheets.md`): map sheets float above the bottom bar with a grabber; the mochila and
  pickers are modal with a scrim. All sheets close by drag-down (80 px), Escape, or the × button,
  and move focus inside.
- **Width.** Phone layouts are designed at 390 px and centred at `max-w-[480px]`. The rules board
  (`/regras`) is a page that grows to three columns on wide screens.

### Screen inventory

| Route | Artboard | Notes |
| --- | --- | --- |
| `/` | Sítio · mapa jogável | Map, HUD, sheets for plot, pen, paiol, feira, ritual, terreno, indústria |
| (sheet) | Mochila · ações rápidas | Opened by the + button, from any screen |
| `/colher` | Colher · wizard em 3 toques | `?talhao=`, `?produto=`; `?lote=` uses the animal-production step |
| `/colher?lote=` | Registrar Produção · ordenha (passo 3) | Lot rows with a check, "Vira um lote no estoque" |
| `/paiol` | Paiol · estoque e frescor | Crates by product, lots with life bars |
| `/paiol/ajustar` | Ajustar paiol | `?lote=`; Somar only with Correção |
| `/paiol/lote/:id` | Lote no estoque · de onde veio | Trace through processing and slaughter |
| `/feira` | Feira da semana · disponibilidade | Toggle, nudge, WhatsApp preview, copy |
| `/feira/banca` | Montar banca | Farm name, contact, header, footer |
| `/produtos` | Coleção · culturas como cartas | Tabs Produtos / Lotes de Animais |
| `/produtos/:id`, `/produtos/nova` | Carta · cultura e variedades | Edit turns the card into a form |
| `/ajustes` | Ajustes · baú e backup | Chest, farm, notifications, appearance, about |
| `/regras` | Sistema de jogo · regras | Live: ritual, tree, Broto, seeds |
| `/talhao/:id` | Talhão · vista e camadas | Plot view, layers, weekly harvest chart, signs |
| `/talhao/:id/plantar` | Plantar · roça, horta ou pasto | Cards in hand, tap holes |
| `/talhao/novo` | Abrir talhão | 9 × 3 grid of 2 × 2 m squares |
| `/observar` | Observar talhão · sinais da mata | Five signs, photo, note |
| `/avisos` | Notificações | Generated on the phone |
| `/animais` | Produtos · aba Lotes de Animais | Grouped by species |
| `/animais/:id` | Lote de animais · produção e histórico | Daily chart, head history |
| `/animais/novo`, `/:id/editar` | Novo Lote de animais | |
| `/animais/:id/ajustar` | Ajustar Cabeças · com abate | `?motivo=slaughter`; meat becomes a lot |
| `/processar` | Processar · leite em queijo | `?entrada=`; FIFO bars per lot |

## 3. Color

Tokens live once in `src/index.css` as hex custom properties (light on `:root`, dark on `.dark`)
and are exposed to Tailwind as `surface`, `surface-raised`, `ink`, `canopy`… (`tailwind.config.ts`).
The shadcn HSL variables are kept only so the vendored primitives in `src/components/ui/` stay in
the same palette; new UI uses the katūbayá tokens.

### Tokens

| Token | Role | Light ("Daylight") | Dark ("Understory") |
| --- | --- | --- | --- |
| `surface` | Page ground: unbleached paper / humus | `#f0ede3` | `#151810` |
| `surface-raised` | Cards, rows, inputs, sheets | `#faf8f2` | `#1e2317` |
| `surface-sunken` | Segmented tracks, life-bar track, disabled | `#e5e1d3` | `#0e100a` |
| `line` | Hairlines, the hard shadow of raised controls | `#cfc9b7` | `#353c2a` |
| `line-strong` | Borders that mean something: secondary button, inputs, dashed empties | `#857c66` | `#717b5d` |
| `ink` / `ink-muted` | Text / secondary text | `#1e2316` / `#5a5d4c` | `#ebe7d9` / `#a7a994` |
| `canopy` | The brand green: primary button, selected chip, fresh, links | `#2d5a28` | `#8fcb6b` |
| `canopy-soft` / `on-canopy` | Selected ground / label on canopy | `#d9e9cc` / `#ffffff` | `#223a1e` / `#121a0e` |
| `canopy-edge` | Hard shadow under canopy buttons | `#1b3a17` | `#4d7a37` |
| `river` (+ `-soft`) | Information, observing, milk, scouting | `#1d5d70` | `#80c6d8` |
| `amber` (+ `-soft`) | Waiting, expiring soon, "next step", ready to harvest | `#7a5200` | `#e6b84b` |
| `amber-bright` | Pulsing "ask" dots and amber life bars (not text) | `#d79a2b` | `#e6b84b` |
| `urucum` (+ `-soft`) | Expires today / expired, errors, delete | `#a3321c` | `#f09076` |

### Contrast (computed, WCAG)

| Pair | Light | Dark |
| --- | --- | --- |
| `ink` on `surface` | 13.7:1 | 14.5:1 |
| `ink-muted` on `surface-raised` / `surface-sunken` | 6.4 / 5.2 | 6.7 / 8.0 |
| `canopy` text on `surface-raised` / on `canopy-soft` | 7.6 / 6.3 | 8.4 / 6.5 |
| `on-canopy` on `canopy` (primary label) | 8.1 | 9.3 |
| `river` on `river-soft` | 5.7 | 7.2 |
| `amber` on `amber-soft` / on `surface-raised` | 5.5 / 6.5 | 7.5 / 8.7 |
| `urucum` on `urucum-soft` / on `surface-raised` | 5.3 / 6.5 | 6.3 / 6.8 |
| `line-strong` on `surface` (non-text, 3:1) | 3.5 | 4.0 |
| Map pin text `#1e2316` on pin `#faf8f2` | 15.1 | same (the scene is not themed) |

Recompute with the helper at the end of this file whenever a token changes.

### Illustration palette

The map, the plot view and product art are drawings, not UI. Their colors are fixed and do not
follow the theme: map grass `#8fbf5a`, roads `#d2ad72`, fences `#e6d3a8` with posts `#a88a58`,
soil `#b07a43` / beds `#8a5a2b`, pasture `#a8d06e`, coop yard `#d9b77a`, pig yard `#a07a4c`.
Product art backgrounds and dots by category live in `src/components/game/crop.ts` (Frutas
`#f3e5c0`/`#d79a2b`, Hortaliças `#d9e9cc`/`#2d5a28`, Ervas and Laticínios `#d1e6ec`/`#1d5d70`,
Raízes and Carnes `#f5dcd3`/`#a3321c`…). Text drawn on art is always `#1e2316` (12:1+ on every
pastel), never `ink`, so it stays dark in dark mode.

### Rules

- **One color, one meaning** (`color.md › Best practices`). Amber is waiting/expiring/next;
  urucum is today, expired, error and delete; canopy is primary and fresh. Never amber for emphasis.
- **Status is never color alone** (`color.md › Inclusive color`). Every life bar has its words
  ("Vence em 3 dias"), every pin has a label, every pulsing dot sits next to text.
- **At most one canopy fill per view** for the primary action (sheets may have one primary in the
  action grid; it moves with the plot's state).
- Never dim a container that holds controls below 4.5:1. The only dimmed rows are switched-off
  market items, whose switch, name and buttons remain operable and labelled.

## 4. Typography

Two self-hosted faces (`@fontsource`, latin + latin-ext, offline): **Kanit** for everything,
**IBM Plex Mono** for quantities, money, dates in stats and step counters. Hierarchy by size and
weight (`typography.md › Conveying hierarchy`).

| Role | Class | Size / line | Weight |
| --- | --- | --- | --- |
| Screen title | `kb-title` | 28 / 34 | 500 |
| Sub-screen title (flows, detail) | `kb-title-sm` | 26 / 32 | 500 |
| Card title on a hero (Carta) | — | 30 / 36 | 500 |
| Section | `kb-h2` / `kb-h3` | 20 / 26 · 18 / 24 | 500 |
| Sheet title | — | 22 / 28 | 500 |
| Body | default | 16 / 24 | 400 |
| Secondary | `kb-sub` | 14 / 20 | 400 |
| Hint | `kb-hint` | 13 / 18 | 400 |
| Caption, chart labels | `text-xs` | 12 / 16 | 400–500 |
| Display number (dial, stepper) | `kb-mono` | 40–48 | 500 |

- Minimum 11 px (chart values only); everything readable is ≥ 12 px.
- Numbers that matter are the biggest thing on their card and are monospaced; units follow in the
  same face or in `ink-muted`.
- Money: `Intl.NumberFormat(lang, { style: 'currency', currency: 'BRL' })` (`fmtMoney`). The HUD
  uses the compact form (no cents).
- Do not block zoom; containers with text use `min-h-*`.

## 5. Layout, shape and depth

- **Gutter** 16 px, vertical rhythm 12–16 px between blocks (`kb-screen` is a flex column with
  `gap-4`). Screens with the bottom bar pad `112px + safe area`; flows pad 24 px.
- **Radii.** Icon buttons 12, inputs 14, chips full, tap buttons 16, cards 18–22, hero cards 22–26,
  sheets 24 (map) / 28 (modal), map tiles 6–10.
- **Depth is a hard shadow, not blur.** Raised controls carry `0 3px 0 var(--line)` (secondary)
  or `0 4px 0 var(--canopy-edge)` (primary); pressing translates them down and eats the shadow.
  Floating things (sheets, toast, HUD) use soft shadows.
- **Safe areas.** The HUD, headers and fixed bars pad themselves with `--safe-area-top/bottom`.
- **Reach.** Primary actions sit at the bottom of flows (`mt-auto`), full width, 56 px tall.
- **Stacking over squeezing.** Long names wrap; rows never truncate a quantity.

## 6. Components

All in `src/components/game/` and `src/index.css` (`@layer components`).

| Need | Use | Notes |
| --- | --- | --- |
| Screen header | `ScreenHeader` | Back/close icon button, optional eyebrow, sub and one right action |
| Primary / secondary / disabled / delete | `kb-tap kb-tap-go / -alt / -off / -danger` | `kb-tap-md` = 48 px; disabled keeps focus and uses `aria-disabled` |
| Choice among a few | `kb-chip` (+ `kb-chip-on`), as `role="radio"` in a `radiogroup` | Filters use `kb-chip-ink` and `aria-pressed` |
| Two to three views | `kb-segs` + `kb-seg` | Tabs use `role="tab"`; links use `aria-current` |
| Picture choice (reason, type, species) | `kb-pick` | Icon + label, raised |
| Quantities | `kb-stepper` around a `kb-mono` number; quick chips (−1, −5, Tudo) | 56 / 48 / 44 px |
| On/off | `kb-switch` (`role="switch"`) | 52 × 32, excluded from the 44 px rule |
| Status | `StatusPill` (tone + dot + words) | |
| Freshness | `LifeBar` + `lifeLabel()` | Bar = share of shelf life left; 8 % on the last day |
| Product art | `CropArt` | Crate sprite when drawn, else the initial on the category pastel |
| Date of an event | `WhenRow` | "Agora · sáb, 31 out" + Mudar reveals a date field capped at now |
| Saved | `DoneBanner` + summary card + two buttons | |
| Feedback | `showToast()` + `GameToast` | Dark pill above the bottom bar, 2.6 s, `role="status"` |
| Bottom sheet | `BottomSheet` (`variant="map" \| "modal"`) + `SheetHead` | Drag, Escape, focus |
| Bottom bar | `BottomNav` | `active="sitio"` on the map, plots and lots |

Rules carried over: every icon-only control has `aria-label`; cards that open something are links
or buttons, never `div` + `onClick`; destructive actions confirm in a modal sheet whose title is a
question ("Excluir Banana?").

## 7. The map and the game system

### Layout (`src/components/map/layout.ts`)

The scene is a 390-px-wide stage scaled to the screen width. The top band is fixed: paiol
(6, 96), ritual board (182, 186), market stall (242, 116). Plots stack from y = 284 in two
masonry columns (x 14 w 158 / x 220 w 156, gap 14) with a road between them; a plot's height is
`zone.mapHeight`, else by type (canteiro 100, linha 172, agrofloresta 206, pomar 160, pasto 150,
abrigo 120), and new plots get `heightForArea()`. Below a road, animal pens and the processing
house fill rows of two (188 / 142 wide, rows 178 then 138 tall). The free land closes the map and
holds the farm tree. The seed farm reproduces the canvas exactly.

### What each tile shows (`Tiles.tsx`)

Plots grow what is planted in their 6 × `gridRows` grid: canteiros draw beds with a sprite per
planted hole, linhas draw rows (the tall row sways), agroflorestas scatter trees, shrubs and roots
by stratum, pastures draw grass. Empty beds show ploughed lines. Pens draw up to six cows, eight
hens, four pigs, five goats/sheep or hives, by head count.

### Plot states (`plotStatus` in `domain/rules/farm.ts`)

| State | Rule (first that applies) | Pin | Who acts on the map |
| --- | --- | --- | --- |
| vazio / preparando | No plantings; preparando when observed in the last 14 days | Vazio (dashed dot) / Preparando solo | Farmer hoeing, dust |
| pasto | Only forage, or a pasture zone | Pasto | — |
| observar | Not observed for 14 days | Observar | Operator scouting |
| seco | Last observation: dry soil | Solo seco | Operator with water drops |
| pronto | A planting passed its cycle, or was harvested here in 14 days | Pronto p/ colher (pulsing) | Farmer harvesting, "+1" |
| crescendo | Anything else | Crescendo | — |

The primary button in the plot sheet follows the state (Colher, Observar, Plantar or Abrir).
Pens pulse when the daily product (a species' `animalYield: 'collect'` product produced on 2+ of
the last 7 days) has not been logged today. The processing house pulses while there is stock of
a product that something is made from. The porter walks while the market list is out of date; a
customer waits at the stall once it is sent.

### Weekly ritual (`ritual`)

| Step | Lights up when, this ISO week |
| --- | --- |
| Observar | An observation was saved (also from signs noted while harvesting) |
| Colher | Any production was logged |
| Paiol | A stock adjustment was made, or production happened and nothing is expired |
| Feira | A list was generated this week and stock has not changed since |
| Mandar | The list was copied to WhatsApp |
| Guardar | A chest (export) was saved |

A complete week is recorded once in `ritualWeeks`; the farm tree grows with them: Semente 0,
Broto 1, Muda 4, Árvore 12. A skipped week freezes the tree; nothing withers.

### Notifications (`notifications`)

Generated on the phone from the data, grouped Hoje / Esta semana, ids deterministic so read state
sticks (`notificationReads`): lots expiring today or expired (urucum, Ajustar), one reminder per
product expiring in 1–3 days (Processar when it can become something else), plots ready, dry,
unobserved, empty for 3+ weeks or close to harvest, the market list out of date or missing, daily
animal production not logged, and the chest older than 6 days. Categories can be muted in Ajustes.

### Broto and saved seeds

Broto, the guide, speaks the top notification as one calm sentence, without exclamation marks, in
one of four moods (tranquilo, explicando, comemorando, avisando). Saved seeds are personal
achievements shown on `/regras`: first harvest, 4 markets sent, 10 cards, first chest, 5 roles in
the forest, zero loss in the month.

### What the game never does

Rankings or comparing farms; countdowns, lost lives or streaks that reset; asking for an account or
sending data out unless the farmer exports; trading the storehouse's truth for points; hiding a
feature. Any new mechanic must pass this list.

## 8. Iconography and art

- **Icons:** the stroke set in `src/components/game/Icon.tsx` (24 × 24, 1.75 stroke, round caps),
  drawn for the canvas. It is the only icon set in new screens. Decorative icons are
  `aria-hidden`; meaningful ones get `label`.
- **Sprites:** `src/assets/game/*.webp` (2× display size): agricultora, operadora, carregador,
  cliente, paiol, indústria, galinheiro, crates (banana, cacau, mandioca) and Broto's four moods;
  `logo.svg` and `grafismo.svg` (the band on the rules board). Look them up with `sprite()` /
  `cropSprite()`. Scene plants and animals are SVG symbols in `SceneDefs.tsx`.
- No emoji in chrome. The WhatsApp message itself carries none either.

## 9. Motion

All motion is defined in `src/index.css` and `src/components/map/map.css`:

| Name | Duration / easing | Use |
| --- | --- | --- |
| `kb-up` | 240 ms `cubic-bezier(.2,.8,.2,1)` | Sheets rising |
| `kb-rise` / `kb-step-in` | 220–240 ms ease-out | New cards, wizard steps, tab panels |
| `kb-toast` | 260 ms ease-out | Toast |
| `kb-pop` | 520 ms spring-like | Done states, confetti |
| `kb-drop` | 700 ms | The harvest crate falling into place |
| `kb-fresh` | 400 ms | Market list just regenerated |
| `kb-sprout` | 260 ms | A seedling appearing in a hole |
| `kb-pulse` (`kb-ask`, `map-ask`) | 1.6 s loop | "Needs you" dots, next ritual step |
| Map loops | 0.4–12 s | sway, harvest, hoe, dust, scout, drops, graze, peck, roam, wig, walk, gain, steam |
| Press | 90 ms | Raised buttons sink 2–4 px |

`prefers-reduced-motion: reduce` stops every loop and hides the decorative particles ("+1",
dust, drops, gains); state changes still happen.

## 10. Writing and i18n

Voice: a knowledgeable neighbour, direct and warm; Portuguese as spoken on a farm.

- **Every string goes through `t()`.** Strings live per screen in
  `src/i18n/locales/<lang>/<screen>.json`, merged at startup. Tests assert that both languages
  have the same keys, that every literal key used in code exists, and that plural keys are always
  called with `count`.
- **Plurals** with `_one` / `_other` (and `_zero` where it reads better).
- **Buttons say what happens** ("Guardar no paiol", "Copiar para o WhatsApp", "Registrar
  Processamento"); Title Case on buttons and screen titles, sentence case elsewhere.
- **Vocabulary (fixed):** Produto, Produção, Lote, Lote de animais, Cabeças, Zona ou pasto,
  Processamento, Abate, Ajuste; game words: Sítio, Paiol, Feira, Banca, Carta, Coleção, Talhão,
  Cova, Ritual, Baú.
- **The WhatsApp message stays in pt-BR** whatever the UI locale: it is content for customers.
- Numbers and dates follow the active language via `src/lib/format.ts`.

## 11. Accessibility floor

- Contrast per §3 in both themes; recompute on any token change.
- Controls ≥ 44 × 44 (switch 52 × 32); the map's hit areas cover whole tiles.
- Every map element is a real `<button>` with a spoken label ("Talhão Linha da banana, Pronto p/
  colher") and `aria-expanded`; the scene drawing is `aria-hidden`.
- Radio groups, tabs, switches and toggles expose their state (`aria-checked`, `aria-selected`,
  `aria-pressed`); progress bars expose values; charts have a text `aria-label` with the numbers.
- Sheets move focus inside, close with Escape and return focus.
- Nothing by color alone; Reduce Motion respected; zoom and text scaling work.

## 12. Dark mode

Follows the system by default (`next-themes`, class strategy); Ajustes › Aparência overrides with
Claro / Escuro / Sistema for this app only — a deliberate deviation from `dark-mode.md › Best
practices`, kept because the owner asked for it. Dark ("Understory") tokens are not inversions:
canopy turns light green with a dark label, urucum turns coral. The map scene and product art keep
their daylight colors in both themes; UI chrome around them (HUD, sheets, bars) follows the theme.

## 13. Data the screens rely on

Schema 1.2.0 (Dexie v3) adds: `Zone.type/size/gridRows/mapHeight/sun/water` (plots),
`Planting` (cells of a plot's grid, stratum, count unit), `Observation` (phase, pollinators,
pests, disease, soil, note, photo), `RitualWeek`, `NotificationRead`, `Crop.layer/cycleDays/
isForage/species/animalYield/derivedFromCropId`, `AvailabilityList.sentAt`,
`AppSettings.mutedNotifications`. All game state is derived by pure functions in
`src/domain/rules/farm.ts` (tested in `farm.test.ts`); screens read one live snapshot
(`useFarm`) and write through `src/data/actions.ts`.

## 14. Review checklist for a PR

1. Which artboard or rule does the change follow? If none, which principle does it serve?
2. New colors are tokens (or illustration colors in the documented files)? Contrast recomputed?
3. New controls: real elements, 44 px, labels, state exposed, keyboard reachable?
4. New strings in both locales, plural keys with `count`, verb on the button?
5. 375 px, 200 % text, light and dark, Reduce Motion?
6. Does the map still tell the truth about the farm? Does the change pass §7 "never does"?

## 15. Review log

**2026-10-17, full-codebase review (HIG lenses 1–5).** Status contrast, safe areas, focus ring,
Reduce Motion, 44 pt targets, real buttons, AlertDialog for deletes, i18n of all strings. Rating
after: Good.

**2026-10-30, livestock expansion.** Animal lots, processing FIFO, the `dozen` unit.

**2026-10-31, the farm game.** The whole interface was rebuilt from the "Katūbayá mobile
gamificado" canvas: new design system (Kanit + IBM Plex Mono, soil/canopy/river/amber/urucum
tokens with a dark "Understory" theme), the playable map as home with sheets for every place,
the weekly ritual and farm tree, Broto, saved seeds, notifications generated on the phone, plots
with plantings and observations, and 22 phone screens plus the rules page. The PWA service worker
is now registered, so "Funciona sem internet" is true once it activates. Verified in Chromium at
390 px in light and dark and at 1440 px for the rules page, with an end-to-end run of the main
flows (market update and send, milking, processing, slaughter with meat, planting, observing,
opening a plot, new animal lot, stock adjustment, new card, notifications, language switch).

Open: a designed app icon (the PWA icons are still placeholders); a tablet layout for the phone
screens; per-lot picking in processing (FIFO is automatic); photos are stored downscaled inside
observations and travel in the full-history export as data URLs.

Contrast helper (Node): paste hex pairs and run.

```js
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const lum=c=>{const f=x=>x<=0.03928?x/12.92:((x+0.055)/1.055)**2.4;const[r,g,b]=c.map(f);return .2126*r+.7152*g+.0722*b};
const ratio=(a,b)=>{const[x,y]=[lum(hex(a)),lum(hex(b))].sort((p,q)=>q-p);return((x+.05)/(y+.05)).toFixed(1)};
console.log(ratio('#7a5200','#f3e5c0')); // amber on amber-soft: 5.5
```
