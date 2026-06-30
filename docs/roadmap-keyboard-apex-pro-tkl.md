# Roadmap: accessible keyboard settings (Apex Pro TKL Wireless)

**Status:** planned, needs recon. **Builds on:** the same wrapper + injector
architecture as the EQ. **Effort:** medium — unknowns until we probe the page.

## Why

The original ask covered keyboard settings too, not just the headset. The Apex
Pro TKL exposes settings that are gameplay- and ergonomics-critical and are
likely as inaccessible as the EQ was: **per-key actuation depth (OmniPoint)**,
**Rapid Trigger**, **RGB lighting**, **OLED screen**, and **macros / key
bindings**. As with the EQ, exposing the app's real control functions as standard
controls helps screen-reader, keyboard-only, *and* sighted users.

## Unknown until we probe

We have **not** yet inspected the keyboard's `deviceConfig` page. Everything
below is the plan to find out, mirroring exactly how we cracked the EQ. Do not
assume control internals (function/prop names, ranges) before probing.

## Plan

1. **Open the Apex device page** in accessible mode and identify its CDP target
   (the `deviceConfig` URL carries the device, e.g. `...apex_pro_tkl...`).
2. **Audit** (same ladder as the EQ):
   - UIA dump of the focused window → what already reads vs. what's opaque.
   - DOM/React probe (reuse `tools/probes/`) → catalog controls, find the ones
     rendered as `<canvas>` / off-screen / unlabeled.
3. **Map the controllers.** For each inaccessible control (actuation slider(s),
   Rapid Trigger, brightness, color, the key grid), walk the React fiber to find
   the component props/functions that set values — the EQ's
   `updateBandMarkerParams` analogue. Record signatures + ranges.
4. **Likely targets, by value:**
   - **Actuation depth** — global and/or per-key. Probably a canvas/key-map UI;
     expose as labeled sliders (range in mm, e.g. ~0.1–4.0). Highest priority.
   - **Rapid Trigger** — toggle + sensitivity slider.
   - **Brightness / RGB** — slider + color control (`<input type=color>` or
     labeled H/S/V sliders).
   - **Per-key binding / macros** — expose the key grid as a navigable list
     ("Escape: …", "F1: …") with editable actions. Largest/most complex.
5. **Generalize the injector into a dispatcher.** Today `eq_daemon.py` injects
   `eq_sync.js` on every `deviceConfig` page. Refactor to a small **per-device
   module map**: inspect the page's device id and inject the matching panel
   (`eq_sync.js` for headsets, `keyboard_sync.js` for the Apex, …). Keep each
   panel idempotent and self-removing off its page.
6. **Build incrementally** — ship actuation first (most impactful), then lighting,
   then bindings.

## Acceptance (per control shipped)

- The control is a real, labeled, keyboard-operable element NVDA reads.
- Changing it drives the device (verified against the app's model and observably).
- Save/Apply persists. No regression to the EQ panel.

## Risks / notes

- The key grid may be a true `<canvas>` keyboard map with no per-key DOM — if so,
  the underlying model (per-key state array + setter) is what we expose as a list,
  not the canvas.
- Some settings may require the device on its 2.4 GHz dongle vs. Bluetooth.
- More device modules = keep the dispatcher and shared helpers DRY.
