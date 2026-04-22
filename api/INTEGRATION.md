# TOTEM Module — Integration Guide

This module adds three render-only systems to the TOTEM trade shell:

1. **SystemOverlay** — global market state (Cmd/Ctrl+K).
2. **MarketPhysicsPanel** — inline pulse on Discovery.
3. **TokenInsightsPanel** — Oracle / Curve / Risk on TokenPage.

All math/labeling lives in the backend (Ley P1). The frontend renders only.

---

## Files to copy into pgonia8-wq/Humans (real repo)

### Backend (additive, no replacements)

| Target path | Source |
|---|---|
| `api/system/physics.mjs`            | `api/system/physics.mjs`            |
| `api/lib/viewModelBuilder.patch.mjs`| `api/lib/viewModelBuilder.patch.mjs`|

### Frontend (mirrored paths)

| Target path | Source |
|---|---|
| `src/trade-shell/components/SystemOverlay.tsx`        | `artifacts/totem/src/trade-shell/components/SystemOverlay.tsx` |
| `src/trade-shell/components/MarketPhysicsPanel.tsx`   | `artifacts/totem/src/trade-shell/components/MarketPhysicsPanel.tsx` |
| `src/trade-shell/components/TokenInsightsPanel.tsx`   | `artifacts/totem/src/trade-shell/components/TokenInsightsPanel.tsx` |

---

## Edits to existing files

### 1. `api/totem/viewModel.mjs` — wrap `compose()`

```diff
 import { compose } from "../lib/viewModelBuilder.mjs";
+import { extendViewModel } from "../lib/viewModelBuilder.patch.mjs";
 ...
-  const vm = compose(raw);
+  const vm = extendViewModel(compose(raw), raw);
```

`extendViewModel(vm, raw)` is pure and additive: it adds
`vm.oracle.narrative`, `vm.market.curveTensionBps`, and a new `vm.risk`
subdomain. Any existing field is left untouched.

### 2. `src/lib/tradeApi.ts` — add types + helper

Append the new exports from `artifacts/totem/src/lib/tradeApi.ts`:
- `interface PhysicsMetric`
- `interface OracleHealth`, `interface NetworkHealth`
- `interface SystemPhysics`
- `export async function getSystemPhysics(): Promise<SystemPhysics>`

### 3. `src/trade-shell/services/viewModel.ts` — extend types

Append from `artifacts/totem/src/trade-shell/services/viewModel.ts`:
- `OracleNarrative` union + `NARRATIVE_COLORS` map
- `oracle.narrative?: VMField<OracleNarrative>` on the view-model type
- `market.curveTensionBps?: VMField<number>` on the view-model type
- `risk?: VMRisk` subdomain on the root view-model type

### 4. `src/trade-shell/TradeShell.tsx` — wire the new SystemOverlay

```diff
-import SystemOverlay from "../components/SystemOverlay";
+import SystemOverlay from "./components/SystemOverlay";
 ...
-  <SystemOverlay />
+  <SystemOverlay open={sysOpen} onClose={() => setSysOpen(false)} />
```

The trigger is up to the host (Cmd/Ctrl+K shortcut shown in the sandbox is
optional). The overlay only fetches when `open === true`.

### 5. `src/trade-shell/pages/DiscoveryPage.tsx` — swap panel

```diff
-import MarketPhysicsPanel from "../../components/MarketPhysicsPanel";
+import MarketPhysicsPanel from "../components/MarketPhysicsPanel";
 ...
-{metrics && <MarketPhysicsPanel metrics={metrics} />}
+<MarketPhysicsPanel />
```

The new component fetches `/api/system/physics` itself (no props required).

### 6. `src/trade-shell/pages/TokenPage.tsx` — replace inline panels

```diff
+import TokenInsightsPanel from "../components/TokenInsightsPanel";
 ...
-<OracleNarrativePanel ... />
-<CurveReactionIndicator vm={vm} />
-<RiskTrustField vm={vm} />
+<TokenInsightsPanel vm={vm} />
```

`TokenInsightsPanel` reads `vm.oracle.narrative`, `vm.market.curveTensionBps`,
and `vm.risk.*` — all populated by `extendViewModel()` above. Fields without
data are hidden, never faked.

---

## Endpoint contract — `GET /api/system/physics`

Response (200, always JSON, never throws to client):

```jsonc
{
  "curvePressureBps":  { "value": <number>, "available": true,  "windowSec": 86400 },
  "buyMomentumBps":    { "value": <number>, "available": true,  "windowSec": 3600  },
  "priceDriftAvg":     { "value": <number>, "available": true,  "windowSec": 86400 },
  "volatilityBps":     { "value": <number>, "available": true,  "windowSec": 86400 },
  "systemBias":        "BULL" | "NEUTRAL" | "BEAR",
  "oracleStatus":      { "state": "FRESH"|"STALE"|"UNKNOWN", "lastSignedAgeSec": <number|null> },
  "networkStatus":     { "state": "OK"|"DEGRADED"|"DOWN" },
  "topTotems":         [ TotemProfile, ... ]
}
```

`available:false` is honored by the UI — it renders “sin datos en {window}”
instead of a synthetic zero. `priceDriftAvg` is the average of
`(priceLast - priceFirst)` over a 24h window across active totems; it is a
proxy until per-totem supply history is recorded, hence the explicit name.

---

## Smart contracts

Not yet deployed. The backend is in advisory/dev mode. None of the new code
depends on contract calls — everything reads from `totems`, `trades`, and
`totem_history` tables.

---

## Constants used

`viewModelBuilder.patch.mjs` imports `BondingCurve.SCORE_MIN` and
`SCORE_MAX` from `./protocolConstants.mjs`. If those exports are missing in
the real repo, the file falls back to `975` / `1025` (current sandbox
defaults). Confirm `protocolConstants.mjs` exports them and remove the
fallback if so.
