/**
 * viewModelBuilder.patch.mjs — EXTENSIÓN aditiva del compose() existente.
 *
 * Mantiene la Ley A4 (puro, determinista, sin creatividad). NO modifica
 * los campos ya existentes; solo AÑADE campos nuevos a `oracle`, `market`
 * y un subdominio nuevo `risk`. Si el viewModel base cambia su API, este
 * archivo no se rompe (composición en superficie, no en interior).
 *
 * Aplicación recomendada en el repo real:
 *
 *   import { compose }        from "./viewModelBuilder.mjs";
 *   import { extendViewModel } from "./viewModelBuilder.patch.mjs";
 *
 *   export function composeExtended(raw) {
 *     return extendViewModel(compose(raw), raw);
 *   }
 *
 * Y en api/totem/viewModel.mjs reemplazar `compose(raw)` por
 * `composeExtended(raw)`.
 *
 * Si se prefiere fusionar este archivo dentro de viewModelBuilder.mjs,
 * mover las 3 funciones helper y el bloque de extensión al final de compose().
 */

import { BondingCurve, Graduation } from "./protocolConstants.mjs";

// ════════════════════════════════════════════════════════════════════════════
// Pure helpers — sin estado, sin red, deterministas
// ════════════════════════════════════════════════════════════════════════════

/**
 * Narrativa Oracle derivada SOLO de score + delta. Mapa fijo, sin creatividad.
 * Bandas calibradas con el rango legal del contrato (SCORE_MIN=975, MAX=1025).
 *
 *   ≥ 1018 y delta > 0 → "ASCENDENTE"
 *   ≥ 1010             → "FUERTE"
 *   ≥ 1000             → "ESTABLE"
 *   ≥ 990              → "DEBIL"
 *   <  990             → "CRITICO"
 *   score == null      → null
 */
function narrativeFromScore(score, delta) {
  if (score == null) return null;
  const s = Number(score);
  const d = Number(delta ?? 0);
  if (s >= 1018 && d > 0) return "ASCENDENTE";
  if (s >= 1010)          return "FUERTE";
  if (s >= 1000)          return "ESTABLE";
  if (s >=  990)          return "DEBIL";
  return "CRITICO";
}

function clampBps(num, den) {
  if (!den || den <= 0) return 0;
  const r = Math.floor((Number(num) / Number(den)) * 10_000);
  return Math.max(0, Math.min(10_000, r));
}

/**
 * curveTensionBps — tensión de la curva, medida como cercanía al próximo gate
 * de supply de graduación. Pure desde supply. 0 = lejos, 10000 = al límite.
 */
function curveTensionFromSupply(supply) {
  if (supply == null) return null;
  return clampBps(Number(supply), Number(Graduation.MIN_SUPPLY));
}

/**
 * Trust level: posición del score dentro del rango legal del Oracle.
 * 0 = piso (975), 10000 = techo (1025).
 */
function trustLevelFromScore(score) {
  if (score == null) return null;
  const min = Number(BondingCurve.SCORE_MIN ?? 975);
  const max = Number(BondingCurve.SCORE_MAX ?? 1025);
  const span = Math.max(1, max - min);
  return clampBps(Math.max(0, Number(score) - min), span);
}

// ════════════════════════════════════════════════════════════════════════════
// Extensor — añade narrative + curveTensionBps + subdominio risk
// ════════════════════════════════════════════════════════════════════════════

/**
 * @param {object} vm  ViewModel ya compuesto por compose() base.
 * @param {object} raw raw original (para conservar source/stale lineage).
 * @returns viewModel extendido (mismo objeto, mutado en superficie).
 */
export function extendViewModel(vm, raw) {
  if (!vm || typeof vm !== "object") return vm;
  const o = raw?.onchain ?? {};
  const i = raw?.indexed ?? {};

  // Reloj de referencia: usar vm.fetchedAt si existe (asegura coherencia
  // con el resto del viewModel) y caer en Date.now() si no.
  const nowSec = Number.isFinite(vm.fetchedAt) ? Number(vm.fetchedAt) : Math.floor(Date.now() / 1000);

  // ── oracle.narrative
  const scoreVal = vm.oracle?.score?.value ?? null;
  const deltaVal = vm.oracle?.scoreDelta?.value ?? null;
  vm.oracle.narrative = {
    value:  narrativeFromScore(scoreVal, deltaVal),
    source: "mirror",
    stale:  vm.oracle?.score?.stale ?? false,
  };

  // ── oracle.signedAgeSec (edad pre-cocinada para que el FE no calcule)
  const signedAt = Number(vm.oracle?.signedAt?.value);
  vm.oracle.signedAgeSec = {
    value:  Number.isFinite(signedAt) && signedAt > 0 ? Math.max(0, nowSec - signedAt) : null,
    source: vm.oracle?.signedAt?.source ?? "mirror",
    stale:  vm.oracle?.signedAt?.stale ?? false,
  };

  // ── market.curveTensionBps
  const supplyVal = vm.market?.supply?.value ?? null;
  vm.market.curveTensionBps = {
    value:  curveTensionFromSupply(supplyVal),
    source: "mirror",
    stale:  vm.market?.supply?.stale ?? false,
  };

  // ── market.lastTradeAgeSec (edad pre-cocinada del último trade)
  const lastTradeAt = Number(vm.market?.lastTradeAt?.value);
  vm.market.lastTradeAgeSec = {
    value:  Number.isFinite(lastTradeAt) && lastTradeAt > 0 ? Math.max(0, nowSec - lastTradeAt) : null,
    source: vm.market?.lastTradeAt?.source ?? "mirror",
    stale:  vm.market?.lastTradeAt?.stale ?? false,
  };

  // ── risk subdomain (nuevo)
  const trustBps = trustLevelFromScore(scoreVal);
  vm.risk = {
    _v: "risk_v1",
    trustLevelBps: {
      value:  trustBps,
      source: vm.oracle?.score?.source ?? "mirror",
      stale:  vm.oracle?.score?.stale  ?? false,
    },
    manipulationRiskBps: {
      value:  trustBps == null ? null : 10_000 - trustBps,
      source: "mirror",
      stale:  vm.oracle?.score?.stale ?? false,
    },
    negativeEvents: {
      value:  o.negativeEvents != null ? Number(o.negativeEvents)
            : i.negativeEvents != null ? Number(i.negativeEvents)
            : null,
      source: o.negativeEvents != null ? "onchain"
            : i.negativeEvents != null ? "indexed"
            : "unknown",
      stale:  o.negativeEvents == null && i.negativeEvents == null,
    },
    _sla: vm.oracle?._sla ?? { stale: false, ageSec: 0, budgetSec: 0, reason: null },
  };

  return vm;
}
