# SteelSeries GG — accessibility remediation

Makes **SteelSeries GG usable with a screen reader**, with first focus on the
**parametric equalizer** (validated on an Arctis Nova Elite), whose bands ship as
a mouse-only `<canvas>` graph that screen readers cannot touch. This tool turns
the **10 EQ bands into real, keyboard-operable controls** that drive the actual
hardware — built and validated with **NVDA**. Every band exposes **gain,
frequency, Q, filter type, and an enable toggle** (a complete parametric EQ).

The injected panel is a **visible on-screen toolbar**, not a screen-reader-only
overlay: screen-reader, keyboard-only, and sighted mouse users all get the same
controls. Because it exposes the app's *real* control functions as standard
elements, every setting added this way becomes a faster universal alternative UI
for everyone — not an accessibility bolt-on.

> Not affiliated with, endorsed by, or supported by SteelSeries. This is an
> independent accessibility tool. It modifies a local SteelSeries GG install at
> your own risk and is fully reversible (`uninstall.ps1`).

## Why it's needed

SteelSeries GG is an Electron app (Electron 31 / Chrome 126).

- Its Chromium renderer only projects an accessibility tree while the window is
  **focused** (lazy build) — normal for Chromium, fine for real screen-reader use.
- Most Engine controls are semantic and already read (volume sliders, noise-control
  radios, preset combobox).
- **The equalizer is the exception.** It's a parametric EQ drawn on a `<canvas>`;
  the per-band Gain / Freq / Q `<input>`s exist but are rendered **off-screen
  (0×0)**, so neither keyboard nor screen-reader users can reach the EQ at all.

## How it works

1. **Launch wrapper.** SteelSeries can't be passed Chromium flags normally
   (`SteelSeriesGGEZ.exe` is a watchdog that respawns the host, which spawns the
   GUI client itself). So the real client is renamed `SteelSeriesGGClient-real.exe`
   and a tiny wrapper (`launcher/wrapper.cs`) takes its place, appending
   `--remote-debugging-port=9222 --remote-allow-origins=* --force-renderer-accessibility`
   before exec'ing the real binary. Only the one main launch is intercepted.

2. **Drive the app's own EQ functions.** The EQ is owned by a React component
   (`ParametricEqualizerMini`) whose props expose `bandMarkers` (10 bands) and the
   real setters `updateBandMarkerParams(index, {gain, frequency, qFactor,
   filterType, enabled})` and `setCurrentBandMarkerIdx(index)`. The injection finds
   this component by walking the React fiber up from the canvas — no private APIs,
   just the app's own state. (The app does no bounds-checking, so the panel clamps
   to sane ranges itself.)

3. **Inject accessible controls.** `tools/eq_sync.js` builds a `role=region`
   "Accessible EQ" panel: per band a `role=group` with an **enable** checkbox,
   **gain** / **frequency** / **Q** `role=slider`s, and a **filter-type** select.
   Ranges: gain −12…+12 dB (±1, PageUp/Dn ±3); frequency 20 Hz–20 kHz stepped in
   semitones (PageUp/Dn = third-octave); Q 0.3–10 (±0.1). Home/End = max/min,
   Delete = reset to default. Chromium maps the ARIA into UIA sliders/comboboxes/
   checkboxes, so NVDA reads and operates them.

4. **Persist it.** `tools/eq_daemon.exe` (built from `eq_daemon.cs`, no runtime
   deps) polls the debug port and re-applies the panel to every device page,
   surviving reloads and re-opened windows.

## Requirements

**To use it — nothing but Windows + SteelSeries GG.** The wrapper and the injector
daemon are small C# programs built from source by the `csc` compiler that ships
with the .NET Framework (already on every Windows machine). No Python, no runtime
to install. A screen reader (NVDA recommended) if that's the point.

**To hack on it** (reverse-engineering probes, manual CDP eval, UIA audits) you'll
want Python 3 with `websocket-client` and `uiautomation` — but end users never
run those.

## Install

**Quick (recommended):** one script does prerequisite checks, build, install, and
login autostart. It self-elevates for the Program Files step.

```powershell
# from launcher\
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

**Manual**, if you prefer step-by-step:

```powershell
# from launcher\
.\build.ps1                # compile the wrapper + daemon from source (csc)
.\install.ps1              # swap in the wrapper (admin), relaunch GG accessibly
.\install_autostart.ps1    # run the injector at login (optional but recommended)
```

If SteelSeries GG isn't in the default location, create `launcher\_paths.ps1`
(gitignored) to point at it:

```powershell
$GGDir = 'D:\Games\SteelSeries\GG'
```

**Launch accessibly** with `launcher\launch_accessible.ps1` (make a desktop
shortcut to it). It does a clean teardown + restart so the dashboard never lands
in the blank/orphaned state, then starts the injector. Open Engine → your headset
→ Equalizer; the sliders appear automatically. Press **Save** in GG to keep a preset.

**Uninstall:** `launcher\uninstall.ps1` (restores the original binary) and
`launcher\uninstall_autostart.ps1`.

## Tested configuration

Validated on: **SteelSeries GG 3.0.0** (Electron 31 / Chrome 126), **Arctis Nova
Elite**, Windows 11, NVDA. It leans on GG's *minified* React internals
(`ParametricEqualizerMini`, `updateBandMarkerParams`, the `Graph__Canvas` class),
so a different GG version or a headset with a different EQ model may need the
probes in `tools/probes/` re-run and the selectors in `tools/eq_sync.js` updated.
`setup.ps1` prints the detected GG version and warns if it isn't 3.x.

## Limitations

- **EQ is 2.4 GHz-only.** On the Arctis Nova Elite the parametric EQ exists only
  for the **2.4 GHz wireless** (base-station) connection. Selecting **Bluetooth**
  removes the EQ entirely — Bluetooth audio isn't routed through the EQ DSP, so EQ
  changes (and this panel) have no effect on Bluetooth playback. This is a
  SteelSeries design choice, not a tool limitation.
- **GG auto-updates** can replace the wrapper with a fresh real client, silently
  disabling the tool until you re-run `install.ps1`.
- The 2.4 GHz / Bluetooth connection selector is not itself screen-reader-friendly
  (state lives in a CSS class); not yet remediated.

## Code signing

Not required. The wrapper isn't signed and doesn't need to be — Windows runs it,
and SteelSeries doesn't verify the client's signature (the real binary keeps its
original signature). We ship **source, not a prebuilt exe**, so there's no
"unknown publisher" download warning; you compile locally. If a project ever
distributes a prebuilt wrapper, free OSS signing (SignPath, Azure Trusted
Signing) would remove SmartScreen prompts.

## Gotchas (hard-won)

- **Never** kill SteelSeries processes piecemeal — GGEZ respawns the host and you
  get two watchdogs, orphaned Engine/Sonar, and a blank dashboard. Always full
  teardown then a single GGEZ start (what `launch_accessible.ps1` does).
- The renderer a11y tree is empty until the window is **focused** — expected.
- This rides on SteelSeries' current internals (component/prop names). A GG update
  could shift them; if the sliders stop appearing, re-run the probes in
  `tools/probes/` to re-map.

## Troubleshooting

**The panel doesn't appear.**
1. Is the debug port up? `curl http://127.0.0.1:9222/json/version` (or open it in a
   browser). Nothing → GG wasn't launched through the wrapper. Run
   `launch_accessible.ps1`, or reboot so login starts GG via the wrapper.
2. Is the injector running? Look for `eq_daemon.exe` in Task Manager.
   Not there → run `install_autostart.ps1` (or `launch_accessible.ps1`).
3. Are you on the **Equalizer** screen of a headset that has one, with the window
   focused? The EQ tree only builds on focus, and only the 2.4 GHz connection has
   an EQ (see Limitations).
4. Right GG version? `setup.ps1` warns if it isn't 3.x. On a newer GG the internal
   names may have moved — re-run `tools/probes/eq_probe4.js` to confirm the
   controller/selectors, then update `tools/eq_sync.js`.

**It worked, then stopped after a GG update.** The updater likely replaced the
wrapper. Re-run `install.ps1` (or `setup.ps1`).

**Antivirus flagged the wrapper.** It's an unsigned exe taking the client's name;
allow it, or review `launcher/wrapper.cs` and rebuild yourself.

**EQ changes don't affect my audio.** You're probably listening over **Bluetooth**,
which has no EQ — use the 2.4 GHz wireless connection (see Limitations).

## Layout

```
launcher/
  setup.ps1                  one-shot: checks + build + install + autostart
  wrapper.cs                 flag-injecting launch shim (source)
  build.ps1                  compile wrapper.cs + eq_daemon.cs with csc
  install.ps1 / uninstall.ps1
  install_autostart.ps1 / uninstall_autostart.ps1
  launch_accessible.ps1      clean restart + start daemon
  _lib.ps1                   shared path resolver
tools/
  eq_sync.js                 the accessible-EQ injection (idempotent)
  eq_daemon.cs               injector daemon source -> eq_daemon.exe (no deps)
  cdp.py                     dev-only CDP eval helper (Python)
  probes/                    dev-only reverse-engineering probes (Python)
```

## Roadmap

- [Collapsible EQ panel](docs/roadmap-eq-collapsible-panel.md) — a button that
  expands/collapses the sliders (disclosure pattern) instead of an always-on toolbar.
- ~~Per-band Frequency & Q~~ — **done**: gain, frequency, Q, filter type, and
  enable are all exposed now ([notes](docs/roadmap-eq-freq-q.md)).
- [Accessible keyboard settings](docs/roadmap-keyboard-apex-pro-tkl.md) — apply the
  same approach to the Apex Pro TKL (actuation, Rapid Trigger, lighting, bindings).

## License

GPLv3 — see [LICENSE](LICENSE).
