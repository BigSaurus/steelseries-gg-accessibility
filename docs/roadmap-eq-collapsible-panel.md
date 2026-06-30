# Roadmap: collapsible EQ panel (button that expands the sliders)

**Status:** planned. **Builds on:** `tools/eq_sync.js` (the always-visible panel).
**Effort:** small — UI-only change, no new device wiring.

## Why

Today the accessible panel renders all 10 sliders as an always-on toolbar pinned
to the top of the window. That's great for reach but visually heavy and, for a
screen-reader user tabbing through the page, it's 10 controls always in the path.
A **disclosure** — a single button that expands/collapses the sliders — keeps the
GG window clean for everyone and keeps the controls one keypress away. Collapsed
by default, it also stops the toolbar from covering the app's own UI.

## Pattern (do it the standard way)

Use the WAI-ARIA **disclosure** pattern so it's correct for every assistive tech:

- A real `<button>` labeled e.g. **"Accessible Equalizer"**, with
  `aria-expanded="false|true"` and `aria-controls="<sliders-id>"`.
- The sliders live in the controlled container; when collapsed it's `hidden`
  (or `display:none`) so the sliders leave **both** the tab order and the
  accessibility tree — no clutter, no phantom stops.
- Toggle on **Enter/Space** (native button behavior); **Escape** collapses.
- A visible caret/▾ reflects state for sighted users; the `aria-label` stays
  stable so NVDA announces "Accessible Equalizer, button, collapsed/expanded".

## Behavior decisions (recommended defaults)

- **Default state:** collapsed. *(Cleaner; power users expand once and it sticks.)*
- **Remember state:** persist expanded/collapsed in `localStorage` so it survives
  reloads and re-opened device windows. The injector daemon must **not** reset the
  state on its idempotent re-sync (read state on build, leave it alone otherwise).
- **Focus on expand:** keep focus on the toggle button (classic disclosure), but
  offer an option to jump focus to the first band slider on expand for speed.
  *(Lean: stay on the button; it's the least surprising for screen-reader users.)*
- **Placement:** small button pinned top-left; expands into the existing toolbar
  strip below it.

## Plan

1. Refactor `eq_sync.js`:
   - Build `<region><button aria-expanded aria-controls><div id=sliders hidden>…`.
   - Initialize expanded state from `localStorage` (`ss-a11y-eq-expanded`).
   - Wire toggle (button click + Escape), update `aria-expanded`, `hidden`, caret,
     and persist.
2. Keep the idempotent contract: on re-sync, if the panel exists, only refresh
   slider values and **preserve** the expand/collapse state.
3. Optional stretch: a documented keyboard shortcut to toggle from anywhere on the
   page (guard against conflicts with app/NVDA keys).

## Acceptance

- NVDA announces a labeled button with collapsed/expanded state; activating it
  shows/hides the sliders, which only appear in the tab order when expanded.
- State persists across reload and re-opened device windows.
- Sighted/keyboard-only users get the same expand/collapse; no regression to
  slider behavior or value sync.

## Risks

- Don't let the daemon's re-sync clobber the user's chosen state (read-once on
  build).
- Ensure `hidden` truly removes sliders from the a11y tree (avoid `visibility`
  tricks that leave them focusable).
