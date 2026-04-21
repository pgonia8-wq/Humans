# Cobertura del Protocolo — Estado real

Última actualización: 2026-04-21
PROTOCOL_VERSION: `0.2.0`

## Reglas del proyecto

- Contratos Solidity en `tótem/contracts/` = **única fuente de verdad**.
- Los mirrors en `api/lib/` reflejan BigInt EXACTO de los contratos. NO se inventa lógica, NO se simplifica matemática on-chain.
- Solo Orb-verified escribe (gate en endpoints sensibles).
- Antes de tocar un mirror, leer el contrato Solidity correspondiente.
- ONCHAIN WINS: si DB/backend dice una cosa y el contrato otra, gana el contrato.
- Convención: 1 contrato = 1 bloque (C#). 3 archivos por commit, 1 commit por push.

## Tabla maestra de los 20 contratos

| # | Contrato | Mirror `api/lib/` | Constantes en `protocolConstants.mjs` | Endpoints `api/` | Frontend | Estado |
|---|---|---|---|---|---|---|
| C1 | TotemBondingCurve | `curve.mjs` | `BondingCurve` | `market/buy`, `market/sellPreview`, `market/execute`, `market/tradeLimits` | TradePanel + integraciones | ✅ COMPLETO |
| C2 | TotemAntiManipulationLayer | `antiManipulation.mjs` | `AntiManip` | `system/antiManip-preview` | AntiManipWidget | ✅ COMPLETO |
| C3 | TotemStabilityModule | `stability.mjs` | `Stability` | `system/stability` | — | ✅ BACKEND |
| C4 | TotemGraduationManager | `graduation.mjs` | `Graduation` | `totem/graduate-preview`, `totem/graduate-execute` | — | ✅ BACKEND (pendiente migration_11 + UI) |
| C5 | TotemRateLimiter | `rateLimiter.mjs` + `rateLimiter.adapter.mjs` | `RateLimiter` | uso interno | — | ✅ INTERNO |
| C6 | TotemOracle | `oracleSigner.mjs` + `updateTotem.mjs` + `updateUserTotem.mjs` | `Oracle` | `totem/create` y otros adapters | — | ✅ ADAPTER |
| C7 | TotemRegistry | — *(no math, solo lookups)* | `Registry` | — | — | ✅ CONSTANTES |
| **C8** | **HumanTotem** | **`humanTotemFees.mjs`** | `HumanTotem` | — | — | ✅ MIRROR |
| **C9** | **Tótem.sol** | **`totemSync.mjs`** | `TotemSync` | — | — | ✅ MIRROR |
| C10 | TotemAccessGateway | — *(slippage helper en constants)* | `AccessGateway` | — | — | ✅ CONSTANTES |
| C11 | TotemAttestation | — *(`clampAttestationDelay` en constants)* | `Attestation` | — | — | ✅ CONSTANTES + helper |
| C12 | TotemControl | — *(`validateFeeChange` en constants)* | `TotemControl` | — | — | ✅ CONSTANTES + helper |
| C13 | TotemCoreRouter | ❌ NO_NEEDED *(composición pura de C2/C3/C7/C11)* | — | — | — | ✅ DECLARADO NO_NEEDED |
| C14 | TotemCredits | ❌ NO_NEEDED *(mapping trivial deposit/withdraw)* | — | — | — | ✅ DECLARADO NO_NEEDED |
| **C15** | **TotemFeeRouter** | **`feeRouter.mjs`** | `FeeRouter` | — | — | ✅ MIRROR |
| C16 | TotemGovernance | — *(timelock state-dependent, no math pura)* | `Governance` | — | — | ✅ CONSTANTES |
| C17 | TotemIntentRouter | `intentRouter.mjs` *(parcial — solo lo escrito en .sol)* | inline en `intentRouter.mjs` | — | — | ✅ MIRROR PARCIAL |
| C18 | TotemMarketMetrics | — *(`resolveVolume` en constants)* | `MarketMetrics` | — | — | ✅ CONSTANTES + helper |
| C19 | TotemReader | ❌ NO_NEEDED *(view aggregator de oracle/registry)* | — | — | — | ✅ DECLARADO NO_NEEDED |
| C20 | TotemTreasury | — *(`previewTreasuryWithdraw` en constants)* | — | — | — | ✅ CONSTANTES + helper |

**Cobertura final: 20/20 (100%) cubiertos.**
- 6 mirrors completos con endpoints (C1–C6)
- 3 mirrors nuevos puros (C8 humanTotemFees, C9 totemSync, C15 feeRouter)
- 1 mirror parcial honesto (C17 intentRouter — refleja median3, consensus,
  EIP-712 domain y validaciones visibles del contrato; no incluye
  `_calculateIntentHash` / `_verifySignature` / `withdraw` porque la fuente
  Solidity literalmente dice `// ... (Firma y Withdraw functions)` sin cuerpo.
  Se completará SIN inventar cuando el .sol se complete.)
- 7 cubiertos por constantes + helpers (C7, C10, C11, C12, C16, C18, C20)
- 3 declarados explícitamente NO_NEEDED con justificación (C13 composición, C14 trivial, C19 wrapper)

## Defensas anti-regresión

`api/lib/invariants.mjs` — **19 invariants, todos verdes** (PROTOCOL_VERSION 0.2.0).

Nuevos en F14:
- **#16 `humanTotemFeeParity`** (C8): boundary table de score→feeBps, fórmula `(amount*feeBps)/10_000`, owner exempt, locked → `HumanFraudDetected`, stale > 10min → `StaleScore`.
- **#17 `totemLevelBadgeParity`** (C9): boundaries `calculateLevel`/`calculateBadge`, decay `(total*dt)/1day/100`, penalty `(last-cur)/3` capped at `total/2`, `getFraudDelay` matrix level×price + manual override.
- **#18 `feeRouterSplitConservation`** (C15): para todo balance > 0, `treasury+buyback+reward === balance` (preserva sum por reward = resto).
- **#19 `intentRouterParity`** (C17): `median3` en 10 permutaciones (incluye iguales/borde), `consensus` aplica median a score+influence por separado, `previewExecuteIntent` rechaza correctamente expired/non-human/slippage/insufficient y calcula `surplus = msgValue - price` exacto.

Defensa F11.5 sigue activa:
- **#15 `e2ePipelineOrder`** cubre 9 archivos económicos contra reimplementaciones inline de math on-chain (curva, fees, sell-window, EMA, cooldown, graduation thresholds, oracle UPDATE_FEE).

## Pushes en `origin/main` (cronológico)

| HEAD | Bloque | Qué entrega |
|---|---|---|
| F1–F8 | … → `5b92907c` | Backend protocolo (curve, stability, oracle adapter, etc.) |
| `a0c35222` | F9 | GraduationManager: mirror + preview/execute endpoints + `sql/migration_11_totem_graduations.sql` |
| `8dee3112` | F11.5 | Invariant #15 cubre 9 archivos (antes 5) |
| `a0721f54` | F10 | AntiManipulation preview endpoint (calculator-pure) |
| `397ec554` | F13 | AntiManipWidget + integración TradePanel |
| `e0703946` | F12 | Cableado `currentPriceWld` desde TotemDashboard y BuySellFullscreen |
| `cc84171e` | F14.0 | doc PROTOCOL_COVERAGE.md (resumen estado real) |
| `9a2960f5` | F14.1 | mirrors C8/C9/C15: `humanTotemFees.mjs` + `totemSync.mjs` + `feeRouter.mjs` |
| _(este commit)_ | F14.2 | constants extendidos C7/C10/C11/C12/C16/C18/C20 + invariants #16/#17/#18 + doc final |

## Acciones humanas pendientes

1. **Aplicar `Humans/sql/migration_11_totem_graduations.sql` en Supabase dev y prod.** Sin esto, los endpoints `totem/graduate-*` devuelven 503.

## Próximos bloques propuestos (orden sugerido)

1. **C4 UI**: cablear `graduate-preview`/`graduate-execute` en TotemDashboard (gating de evolución del tótem). Backend ya está, falta frontend.
2. **C8 endpoint + UI**: `api/system/transferPreview` que use `humanTotemFees.previewTransfer` para mostrar fee esperado antes de cualquier transfer del HumanTotem ERC-20.
3. **C9 endpoint + UI**: `api/totem/syncPreview` que use `totemSync.previewSync` para que el dashboard muestre el next-level/next-badge antes del próximo sync (incluye decay y fraud-delay countdown).
4. **C15 dashboard**: card en TotemDashboard mostrando split previsto del próximo `harvest()` con `feeRouter.previewSplit`.

## Convención corregida (vigente desde F14)

- **1 contrato = 1 bloque** (C#). Sub-bloques por capa: `.audit`, `.mirror`, `.api`, `.fe`.
- Tareas meta (invariants, audits transversales, docs) numeradas como `.x`.
- **3 archivos por commit, 1 commit por push.**
- NO inventar lógica, NO simplificar math on-chain. Si el contrato no la tiene, NO crear "preview" especulativo.
