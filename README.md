# B2B Renewal Operating Model

> AI-augmented, milestone-driven renewal process — T-220 to T+1 · 4 hard gates · 10 AI agents · full role RACI

## What this is

A fully operationalised B2B SaaS renewal process built to maximise GRR, NRR, forecast accuracy, and pricing discipline. Designed for a high-discipline, no-exception operating culture.

The codebase is a React + TypeScript interactive reference implementation of the operating model, covering:

- **Agent map** — 10 AI agents across 4 phases with capability stacks and KPI impact
- **Role responsibilities** — full swim-lane view with ERM (HVO) / ISR (non-HVO) split and role filter
- **Gate enforcement logic** — Gates 1 and 2 fully specified with evaluation checks, escalation chains, CRM field models, and exception rules
- **Executive briefing** — one-page landscape Word document

## Repo structure

```
renewal-os/
├── src/
│   ├── components/
│   │   ├── AgentInsertionMap.tsx      # AI agent map — 10 agents, 4 phases, clickable detail panels
│   │   ├── RenewalProcessMap.tsx      # Agent map + role swim lanes, ISR/ERM split, role filter
│   │   ├── Gate1EvaluationLogic.tsx   # Gate 1 (T-140) — full AI enforcement logic, simulation
│   │   ├── Gate2EvaluationLogic.tsx   # Gate 2 (T-90) — account-level pricing floor model
│   │   └── GatePreview.jsx            # Combined Gate 1 + Gate 2 viewer
│   ├── App.tsx                        # Top-level app with sticky nav
│   └── main.tsx                       # React entry point
├── public/
│   ├── _redirects                     # Cloudflare Pages SPA fallback
│   └── index.html                     # Standalone demo — no build step, open directly in browser
├── docs/
│   └── renewal_executive_briefing.docx  # One-page landscape executive briefing
├── index.html                         # Vite HTML entry point
├── package.json
├── vite.config.ts
├── wrangler.jsonc                     # Cloudflare Pages config
└── tsconfig.json
```

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`

## Deploy to Cloudflare Pages

This repo is configured for **Cloudflare Pages**.

If you deploy from the Cloudflare dashboard, use:

- **Framework preset:** `Vite`
- **Build command:** `npm run build`
- **Build output directory:** `dist`

Cloudflare will rebuild and redeploy automatically on each push to your connected GitHub branch.

### Optional: deploy with Wrangler

The repo includes `wrangler.jsonc` for Pages configuration. After building locally, you can deploy with Wrangler:

```bash
npm run build
npx wrangler pages deploy dist --project-name renewal-os
```

### SPA routing fallback

`public/_redirects` includes:

```text
/* /index.html 200
```

This ensures Cloudflare Pages serves the app correctly for client-side routes and deep links.

## Standalone demo (no build required)

Open `public/index.html` directly in Safari, or serve locally:

```bash
python3 -m http.server 8080 --directory public
```

Then open `http://localhost:8080`

## Key design rules

| Rule | Detail |
|------|--------|
| Pricing floor | Applied at **account level**, not opportunity level. `Account.Total_ARR_Quoted__c` vs `Account.Pricing_Floor__c` |
| No pricing exceptions | Zero VP override path. Only route to lower individual opp ARR is compensating uplift on another opp on the same account |
| Gate 4 violations | Immutable — `Gate4_Violation__c` cannot be cleared or overridden once set |
| ERM vs ISR | ERM owns HVO accounts (tagged `motionTag: "HVO"`). ISR owns non-HVO (`motionTag: "Non-HVO"`) |

## Operating model summary

| Phase | T-range | Gate | Pass criteria |
|-------|---------|------|---------------|
| Preparation | T-220 → T-180 | — | Opp created, contacts verified, risk brief issued |
| Engagement | T-145 → T-100 | **Gate 1 (T-140)** | Primary contact confirmed + qualifying engagement signal |
| Commercial | T-95 → T-60 | **Gate 2 (T-90)** | Quote sent + account-level floor met + portal published |
| Finalization | T-30 → T-0 | **Gate 3 (T-30)** | Signed or active e-sign. **Gate 4 (T-0)** Closed Won + invoice sent + ARR recognised |

## Components

### `AgentInsertionMap`
Exact reproduction of the agent map design. Every card is clickable and opens an inline detail panel with agent description, capability stack, and KPI impact. Gate chips toggle active state.

### `RenewalProcessMap`
Two-view component: agent map and role responsibilities swim lane. Role filter buttons (All / SDR / ERM / ISR / Sales Ops / Legal / VP·SVP / System) filter all four phases simultaneously. HVO/non-HVO motion tags visible on ERM and ISR rows.

### `Gate1EvaluationLogic`
Interactive Gate 1 enforcement specification. Tabs: Gate definition · Evaluation checks · Escalation chain · CRM field model · Exception rules. Simulate PASS or FAIL to step through the 4-check sequence with live status indicators.

### `Gate2EvaluationLogic`
Interactive Gate 2 enforcement specification. Adds: Floor model tab with formula display and worked examples (2 accounts showing pass/fail). Simulate PASS, FLOOR FAIL, or process FAIL. Account and Opportunity object fields clearly separated.

### `GatePreview`
Combined viewer for both gate components with a switcher. Useful for side-by-side gate comparison.

## Deliverable status

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | End-to-end renewal process design | ✅ Done |
| 2 | AI agent insertion map | ✅ Done |
| 3 | Team roles and responsibilities (incl. ISR) | ✅ Done |
| 4 | Gate 1 AI enforcement logic | ✅ Done |
| 5 | Gate 2 AI enforcement logic (v2 — account-level pricing) | ✅ Done |
| 6 | Executive briefing .docx | ✅ Done |
| 7 | Gate 3 & 4 AI enforcement logic | ✅ Done |
| 8 | Full RACI matrix | ✅ Done |
| 9 | CRM field model and automation specification | ⏳ Pending |
| 10 | KPI and governance dashboard | ✅ Done |
| 11 | 30/60/90-day implementation roadmap | ⏳ Pending |
