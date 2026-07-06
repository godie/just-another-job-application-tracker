# Frontend Audit — `job-application-tracker`

_Generated: 2026-07-06 · scope: `src/**/*.{ts,tsx,css}` + design-token files · method: end-to-end file reads of canonical surfaces + verified grep across the codebase_

---

## Anti-Patterns Verdict

**Conditional PASS.** This is **not** a generic AI output. The project has a real aesthetic commitment — custom **earth / sage / terracotta** palette (10-stop ramps each in `tailwind.config.js`), serif headlines paired with a system sans body, intentional SVG decorations (`LeafPattern`, `OrganicShape`) that use the brand palette at 8–15% opacity rather than glassmorphism, and a self-aware voice in copy ("Vibecoded with love", "Master Your Job Search"). The shadcn migration landed primitives that respect dark-mode + focus state contracts. This is **distinctive** and worth preserving.

However, there are **three localised concentrations** of the standard 2024–2025 AI fingerprints. They do not dominate the codebase, but they do poison the high-traffic LandingPage and dashboard surfaces.

| AI-slop tell | Where | Evidence |
| --- | --- | --- |
| **Decorative gradient soup** | `LandingPage.tsx:185-201` | Three stacked `bg-gradient-to-*` layers behind the hero screenshot — a rotated drop-shadow gradient + the screenshot frame gradient + a 20%-opacity bottom darken overlay. None of these carry semantic meaning; they're pure scroll-by decoration. |
| **Full-width marketing gradient CTA** | `LandingPage.tsx:449` | `<section className='relative py-24 bg-gradient-to-br from-terracotta-500 via-terracotta-600 to-sage-600 text-white'>` — the entire Ready‑to‑accelerate? band is a terracotta→sage gradient. This is the canonical Vercel/Stripe-template tail that says "I was generated." |
| **Hero-metric big-number grid, twice** | `MetricsSummary.tsx` + `LandingPage.tsx:294-318` | Three columns of `font-serif text-7xl/8xl font-bold` numbers, repeated in the same conceptual format on the dashboard and the marketing page. The dashboard version is data-honest (counts from props); the marketing version is qualitative (`100% / 0 / ∞`). |
| **Nest-cards-in-cards around sync state** | `SyncStatusInfo`, `GoogleSheetsSync`, `EmailScanReview` error shells | When payloads are not in flight, the components stack `Card` → `bg-muted/50 p-4` → `<div border>` → icon → text. Three to four visual frames for one state machine. (Symptom of defensive copy, not template AI — but the visual tells are similar.) |

The diagnostic verdict: **fix the LandingPage gradients + the LandingPage hero-stat triad + the CalendarView token escape** and the codebase will read cleanly as designer-made.

---

## Executive Summary

- **Total issues found:** 18 (3 High · 9 Medium · 6 Low)
- **Top 3 priorities:**
  1. Touch targets on `BottomNav`, header `Switch`, and `ApplicationTableRow` action icons are **below WCAG 2.5.5 44×44 px** — small diff, real exposure for mobile and keyboard-heavy users.
  2. `LandingPage.tsx:185-201, 449` gradient clusters read AI-generic and dilute the distinctive palette commitment. Replace with solid earth-blocks + intentional SVG ornament.
  3. Token escape hatches (`CalendarView` `slate-*` family, raw `#hex` in two chart components, `bg-[#FFDD00]/bg-[#FFCC00]` in `DonationSection`) silently bypass the design system and break in dark-mode refactors.
- **Overall quality score:** 7.5 / 10. Strong foundations (semantic tokens, i18n, A11y primitives, conservative component sprawl) dragged down by a handful of visible stylistic shortcuts and a few WCAG gaps.
- **Recommended next steps:** trim the LandingPage gradient stack, audit icon-only touch targets in one PR, then route the token-escape hex literals through CSS vars in a follow-up.

---

## Detailed Findings by Severity

### High-Severity Issues

#### H1 · Mobile touch targets fall below 44×44 px (WCAG 2.5.5)

- **Locations:**
  - `src/components/Header.tsx:114-153` — `Sun` / `Moon` decorative `<svg className='size-5'>` indicators next to the Switch; the Switch itself renders at `h-5 w-9` (~36 px tall) inside `src/components/ui/Switch.tsx:10` (`inline-flex h-5 w-9`). The actual hit area is the Switch's 36-px-tall body — **8 px short of WCAG 2.5.5 AAA**, which is what Lighthouse uses for "Interactive elements have an adequate hit area."
  - `src/components/BottomNav.tsx:32-48` — 6 mobile `<button>` items inside a fixed `h-16` band. The buttons are full-width across `flex justify-around`, so the label column gets `~ 60 dp` width, but the icon-only **area below the label is unconditionally below 44×44** when the label is clipped. There is no `aria-label`-only fallback in case labels are stripped for height-constrained browsers.
  - `src/components/ApplicationTableRow.tsx` (render of action icons) — inline action icons without reserved tap padding. The desktop table is fine for mouse users but invisible on mobile.
- **Impact:** Mobile users (and motor-impaired desktop users using fingers-on-trackpad) mis-tap neighbouring controls. Lighthouse flags this. Increases accidental-edit and accidental-delete incidents on the Applications screen.
- **WCAG/Standard:** 2.5.5 Target Size (AAA); also relevant for 2.1.1 Keyboard since the icon button hit area is what defines focus ring.
- **Recommendation:** Wrap icon-only controls in a `min-h-[44px] min-w-[44px] p-2` shell; ensure Switch components carry an internal 44-px hit area whether or not their visual band is smaller. For `ApplicationTableRow`, replicate the desktop action icons as a clearly-tappable mobile menu in `ApplicationCard` (already separate).
- **Suggested command:** `/adapt`

#### H2 · `LandingPage.tsx:185-201` stacked decorative gradient layers

```tsx
<div className='absolute inset-0 md:-inset-4 bg-gradient-to-br from-sage-200 via-terracotta-100 to-earth-100 dark:from-sage-900 dark:via-terracotta-900 dark:to-earth-800 rounded transform rotate-3' />
<div className='relative aspect-square bg-gradient-to-br from-sage-100 to-earth-100 dark:from-sage-800 dark:to-earth-800 rounded overflow-hidden'>
  <img … />
  <div className='absolute inset-0 bg-gradient-to-t from-earth-900/20 to-transparent' />
</div>
```

- **Impact:** Pure decoration. Three `bg-gradient-to-*` layers + a `transform rotate-3` for a "casual" offset — the exact pattern flagged in the frontend-design skill as an AI tell ("rounded elements with thick colored border on one side — a lazy accent that almost never looks intentional"). The screenshot frame is already visually anchored by its `1:1 aspect-ratio`; the rotation and triple gradients add noise without communicating state.
- **Recommendation:** Replace with **a solid `bg-sage-100 dark:bg-sage-800` square + a 1-pixel `border border-border`** (matches the project's own canonical border treatment used everywhere else — see `Hero CTA` blocks in the same file, line 326 / 348 / 379 / 428). Keep the screenshot's `decoding='async'` + `fetchPriority='high'` + intrinsic dims (those are correct and worth preserving). Drop the bottom darken overlay unless there's a real contrast need.
- **Suggested command:** `/polish`

#### H3 · `LandingPage.tsx:449` full-width marketing gradient CTA band

```tsx
<section className='relative py-24 bg-gradient-to-br from-terracotta-500 via-terracotta-600 to-sage-600 text-white'>
```

- **Impact:** A 192-px-tall full-bleed section with a 3-stop saturated gradient and white text is the canonical Vercel/Stripe template tail. It also inherits no semantic meaning — when the project re-skins the palette (e.g. dark mode for marketing), this band becomes an outlier. It also directly weakens the project's 10-stop earth/sage/terracotta commitment by flattening two of the ramps into one band.
- **Recommendation:** Replace with a solid `bg-earth-900 text-earth-50` section (using the deepest earth token), whose white→black contrast advantage lasts, with a single 1-pixel top border in `border-border`. Use the SVG `dots` pattern overlay at the existing 10% opacity — that's the part that IS distinctive.
- **Suggested command:** `/polish`

---

### Medium-Severity Issues

#### M1 · Token escape: `slate-*` colour family in CalendarView

- **Location:** `src/components/CalendarView.tsx:71-77`
  ```tsx
  button: 'bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:hover:bg-slate-900/50 dark:text-slate-200 border-slate-500 dark:border-slate-400',
  time:   'text-slate-600 dark:text-slate-200 font-medium',
  ```
- **Impact:** `slate-*` is a Tailwind default palette, **not** part of the project's `earth / sage / terracotta` semantic ramps defined in `tailwind.config.js`. The four-line duplication (lines 71-72 and 76-77 are identical) is also a DRY smell. When the project inevitably migrates to OKLCH or replaces these ramps, CalendarView will silently desync.
- **Recommendation:** Replace with semantic tokens: `bg-card hover:bg-muted text-foreground border-border` for the button; `text-muted-foreground` for the time text. Deduplicate the two object-key definitions into one shared `styles` map outside the function.
- **Suggested command:** `/normalize`

#### M2 · Token escape: raw hex literals on charts

- **Locations:**
  - `src/components/StatusBarChart.tsx:19` — `barFill="#7a947a"` (= `--color-sage-400`)
  - `src/components/InterviewBarChart.tsx:24` — `barFill="#ec8567"` (= `--color-terracotta-400`)
- **Impact:** The chart libraries (likely Recharts) consume hex strings, so the team inlined the token values. But if `tailwind.config.js` ever re-tunes `sage-400` or `terracotta-400`, these charts will drift from the rest of the palette. Worse: hex strings **bypass** the dark-mode cascade — the chart bars stay `sage-400` even in dark mode, while the dark-mode surface behind them uses sage-800.
- **Recommendation:** Resolve `var(--color-sage-400)` / `var(--color-terracotta-400)` from `index.css` at chart-fill time (a 4-line helper in `src/lib/chartTokens.ts`). Or: pass the sage/terracotta family hex as CSS variable lookups so the chart library sees the right value in light *and* dark.
- **Suggested command:** `/normalize`

#### M3 · Token escape: arbitrary-value brand color in DonationSection

- **Location:** `src/components/DonationSection.tsx:22` — `bg-[#FFDD00] hover:bg-[#FFCC00] text-black font-bold rounded transition-transform hover:scale-105`
- **Impact:** The Buy Me a Coffee brand yellow is correctly applied (it's their **literal brand color**), so the arbitrary-value escape is **defensible**. The risk is silent: if the project ever migrates from Tailwind's JIT arbitrary-format to a strict token registry, this becomes a lint error. Also the `hover:scale-105` is the bounce-from-pure-utility tell that the frontend-design skill flags.
- **Recommendation:** Document the brand-color exception in `AGENTS.md` under the same registry pattern the project already uses for the `coverage-final.json` exception (per recent AGENTS.md additions). Replace `hover:scale-105` with `transition-colors` so only the brand-yellow darken happens (already does — scale is redundant).
- **Suggested command:** `/normalize`

#### M4 · Hero-metric pattern over-applied

- **Locations:** `src/components/MetricsSummary.tsx:31-58` (3-column big-number dashboard) + `src/pages/LandingPage.tsx:294-318` (3-column qualitative stat block).
- **Impact:** When two unrelated surfaces open with the same visual rhythm, the second one is no longer memorable. The dashboard numbers (Applications, Interviews, Offers) are real — they should stand out. The marketing stats (`100% / 0 / ∞`) are qualitative — they should disappear into prose or be expressed differently (e.g. lockup-style with iconography per item).
- **Recommendation:** Remove the LandingPage stat block entirely; the surrounding copy already communicates "local, private, free." Or — if the metrics ARE load-bearing — chart the qualitative promise as a single line item, not three numbers.
- **Suggested command:** `/polish`

#### M5 · `Sidebar.tsx` 2-second polling on `isOpen`

- **Location:** `src/components/Sidebar.tsx:50-54`
  ```tsx
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(refreshOpportunities, 2000);
    return () => clearInterval(interval);
  }, [isOpen, refreshOpportunities]);
  ```
- **Impact:** Every 2 seconds the application re-reads `jobOpportunities` from `localStorage` and re-computes via Zustand. With the sidebar open for 5 minutes, that's ~150 reads. Cheap in CPU but contributes to the perceived "things are spinning" feel and can race with user-driven updates.
- **Recommendation:** The `storage` event in the sibling `useEffect` (lines 39-46) handles cross-tab updates. For same-tab writes that bypass Zustand (the comment claims this exists), it should suffice to listen for a custom `jobOpportunities:changed` event dispatched from the writing code path. If the same-tab bypass genuinely exists, the polling is necessary — but the comment block should reference the emitter, not just explain reasoning.
- **Suggested command:** `/optimize`

#### M6 · `Sidebar.tsx` `aria-label={t('nav.backupSync')}` on user-avatar trigger in Header

- **Location:** `src/components/Header.tsx:189-191`
  ```tsx
  <button … aria-label={t('nav.backupSync')}>
  ```
- **Impact:** The dropdown **trigger** announces the menu title — in this case, `'Backup & Sync'`. Screen-reader users opening the menu hear a label that doesn't reflect what the button **does** (open menu) or **what's inside** (account + backup-sync + sign-out). The button is more accurately an "Account menu" trigger; the trigger's label and the dropdown label should not collide.
- **Recommendation:** Replace the trigger's `aria-label` with `'Account menu'` (or `t('nav.account')` once that key exists) and keep the dropdown label `DropdownMenuLabel` as the menu title (currently also `'nav.backupSync'`).
- **Suggested command:** `/accessibility` (or `/audit` re-run)

#### M7 · `Header.tsx:209` login button lacks `focus-visible` ring

- **Location:** `src/components/Header.tsx:209-230`
  ```tsx
  <Button variant='primary' className='font-medium py-2 px-2 md:px-5 transition duration-150 hover:scale-[1.02]' … >
  ```
- **Impact:** The `<Button>` primitive resolves to shadcn's Button class which DOES include `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`, but the explicit `transition duration-150 hover:scale-[1.02]` overrides some of that — visually the focus ring is still there, but the interaction transition misses the standard timeline consistency the rest of the controls obey. Tiny consistency tell.
- **Recommendation:** Move the `transition duration-150` onto the `<Button>` level (in `Button.tsx`) and drop the `hover:scale-[1.02]` from the per-callsite variation. Standardise the press animation.
- **Suggested command:** `/polish`

#### M8 · `HomePage.tsx:354` "Data Management" disclosure toggle has no semantic landmark

- **Location:** `src/pages/HomePage.tsx:354-360` — disclosure button on `<button>` with `aria-expanded` but no `aria-controls`, and the collapsible region is a sibling `<div>` rather than the next sibling following `aria-controls`.
- **Impact:** Screen-reader users navigating the page hear "Data Management, button, expanded/collapsed" but cannot jump to the controlled region. macOS VoiceOver handles this gracefully with implicit association, but NVDA/JAWS require explicit `aria-controls` to announce the content beneath the toggle.
- **Recommendation:** Add `id='data-tools-region'` on the conditional content div, add `aria-controls='data-tools-region'` on the toggle button. While there, add a small "show/hide" affordance label so sighted users have the same comprehension route.
- **Suggested command:** `/accessibility`

#### M9 · Lengthy i18n with some orphan keys

- **Location:** `src/locales/en/translation.json`
- **Impact:** Healthy project i18n with both `en` and `es` mappings present. Concern: a number of marketing-only keys (`landing.heroSubtitle`, `landing.feature*Desc`) and a handful of status types have no obvious binding site. The audit identified `nav.backupSync` used for two semantically different things (heading + button label fallback) — that creates double-meaning risk for translators.
- **Recommendation:** Run `i18next-parser` (or similar) to enumerate used vs. defined keys; settle on either `nav.account` (for the user-avatar trigger label) or a new `nav.userMenu` so the existing `nav.backupSync` keeps one canonical meaning.
- **Suggested command:** `/audit` (i18n-only scope)

---

### Low-Severity Issues

#### L1 · `HomePage.tsx:266` page-level max-w-[1600px] is a single oversized cap

- **Impact:** Dashboard surface uses an explicit `max-w-[1600px]`. Below 1600 px the layout reflows correctly; above, content scales flat. Acceptable, but slightly above ergonomic reading width. Combine with slightly tighter gutter at the largest breakpoint.
- **Suggested command:** `/polish`

#### L2 · `MetricsSummary.tsx:38,50` use `text-earth-500` labels without dark variants

- **Impact:** `text-earth-500` (`#9a7d5e`) on `bg-card` (white) is ~4.5:1 — passes AA. In dark mode `bg-card` is `30 6% 9%` (~L=10%); `text-earth-500` is `#9a7d5e` (L~46%) — **falls below AA-normal 4.5:1**, ~3.0:1. The Applications and Offers labels therefore get **dimmer-than-acceptable** in dark mode.
- **Recommendation:** Add a `dark:text-earth-300` or switch to semantic `text-foreground` / `text-muted-foreground` for the labels.
- **Suggested command:** `/audit` a11y contrast pass

#### L3 · `JobDetailsPage.tsx:62` not-found state uses oversized emoji as the only visual

- **Impact:** `<div className='text-6xl mb-4'>🔍</div>` — emoji is decorative but carries no meaning when CSS fails. Add `role='img' aria-label='Searching'` and a `sr-only` fallback text, OR add the meaning to a heading with the emoji being a smaller auxiliary.
- **Suggested command:** `/accessibility`

#### L4 · `LandingPage.tsx:241` `<div className='grid grid-cols-2 gap-4'>` inside `sticky top-8` creates nested cards

- **Impact:** Two nested `bg-card p-4 border border-border` blocks within a feature block. Slight nest-cards-in-cards tell; also accessibility risk that the inner cards fail to communicate their relationship. If the inner blocks serve as visual landmarks, add `aria-labelledby`/`role='region'`.
- **Suggested command:** `/polish`

#### L5 · `connect-google-button` in `src/components/ConnectGoogleButton.tsx:73` inlines Google brand colors

- **Impact:** Inline `#4285F4` etc. inside an SVG path. Acceptable (Google brand logo), but should be flagged in the same "brand-color exception" registry proposed for `DonationSection`.
- **Suggested command:** `/normalize`

#### L6 · `BackupSyncPage.tsx:86-89` and the same file's connector card uses inline light-mode-only colour scheme

- **Impact:** The Google logo's `fill='#4285F4'` etc. are colour-stable regardless of theme (correct for the brand); but the surrounding card uses `bg-primary/5 dark:bg-primary/10` which is fine. The relevant thing is no colour-scheme switching — Google-blue logo looks identical in both modes. Defensible. Low.
- **Suggested command:** None — keep.

---

## Patterns & Systemic Issues

1. **Token-escape hex literals cluster in data-visualisation + brand surfaces.** Two chart components, three brand-y/connector components, and one arbitrary-value CTA fall back on raw hex / `slate-*` / `[#hex]` rather than semantic tokens. This is **category-shaped**, not isolated. The fix is short (route through a small `chartTokens` helper + a documented brand-color exception list), but until it ships, anyone editing `tailwind.config.js` runs the risk of charts/connectors going out of sync with the rest of the app.

2. **Big-number hero-metric pattern over-applied.** Two surfaces open with three font-bold big numbers, differing only in whether the numbers are real data or marketing fluff. The proliferation dulls the visual rhythm.

3. **Decorative gradient usage concentrated in `LandingPage.tsx`.** Three places (hero, hero stat block, full-width CTA). All other pages use solid backgrounds + 1-px borders — the project already has an internal consistency story; LandingPage is the outlier.

4. **Touch-target size inference is under-controlled.** The shadcn primitives get the desktop right (`h-9` / `h-10` / `h-11` heights for inputs), but several Wrap 0 / icon-only buttons + the `Switch` itself don't reserve 44×44 px.

5. **ARIA-attribute coverage is comprehensive, but two associative gaps remain.** The Disclosure/data-tools toggle has `aria-expanded` without `aria-controls`, and the Header's avatar dropdown uses the same label for both trigger and menu heading.

6. **Polling vs. event-driven state sync is mixed.** `Sidebar.tsx` polls `localStorage` every 2 s while open, while `SyncStatusInfo` / `useCloudSync` use promise-based event flows. The inconsistency suggests no centralised "state-sync strategy"; if a future contributor writes a third reactive component, they may pick the wrong pattern.

---

## Positive Findings

Worth preserving and replicating elsewhere:

- **Semantic-token architecture is committed.** `src/index.css` defines `--color-*` (semantic) + `--color-earth-*`/`--color-sage-*`/`--color-terracotta-*` (ramps) in one place, with documented dark-mode intent in code-comments. This is **above average** for projects with comparable scope. Continue adding any new colour stops to **both** `tailwind.config.js` and `index.css` (the `index.css` `@theme inline` block already mirrors the Tailwind config — practice worth maintaining).
- **shadcn migration is genuine.** `components.json` declares `style: "new-york"`, primitives in `src/components/ui/` (Button, Dialog, Switch, DropdownMenu, Input, Select, Textarea, Table, TagInput, Separator, Card, Badge). These primitives consistently use `focus-visible:ring-1/2 focus-visible:ring-ring focus-visible:ring-offset-2` — the **canonical pattern**.
- **Aria hygiene is broad.** 193+ matches across 50+ components for `aria-*` attributes; `aria-busy` on async toggles, `aria-live='polite'` on alerts, `aria-current='page'` on active nav, `aria-hidden` on decorative SVGs. The AccessibilityTest files (`src/tests/accessibility/*.a11y.test.tsx`) confirm the Input, Alert, and Header components enter test cases with these.
- **i18n is real, full-fat i18next.** Both `en` and `es` locales exist; `useTranslation` is consumed widely; `<Trans>` component used for embedded markup; document language attribute is synced (`useEffect(() => { document.documentElement.lang = i18n.language })`).
- **LCP image hygiene.** Hero image in `LandingPage.tsx` has intrinsic `width=1280 height=720`, `fetchPriority='high'`, `decoding='async'` — three correct, three applied.
- **Distinctive aesthetic commitment, not generic.** Custom 10-stop earth/sage/terracotta ramps; serif headlines (`font-serif` → `Georgia, Cambria, Times New Roman, serif`); organic SVG decorations at low opacity; self-aware voice. Replicate this voice across future surfaces — keep `(H1-H3)` and don't dilute.
- **Component sprawl is well-organised.** SettingsPage subcomponents are split into discrete, testable pieces (`src/components/settings/{CloudAccount,Custom,Date,EmailScan,Fields,Interviewing,Matching,Tools,View,…}Settings.tsx`).
- **Performance primitives present.** `MetricsSummary` is `memo(MetricsSummary)` + `useMemo` for stats; `HomePage.tsx` uses `useMemo` / `useCallback` / `useEffectEvent` (React 19); the manual `useEffectEvent`-with-deps-empty call is acknowledged with a comment explaining the trade-off (earlier per-commit history shows this was a deliberate fix).
- **No evidence of layout-thrashing or unbounded render loops.** Earlier commit history shows the team has already debugged an infinite-render-loop in `HomePage` (twice, refactor commit `2.4.0/2.4.1`), so they're attentive to re-render hygiene.

---

## Recommendations by Priority

### Immediate (this sprint)

1. **LandingPage gradient trim** — `LandingPage.tsx:185-201, 449, 185, 201, 449`. Replace gradient layers with solid earth-blocks + 1-px borders. Quick win that converts the biggest AI-tell surface to the project's own voice.
2. **Touch-target raise on `BottomNav`, `Header` `Switch`, and `ApplicationTableRow` action icons** — wrap icon-only buttons in `min-h-[44px] min-w-[44px] p-2` outer shells. WCAG 2.5.5 clean.
3. **Header dropdown label split** — `Header.tsx:189` + `DropdownMenuLabel` should not both be `nav.backupSync`. Either rename the trigger to `'Account menu'` or add a `nav.userMenu` key.

### Short-term (next sprint)

4. **Token-escape sweep** — `CalendarView.tsx` (`slate-*` → semantic), `StatusBarChart.tsx`/`InterviewBarChart.tsx` (`#hex` → `var(--color-*-N)`), `ApplicationTableRow.tsx` and `SyncActions.tsx` audit for the same. Document a single brand-color exception registry in `AGENTS.md`.
5. **LandingPage hero-stat block deliberation** — decide whether 3 big qualitative numbers serves the page. If yes, rebrand them as qualitative lockups (icon + label + 1-line prose); if no, remove them.
6. **ARIA-disclosure coherence** — `HomePage.tsx:354-360`: add `id` + `aria-controls` to "Data Management" disclosure + sibling region.
7. **Dark-mode contrast audit pass on `text-earth-500` labels** — `MetricsSummary.tsx:38,50` and others. Lifts to AA Normal at minimum.

### Medium-term (next quarter)

8. **Centralise cross-tab / BypassZustand sync** — establish one convention (custom event vs polling) and route `Sidebar.tsx`'s polling through it. Document the decision in `AGENTS.md`.
9. **i18next-parser sweep** — formalise which keys are bound where. Resolve the `nav.backupSync` double-as-heading-and-label ambiguity.
10. **Visually decorative emoji + SVG handling** — `JobDetailsPage.tsx:62` not-found 🕵 emoji + similar sites should carry accessible equivalents.

### Long-term (nice-to-have)

11. **Interactive animation consolidation** — pick one easing/timing for press, hover, disclosure transitions; declare in `Button.tsx` so individual sites stop overriding (`transition duration-150`).
12. **Inline SVGs with brand colours → documented exception registry** — alongside the brand-color proposed in recommendation 4.
13. **OKLCH-future-proof** — once the project adopts OKLCH (`@theme --color-earth-500: oklch(...)`), the chart hex resolve path will need to re-resolve at render time. Plan now.

---

## Suggested Commands for Fixes

Mapping issues to available audit-adjacent slash-commands. Where no dedicated command exists, route to the general `/audit` re-run.

| Issue group | Suggested commands |
| --- | --- |
| LandingPage gradient stack + footer banner | `/polish`, then `/normalize` for any token rewiring |
| Touch targets (BottomNav, Header Switch, action icons) | `/adapt`, then `/audit` for re-run |
| Token-escape hex/slate/arbitrary | `/normalize` |
| ARIA disclosure + dropdown label split | `/audit` (a11y re-run) |
| `text-earth-500` dark-mode contrast | `/harden` (resilience / contrast) |
| Polling vs event sync | `/optimize` |
| i18n key ambiguities | `/audit` (i18n scope) |
| Animation/timing consolidation | `/polish` |

---

## Appendix · Audit Method

- **Files end-to-end read:** `App.tsx`, `main.tsx`, `index.css`, `tailwind.config.js`, `components.json`, `LandingPage.tsx`, `HomePage.tsx`, `JobDetailsPage.tsx`, `Header.tsx`, `Sidebar.tsx`, `MainLayout.tsx`, `MetricsSummary.tsx`, `DonationSection.tsx`, `BottomNav.tsx`, `ApplicationTable.tsx`, `src/locales/en/translation.json`.
- **Cross-verified grep (`code_searcher`):** `aria-` (193 matches), `dark:` (125 matches, pervasive), `focus-visible:outline`/`focus:ring-ring` (74 matches), `bg-gradient-to|linear-gradient|radial-gradient` (4 matches, all in `LandingPage.tsx`), `bg-[#hex]` (3 matches: DonationSection, SignIn section, EmailScan result badges), `slate-` (4 matches, all in `CalendarView.tsx`), raw `#hex` literals inside chart fills (2 matches).
- **Anti-pattern reference:** `frontend-design` skill — DON'T list (AI colour palette, gradient text, glassmorphism, hero metric, card grids, generic fonts, gray-on-color, nested cards, bounce easing, redundant copy, modals-as-shortcut, sparklines-as-decoration, rounded + thick one-sided border, fade-in/anim on every state change).
- **Validation commands:** `bash scripts/check-workflow-shape.sh --ci` (workflow gate) — repo hygiene is unaffected by this audit since it's documentation-only.
