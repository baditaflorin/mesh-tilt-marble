# mesh-tilt-marble

[![pages](https://img.shields.io/badge/live-baditaflorin.github.io%2Fmesh-tilt-marble-6da3ff)](https://baditaflorin.github.io/mesh-tilt-marble/)
[![version](https://img.shields.io/badge/version-0.1.1-blue)](https://github.com/baditaflorin/mesh-tilt-marble/blob/main/package.json)
[![license](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

> Tilt your phone; the group's average vector navigates a shared marble.

**Live → https://baditaflorin.github.io/mesh-tilt-marble/**

**Source → https://github.com/baditaflorin/mesh-tilt-marble**

**Tip the dev (buy a coffee) → https://www.paypal.com/paypalme/florinbadita**

---

![screenshot](docs/screenshot.png)

> Two peers, side-by-side, in the same room. Drop a `tests/demo/scenario.mjs`
> exporting `default async (a, b) => …` and run `npm run demo` to regenerate
> `docs/preview.png` plus `docs/demo-a.webm` / `docs/demo-b.webm` clips.

![preview](docs/preview.png)

## What it is

A cooperative marble maze you steer together. Everyone in the same room tilts
their phone (or drags a slider on a laptop); all the tilts are **averaged** into
one vector that nudges a single shared marble toward the goal ring. Get it there
and everyone's win counter ticks up. The marble lives in a Yjs mesh shared by
every player — there's no backend holding your data.

**Try it in 30 seconds:** open the live link, then open it again in a second tab
(or scan the 📡 room QR on a phone). Drag the "left / right" and "up / down"
sliders in one tab and watch the same white marble move in the other — both tabs
render the _same_ marble because its position is shared, not computed per-tab.

A **rootless-computing** peer-to-peer browser app. No backend of its own beyond
the self-hosted WebRTC stack listed below. State lives in a Yjs mesh shared by
everyone in the same room.

Read the principles → **https://baditaflorin.github.io/rootless-computing/principles.html**

## Quickstart

Open the live URL on two devices in the same room (set in ⚙ settings, or scan the room QR). Everything else is in-app.

For local hacking:

```bash
git clone https://github.com/baditaflorin/mesh-common
git clone https://github.com/baditaflorin/mesh-tilt-marble
cd mesh-tilt-marble
npm install
npm run dev
```

`mesh-common` must sit as a **sibling** directory because `package.json` references it via `file:../mesh-common`.

## Self-hosted infrastructure

| Repo                                              | Endpoint                               | Purpose                     |
| ------------------------------------------------- | -------------------------------------- | --------------------------- |
| https://github.com/baditaflorin/signaling-server  | `wss://turn.0docker.com/ws`            | y-webrtc signaling fan-out  |
| https://github.com/baditaflorin/turn-token-server | `https://turn.0docker.com/credentials` | HMAC TURN creds, 1-hour TTL |
| https://github.com/baditaflorin/coturn-hetzner    | `turn:turn.0docker.com:3479`           | TURN relay                  |

## Settings overrides

The settings drawer lets the user override signaling and TURN endpoints. localStorage keys:

- `mesh-tilt-marble:signalingUrl`
- `mesh-tilt-marble:turnTokenUrl`
- `mesh-tilt-marble:iceServers`
- `mesh-tilt-marble:room`

If endpoints are blank or unreachable, the app falls back to STUN-only.

## Version + commit on every screen

The bottom-right footer on every screen of the live app shows:

- `source` → this repo
- `tip ♥` → PayPal
- `vX.Y.Z · <short-sha>` — version from `package.json` plus the build-time git commit

## Build & deploy

GitHub Pages serves the committed `docs/` directory on the `main` branch. There is no GitHub Actions build workflow; local Husky-style hooks gate formatting / typecheck / smoke build before each push.

```bash
npm run smoke                                    # build + sanity-check docs/
bash ../mesh-common/scripts/screenshot-app.sh    # regenerate docs/screenshot.png
```

## Privacy

See `docs/privacy.md` for the threat model — what other peers in the mesh see, what the self-hosted infra sees, what stays local.

## License

MIT — see `LICENSE`.
