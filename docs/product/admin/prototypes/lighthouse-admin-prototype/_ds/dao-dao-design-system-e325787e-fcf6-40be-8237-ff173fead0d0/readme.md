# 島島阿學 Dao Dao — Design System

A design system for **島島阿學 (Dao Dao)**, a Taiwanese open-source community for **self-directed learning (自主學習)**, founded 2020. The current product is a mobile-first **micro-learning-habit app**: learners pick a 7–30 day plan, **check in (打卡)** each day, track streaks, take a "learning DNA / archipelago" personality quiz, and encourage each other in a community.

The brand metaphor is an **archipelago of islands** — every learner is their own island, charting their own course, yet part of a connected sea. Visuals lean warm, friendly and encouraging: rounded dome shapes, a teal/yellow/orange palette, soft shadows and lots of breathing room.

## Sources
- Brand assets provided by the user (`uploads/`, copied into `assets/`): horizontal/vertical logo lockups (中文 + English, dark + reversed) and a square brand graphic.
- Color palette provided directly by the user (see Colors below).
- Product context (learning plans, 打卡 check-ins, learning-DNA quiz, community) synthesized from the public product **daodao.so** and the community's mission. No codebase or Figma file was provided — UI kits are brand-faithful recreations, not 1:1 copies of production code.

---

## CONTENT FUNDAMENTALS

**Language.** Traditional Chinese (繁體中文, Taiwan). English appears only in the logo/wordmark and the occasional label. Write CJK with `--ls-zh` tracking for breathing room.

**Voice.** Warm, gentle, encouraging — like a supportive friend, never a coach barking targets. The product lowers the stakes of learning: *"不用考試、不用比較"* (no exams, no comparison).

**Person.** Second person **你** ("you") to the learner; the community refers to members as **島民** ("islanders"). Avoid corporate "we"; when the brand speaks it's *"島島陪你…"* ("Dao Dao keeps you company…").

**Tone & casing.** Soft imperatives and invitations, not commands: *"開始我的學習旅程"*, *"今天想前進一點嗎？"*, *"和島民一起前進"*. Questions and ellipses are welcome. No ALL CAPS. English labels use Title Case or lowercase, never shouty.

**Emoji.** Used **sparingly and warmly** — a single ☀ in a greeting, 🔥 for a streak. Never decorative rows of emoji. Prefer the brand's own dome/island shapes over emoji for structural UI.

**Numbers.** Framed encouragingly: *"連續 5 天"*, *"day 7 / 30"*, *"1,280 位島民正在學"*. Streaks and day counts use the mono font.

**Examples**
- CTA: 「開始我的計畫」 / 「免費加入」 / 「看看別人怎麼學」
- Encouragement: 「每天前進一點點」 / 「學習路上不再一個人」
- Empty/prompt: 「想學點什麼呢？」

---

## VISUAL FOUNDATIONS

**Color.** Three "island" brand colors + a slate ink:
- Teal `#16b9b3` — primary, the default island; buttons, links, progress.
- Yellow `#f9e41c` — spark/highlight; high-energy CTAs and accents (always on ink/dark text).
- Orange `#ffa10b` — energy/warmth; secondary accent island.
- Slate `#536166` — the wordmark color, used for soft ink.
Supporting: cyan wash `#f3fdff` (page background), gray wash `#f4f6f6` (alt surface), deep ink `#0f3036` (dark sections, headings), light blue `#99ecff` (soft accent/halos). The neutral ramp is cool and teal-leaning, never pure gray. Imagery and surfaces read **cool, bright and airy**.

**Type.** Rounded and friendly. Display/Latin = **Nunito** (rounded geometric, ~the DAO DAO wordmark); CJK body/UI = **Noto Sans TC**; data/streaks = **DM Mono**. Headings are heavy (800) with slightly tight tracking; body is generous (16px / 1.65) for comfortable CJK reading. *(Font substitution — see Caveats.)*

**Shape & radius.** The **half-dome (semicircle)** is the core motif — it's literally the islands in the logo. Buttons, tags, chips and avatars are fully **pill/round** (`--radius-pill`); cards use generous 20–28px corners (`--radius-lg`/`--radius-xl`); the island shape itself is `--radius-dome` (`999px 999px 0 0`). Nothing is sharp-cornered.

**Backgrounds.** Mostly flat, bright washes (cyan/white). Occasional soft blurred color halos behind hero imagery (light-blue circle, blurred). Dark sections use deep ink `#0f3036` with the island mark. No photographic full-bleeds by default, no busy patterns, no heavy gradients — at most a subtle one-color directional wash (e.g. a fade up from the page color behind sticky CTAs).

**Shadows.** Soft and **cool-tinted** (based on ink `rgba(15,48,54,…)`), never harsh black. Scale `--shadow-xs → xl`. Brand moments may use colored glows (`--glow-teal/yellow/orange`).

**Cards.** White (or soft-tint) surface, 1px hairline border `--border-soft`, `--radius-xl` corners, `--shadow-sm` at rest. Interactive cards **lift** (`translateY(-3/4px)` + `--shadow-lg`) on hover. Plan cards carry an island-colored cover band with a half-dome.

**Borders.** Hairline `--border-soft` (#e0e7e9) for dividers/cards; `--border-brand` (teal) for focused inputs and outline buttons. Dashed teal outline signals an empty/pending check-in.

**Motion.** Gentle and a little playful. Standard easing `--ease-out`; the check-in stamp uses `--ease-bounce` for a satisfying pop. Durations 140/220/360ms. Hover = subtle lift or `brightness(1.04)`; **press = scale down** (0.92–0.96). No spinning, no infinite decorative loops, respect reduced-motion.

**Focus.** 4px soft teal ring (`--ring-focus`).

**Transparency & blur.** Sticky nav and the app tab bar use `rgba(255,255,255,.85–.92)` + `backdrop-filter: blur(12px)`. Used only for floating chrome, not decoration.

**Layout.** Max content width 1120px (`--container`), narrow 760px for prose/CTA. 4px spacing base; section rhythm ~88–96px vertical. Mobile screens are 390px wide; hit targets ≥ 44px.

---

## ICONOGRAPHY

No official icon set was provided with the brand assets, and there is no codebase to extract a sprite/font from. Current approach:
- **Brand marks / illustrations:** real PNG assets in `assets/` (logos + extracted island mark). Use these, never redraw them.
- **Structural "icons":** prefer the brand's own **dome/island shapes** drawn with CSS `border-radius` (see the Island motif card) over generic icons.
- **UI glyphs (tab bar, feature bullets):** currently **placeholder Unicode glyphs** (◐ ○ ♡ ✓). **These are substitutions and flagged for replacement.**
- **Emoji:** only the rare warm accent (☀ 🔥), never as a primary icon system.

**Recommendation / open question:** adopt a single rounded, soft-stroke icon set to match the friendly geometry — **Phosphor (regular/duotone)** or **Lucide** are the closest CDN-available matches. Confirm a preference and whether the brand has its own icons, and we'll wire it in and replace the placeholders.

---

## INDEX

**Root**
- `styles.css` — single entry point; `@import`s all tokens + fonts (link this in consumers).
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `radius.css`, `shadows.css`, `fonts.css`.
- `assets/` — logos (horizontal/vertical, 中/EN, dark/white), `logo-square.png`, extracted `mark-islands.png`.
- `SKILL.md` — Agent-Skills-compatible entry for using this system.

**Components** (`components/core/`) — React primitives on `window.DaoDaoDesignSystem_e32578`:
`Button`, `Tag`, `Card`, `Avatar`, `ProgressBar`, `Input`, `CheckInButton` (the 打卡 stamp), `PlanCard` (learning-plan content card). Each has `.jsx` + `.d.ts` + `.prompt.md`; `core.card.html` is the specimen.

**Foundation cards** (`guidelines/*.card.html`) — Colors (primary, supporting, neutrals, semantic), Type (display, body), Spacing (scale, radius & elevation), Brand (logos ×2, island motif).

**UI kits**
- `ui_kits/app/` — the learning-habit mobile app: Login → Today/check-in → Explore → Plan detail.
- `ui_kits/landing/` — the marketing site: hero, features, popular plans, CTA.

---

## CAVEATS
- **Fonts are substituted.** The wordmark's custom rounded faces are approximated with **Nunito** (display/Latin) + **Noto Sans TC** (CJK) + **DM Mono** (data) from Google Fonts. Upload the official brand fonts to swap them in.
- **No official icon set** — UI glyphs are placeholder Unicode (see Iconography). Awaiting confirmation of a set.
- **No codebase/Figma** was provided; UI kits are brand-faithful recreations from the public product + brand assets, not production-code copies. Copy is representative, not lifted verbatim.
