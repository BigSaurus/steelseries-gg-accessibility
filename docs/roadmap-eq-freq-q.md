# Roadmap: per-band Frequency & Q (and a universal EQ panel)

**Status: SHIPPED.** `tools/eq_sync.js` now exposes per band: enable, gain,
frequency, Q, and filter type. Frequency steps in semitones (PageUp/Dn =
third-octave), Q in 0.1 steps. NVDA-validated (UIA sliders/comboboxes/checkboxes).
Discovery: the app's setter does **no** bounds-checking, so the panel clamps to
gain −12…+12, frequency 20–20000 Hz, Q 0.3–10 itself. Notes below kept for history.

## Why

The headset EQ is a *parametric* EQ: each of the 10 bands has not just **Gain**
but also a **center Frequency**, a **Q** (bandwidth), a **filter type**, and an
**enabled** flag. We currently expose Gain only. Exposing Frequency and Q makes
the EQ fully usable without the mouse-only canvas — for screen-reader, keyboard,
*and* sighted users alike (the panel is an on-screen toolbar everyone can use).

## What we already know

The controller function we drive accepts all of these in one call:

```js
updateBandMarkerParams(index, { gain, frequency, qFactor, filterType, enabled })
```

- `bandMarkers[i]` = `{ enabled, frequency, gain, qFactor, filterType }`.
- `filterType` options: 1 peakingEQ, 2 lowPass, 3 highPass, 4 lowShelving,
  5 highShelving, 6 notch.
- The setter quantizes each value via `se(value, y.<param>.decimals, y.<param>.increments)`.

So adding controls is mostly UI; the wiring is identical to Gain.

## Open questions (one probe to answer)

Extend `tools/probes/` to dump the `y` ranges the setter closes over
(`y.frequency`, `y.gain`, `y.qFactor`: min/max/decimals/increments) and confirm
allowed frequency range per filter type. This fixes the slider bounds/steps.
Best estimates until then: frequency 20 Hz–20 kHz (log), Q ~0.3–10.

## Plan

1. **Probe ranges** (above); record them in the probe output.
2. **Extend `eq_sync.js`:** per band render a `role=group` ("1 kHz band") holding
   - **Gain** slider (existing), −12…+12 dB, ±1 dB.
   - **Frequency** slider — **logarithmic** stepping (arrow = ±1/12 octave so it's
     musically sensible across the range), `aria-valuetext` like "1.0 kHz".
   - **Q** slider — 0.3…10, ±0.1, finer with a modifier.
   - *(stretch)* **Filter type** as a `role=listbox`/native `<select>`, and an
     **Enable** checkbox per band.
   Each commits via `setCurrentBandMarkerIdx(i)` + `updateBandMarkerParams(i, {...})`.
3. **Keep it readable:** group per band with a heading so NVDA users can skim
   bands without wading through 30 sliders; consider a "simple (gain only) /
   advanced (gain+freq+Q)" toggle so casual users aren't overwhelmed.
4. **Universal polish (optional):** drag-to-set thumbs and hover value tooltips so
   mouse users get a faster EQ than the stock canvas; collapse/expand the panel.

## Acceptance

- NVDA reads and operates Frequency and Q per band; values quantize and drive the
  device (verified against `bandMarkers` and by ear).
- Save persists the preset.
- Gain-only users see no regression (advanced controls opt-in or clearly grouped).

## Risks

- Verbosity for screen-reader users → mitigate with grouping/headings and the
  simple/advanced toggle.
- Logarithmic frequency mapping needs care at the extremes.
- Filter-type changes alter band meaning (e.g. a shelf ignores Q) — reflect that
  in labels/availability.
