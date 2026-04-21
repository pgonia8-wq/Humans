# Cobertura del Protocolo — Estado real

Última actualización: 2026-04-21
HEAD origin/main: `e0703946`

## Reglas del proyecto

- Contratos Solidity en `tótem/contracts/` = **única fuente de verdad**.
- Los mirrors en `api/lib/` reflejan BigInt EXACTO de los contratos. NO se inventa lógica, NO se simplifica matemática on-chain.
- Solo Orb-verified escribe (gate en endpoints sensibles).
- Antes de tocar un mirror, leer el contrato Solidity correspondiente.
- ONCHAIN WINS: si DB/backend dice una cosa y el contrato otra, gana el contrato.

## Contratos (20)

| # | Contrato | Mirror `api/lib/` | Endpoints `api/` | Frontend | Estado |
|---|---|---|---|---|---|
| C1 | TotemBondingCurve | `curve.mjs` | `market/buy`, `market/sellPreview`, `market/execute`, `market/tradeLimits` | TradePanel + integraciones | ✅ COMPLETO |
| C2 | TotemAntiManipulationLayer | `antiManipulation.mjs` | `system/antiManip-preview` | AntiManipWidget | ✅ COMPLETO |
| C3 | TotemStabilityModule | `stability.mjs` | `system/stability` | — | ✅ BACKEND |
| C4 | TotemGraduationManager | `graduation.mjs` | `totem/graduate-preview`, `totem/graduate-execute` | — | ✅ BACKEND (pendiente migration_11 + UI) |
| C5 | TotemRateLimiter | `rateLimiter.mjs` + `rateLimiter.adapter.mjs` | uso interno | — | ✅ INTERNO (sin endpoint preview) |
| C6 | TotemOracle | `oracleSigner.mjs` + `updateTotem.mjs` + `updateUserTotem.mjs` | `totem/create` y otros adapters | — | ✅ ADAPTER |
| C7 | TotemRegistry | constantes `LEVEL_MIN/MAX` en `protocolConstants.mjs` | — | — | ⚠️ PARCIAL (solo constantes) |
| C8 | HumanTotem | — | — | — | ⛔ PENDIENTE CLASIFICAR |
| C9 | Tótem.sol | — | — | — | ⛔ PENDIENTE CLASIFICAR |
| C10 | TotemAccessGateway | — | — | — | ⛔ PENDIENTE CLASIFICAR |
| C11 | TotemAttestation | — | — | — | ⛔ PENDIENTE CLASIFICAR |
| C12 | TotemControl | — | — | — | ⛔ PENDIENTE CLASIFICAR |
| C13 | TotemCoreRouter | — | — | — | ⛔ PENDIENTE CLASIFICAR |
| C14 | TotemCredits | — | — | — | ⛔ PENDIENTE CLASIFICAR |
| C15 | TotemFeeRouter | — | — | — | ⛔ PENDIENTE CLASIFICAR |
| C16 | TotemGovernance | — | — | — | ⛔ PENDIENTE CLASIFICAR |
| C17 | TotemIntentRouter | — | — | — | ⛔ PENDIENTE CLASIFICAR |
| C18 | TotemMarketMetrics | — | — | — | ⛔ PENDIENTE CLASIFICAR |
| C19 | TotemReader | — | — | — | ⛔ PENDIENTE CLASIFICAR |
| C20 | TotemTreasury | — | — | — | ⛔ PENDIENTE CLASIFICAR |

**Cobertura real: 6/20 completos + 1 parcial = 32.5%.**

## Defensas anti-regresión

- `api/lib/invariants.mjs` — 15 invariants, todos verdes.
- Invariant #15 (`E2E_PIPELINE_ORDER`) protege 9 archivos económicos contra reimplementaciones inline de matemática on-chain (curva, fees, sell-window, EMA, cooldown, graduation thresholds, oracle UPDATE_FEE).

## Pushes en `origin/main` (cronológico)

| HEAD | Bloque | Qué entrega |
|---|---|---|
| F1–F8 | … → `5b92907c` | Backend protocolo (curve, stability, oracle adapter, etc.) |
| `a0c35222` | F9 | GraduationManager: mirror + preview/execute endpoints + `sql/migration_11_totem_graduations.sql` |
| `8dee3112` | F11.5 | Invariant #15 cubre 9 archivos (antes 5) |
| `a0721f54` | F10 | AntiManipulation preview endpoint (calculator-pure) |
| `397ec554` | F13 | AntiManipWidget + integración TradePanel |
| `e0703946` | F12 | Cableado `currentPriceWld` desde TotemDashboard y BuySellFullscreen |

## Acción humana pendiente

1. **Aplicar `Humans/sql/migration_11_totem_graduations.sql` en Supabase dev y prod.** Sin esto, los endpoints `totem/graduate-*` devuelven 503.

## Próximo bloque propuesto

**C8–C20: auditoría read-only de los 13 contratos sin clasificar.**
Entrega esperada: tabla por contrato con (a) funciones públicas relevantes, (b) si requieren mirror BigInt, (c) si requieren endpoint o solo constantes, (d) si tocan frontend. Cierra la incertidumbre sobre cuántos bloques reales faltan.

## Convención de fases corregida

A partir del próximo bloque: **1 contrato = 1 bloque**, sub-bloques por capa (`.audit`, `.mirror`, `.api`, `.fe`). Las tareas meta (invariants, audits transversales) van numeradas como `.x`.
