# AXIS Elevate — Adaptive AI Fitness Operating System

Production-oriented browser application built from the master blueprint.

## What it is

AXIS continuously combines profile, goals, training, food, movement, recovery and AI to answer:

**What should I do next?**

## Surfaces

- **Today** — Dynamic “YOUR NEXT MOVE” decision engine
- **Train** — Adaptive session generation, set logging, modes (normal / low energy / 20-min / home / recovery)
- **Food** — FatSecret search + Food Vision (Claude vision) + logging with provenance
- **Move** — Real GPS walk tracking + manual steps (never fabricates sensor data)
- **Progress** — Bottleneck detection, readiness, recovery logging
- **Oracle** — Contextual LLM via FastRouter (Claude Opus)

## Architecture

```
AXIS/
├── index.html
├── styles.css          # Adaptive Liquid Glass
├── js/
│   ├── app.js          # UI orchestration
│   ├── data.js         # State + persistence
│   ├── intelligence.js # Deterministic next-move + readiness
│   ├── training.js     # Exercise DB + session engine
│   ├── food.js         # Food search / vision / log
│   ├── movement.js     # Walk + steps
│   └── api.js          # Oracle client
└── netlify/
    └── functions/
        ├── food.mjs    # FatSecret proxy (OAuth)
        ├── oracle.mjs  # FastRouter / Claude
        └── vision.mjs  # Food image analysis
```

## Environment variables (Netlify)

Set these in the Netlify dashboard (never commit secrets to frontend):

```
FATSECRET_CLIENT_ID=your_fatsecret_client_id
FATSECRET_CLIENT_SECRET=your_fatsecret_client_secret
FASTROUTER_API_KEY=your_fastrouter_api_key
```

Never commit real secrets. Set them only in Netlify (or your host) environment variables.

## Local development

1. Install Netlify CLI: `npm i -g netlify-cli`
2. From project root: `netlify dev`
3. Open the printed localhost URL.

Or serve the static files with any static server and point `/api/*` to the functions.

## Design principles enforced

- No fake API responses, fake steps, or invented exact nutrition
- Vision request shape: `{ imageData, mimeType }`
- Secrets only on server
- Graceful degradation when APIs fail
- Measured vs estimated data clearly distinguished
- Liquid Glass UI with real depth, not generic cards

## Status

Core loop implemented:

- Onboarding → profile → Today next-move
- Training generation + set logging + persistence
- Food search (FatSecret) + Vision + logging
- Walk mode (GPS) + manual steps
- Oracle chat with user-state context
- Readiness + bottleneck engines
- Local persistence (localStorage)

Further hardening (OpenML forecasting, richer media, calendar .ics, notifications, larger exercise DB) can be layered on this foundation.
