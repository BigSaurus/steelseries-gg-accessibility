# SteelSeries GG — accessibility remediation

Makes **SteelSeries GG usable with a screen reader**, with first focus on the
**parametric equalizer** (validated on an Arctis Nova Elite), whose bands ship as
a mouse-only `<canvas>` graph that screen readers cannot touch. This tool turns
the **10 EQ bands into real, keyboard-operable sliders** that drive the actual
hardware — built and validated with **NVDA**.

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
   real setters `updateBandMarkerParams(index, {gain})` and
   `setCurrentBandMarkerIdx(index)`. The injection finds this component by walking
   the React fiber up from the canvas — no private APIs, just the app's own state.

3. **Inject accessible sliders.** `tools/eq_sync.js` builds a `role=region`
   "Accessible Equalizer" panel of 10 `role=slider` controls
   (`aria-label="32 Hz band gain"`, range −12…+12 dB, live `aria-valuetext`).
   Arrow = ±1 dB · PageUp/Dn = ±3 · Home = +12 · End = −12 · Delete = reset.
   Chromium maps the ARIA into UIA sliders, so NVDA reads and operates them.

4. **Persist it.** `tools/eq_daemon.py` polls the debug port and re-applies the
   panel to every device page, surviving reloads and re-opened windows.

## Requirements

- Windows, SteelSeries GG installed (default `C:\Program Files\SteelSeries\GG`).
- .NET Framework (for `csc.exe`, already present on Windows) to build the wrapper.
- Python 3 with `websocket-client` and `uiautomation`:
  `pip install websocket-client uiautomation`
- A screen reader (NVDA recommended).

## Install

```powershell
# from launcher\
.\build_wrapper.ps1        # compile the wrapper from source
.\install.ps1              # swap in the wrapper (admin), relaunch GG accessibly
.\install_autostart.ps1    # run the injector at login (optional but recommended)
```

If your Python isn't on `PATH`, create `launcher\_paths.ps1` (gitignored):

```powershell
$PythonW = 'C:\path\to\python\pythonw.exe'
$Python  = 'C:\path\to\python\python.exe'
```

**Launch accessibly** with `launcher\launch_accessible.ps1` (make a desktop
shortcut to it). It does a clean teardown + restart so the dashboard never lands
in the blank/orphaned state, then starts the injector. Open Engine → your headset
→ Equalizer; the sliders appear automatically. Press **Save** in GG to keep a preset.

**Uninstall:** `launcher\uninstall.ps1` (restores the original binary) and
`launcher\uninstall_autostart.ps1`.

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

## Layout

```
launcher/
  wrapper.cs                 flag-injecting launch shim (source)
  build_wrapper.ps1          compile it (csc)
  install.ps1 / uninstall.ps1
  install_autostart.ps1 / uninstall_autostart.ps1
  launch_accessible.ps1      clean restart + start daemon
  _lib.ps1                   shared path resolver
tools/
  eq_sync.js                 the accessible-EQ injection (idempotent)
  eq_daemon.py               keeps it applied
  cdp.py                     minimal CDP eval helper
  probes/                    the reverse-engineering probes used to map the EQ
```

## Roadmap

- [Collapsible EQ panel](docs/roadmap-eq-collapsible-panel.md) — a button that
  expands/collapses the sliders (disclosure pattern) instead of an always-on toolbar.
- [Per-band Frequency & Q](docs/roadmap-eq-freq-q.md) — finish the parametric EQ
  (we expose Gain today; Freq/Q use the same controller).
- [Accessible keyboard settings](docs/roadmap-keyboard-apex-pro-tkl.md) — apply the
  same approach to the Apex Pro TKL (actuation, Rapid Trigger, lighting, bindings).

## License

GPLv3 — see [LICENSE](LICENSE).
