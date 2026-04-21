# Cableado del protocolo — Mapa de rutas e instrucciones

Última actualización: 2026-04-21
Versión del documento: 1.0
Estado backend: 20/20 contratos cubiertos · 19 invariants verdes · `PROTOCOL_VERSION = 0.2.0`

Este documento es la guía única para cablear los previews advisory del
protocolo en el frontend, sin desplegar contratos. Todo lo descrito acá
**no rompe nada**: los previews son calculator-pure, no llaman RPC ni
escriben on-chain.

Documentos hermanos:
- `PROTOCOL_COVERAGE.md` — qué contratos están cubiertos y cómo.
- `tótem/contracts/*.sol` — la única fuente de verdad. NO se inventa lógica.

---

## 1. Reglas duras (no negociables)

1. **Contratos Solidity = sola verdad.** Si el `.sol` no tiene una función,
   el mirror NO la inventa y el endpoint NO la inventa.
2. **`api/lib/*.mjs` = mirrors BigInt EXACTOS** del contrato. Ya están
   pusheados. NO se duplica matemática on-chain en endpoints ni en frontend.
3. **3 archivos por commit, 1 commit por push.** No se mezclan capas
   distintas en un mismo commit salvo que sean del mismo bloque.
4. **PUSH solo con autorización explícita** del dueño del repo.
5. **Strings BigInt en wire format** entre frontend y backend, nunca
   `number` para cantidades on-chain (wei, score raw, supply en unidades).
6. **ONCHAIN WINS.** Cuando exista contrato desplegado, los previews
   pasan a leer estado real vía RPC. Hasta entonces se etiquetan
   `advisory: true` y no producen botones de execute.
7. **Solo Orb-verified escribe.** Los previews son lectura, públicos.

---

## 2. Mapa de rutas API completo

Convención: todas las rutas son `POST` con body JSON salvo que digan `GET`.
Todas devuelven `application/json`. Los BigInt viajan como string.

### 2.1 Rutas existentes (pusheadas)

| Ruta | Contrato | Cobertura | Archivo backend |
|---|---|---|---|
| `POST /api/walletVerify` | — | sesión SIWE | `api/walletVerify.mjs` |
| `POST /api/totem/create` | C7 | crear totem (Orb) | `api/totem/create.mjs` |
| `GET  /api/totem/profile` | — | identidad + métricas | `api/totem/profile.mjs` |
| `GET  /api/totem/history` | — | serie de precios | `api/totem/history.mjs` |
| `GET  /api/totem/holders` | — | distribución | `api/totem/holders.mjs` |
| `GET  /api/totem/trades` | — | últimos trades | `api/totem/trades.mjs` |
| `POST /api/totem/graduate-preview` | C4 | elegibilidad + liquidez | `api/totem/graduate-preview.mjs` |
| `POST /api/totem/graduate-execute` | C4 | execute (Orb, requiere contrato) | `api/totem/graduate-execute.mjs` |
| `POST /api/market/buy` | C1 | preview buy (mirror curve) | `api/market/buy.mjs` |
| `POST /api/market/sellPreview` | C1 | preview sell | `api/market/sellPreview.mjs` |
| `POST /api/market/execute` | C1 | confirm txHash + persistir | `api/market/execute.mjs` |
| `POST /api/market/tradeLimits` | C5 | rate limits del usuario | `api/market/tradeLimits.mjs` |
| `POST /api/system/antiManip-preview` | C2 | EMA + cooldown preview | `api/system/antiManip-preview.mjs` |
| `GET  /api/system/stability` | C3 | stress global | `api/system/stability.mjs` |
| `GET  /api/system/metrics` | — | métricas de sistema | `api/system/metrics.mjs` |
| `GET  /api/system/all` | — | listar totems | `api/system/all.mjs` |
| `GET  /api/system/search` | — | search | `api/system/search.mjs` |
| `POST /api/system/transferPreview` | **C8** | **HumanTotem fee preview** | `api/system/transferPreview.mjs` |
| `POST /api/system/feeSplitPreview` | **C15** | **FeeRouter split preview** | `api/system/feeSplitPreview.mjs` |

### 2.2 Rutas a crear (cableado pendiente)

| Ruta | Contrato | Cobertura | Plantilla |
|---|---|---|---|
| `POST /api/totem/sync-preview` | **C9** | **Tótem level/badge/decay/penalty preview** | ver §4.3 |

Esa es la única ruta nueva que falta crear. C4/C8/C15 ya tienen endpoint.

---

## 3. Mapa frontend completo

### 3.1 Cliente HTTP — `src/lib/tradeApi.ts`

Funciones existentes: `buyPreview`, `sellPreview`, `executeTrade`,
`getTotemProfile`, `getTotemHistory`, `createTotem`, `getTradeLimits`,
`getSystemMetrics`, `getAllTotems`, `searchTotems`, `getStabilityStatus`,
`antiManipPreview`, `getTotemTrades`, `getTotemHolders`.

**Funciones a añadir** (al final del archivo, manteniendo el patrón
`apiFetch<T>` + tipos exportados):

```ts
// === C4 GRADUACIÓN ==========================================
export interface GraduatePreviewResult {
  advisory: true; mode: "production-stub" | "simulation";
  totem: string; eligible: boolean; reason: string | null;
  gaps: { level: string; supply: string; volume: string; age: string };
  liquidity: { wldRequired: string; tokenAmount: string } | null;
  constants: { MIN_LEVEL: string; MIN_SUPPLY: string; MIN_VOLUME_WEI: string;
               MIN_AGE_SEC: string; LIQUIDITY_BPS: string; BPS_DENOMINATOR: string };
  warnings: string[];
}
export async function graduatePreview(totemAddress: string): Promise<GraduatePreviewResult> {
  return apiFetch("/totem/graduate-preview", { method: "POST",
    body: JSON.stringify({ totem: totemAddress }) });
}

// === C8 HUMANTOTEM FEE ======================================
export interface HumanFeePreviewParams {
  amount: string; score: string; scoreAgeSec?: string;
  oracleHasScore?: boolean; fromOwner?: boolean; locked?: boolean; baseFeeBps?: string;
}
export interface HumanFeePreview {
  advisory: true; ok: boolean; exempted?: boolean;
  feeBps?: string; fee?: string; net?: string; treasury?: string;
  reason?: "HumanFraudDetected" | "StaleScore"; maxStalenessSec?: string;
  inputs: Record<string, string | boolean>;
  constants: { SCORE_THRESHOLD_LOW: string; SCORE_THRESHOLD_CRITICAL: string;
               FEE_BPS_LOW: string; FEE_BPS_CRITICAL: string;
               FEE_BPS_DENOMINATOR: string; MAX_SCORE_STALENESS_SEC: string };
  note?: string;
}
export async function humanFeePreview(p: HumanFeePreviewParams): Promise<HumanFeePreview> {
  return apiFetch("/system/transferPreview", { method: "POST", body: JSON.stringify(p) });
}

// === C9 TÓTEM SYNC ==========================================
export interface SyncPreviewParams {
  history: { initialized: boolean; totalScoreAccumulated: string;
             lastScore: string; lastInfluence: string;
             lastUpdate: string; negativeEvents: string };
  newScore: string; newInfluence: string;
  newTimestampSec: string; nowSec?: string;
}
export interface SyncPreview {
  advisory: true; ok: boolean; init?: boolean;
  reason?: "InvalidTimestamp" | "SyncTooFrequent"; detail?: string;
  newHistory?: SyncPreviewParams["history"];
  level?: string; badge?: string; scoreAccumulatedDelta?: string;
  constants: { MIN_SYNC_INTERVAL_SEC: string; MAX_ACCUMULATED_SCORE: string;
               NEGATIVE_BADGE_THRESHOLD: string; ONE_DAY_SEC: string };
}
export async function syncPreview(p: SyncPreviewParams): Promise<SyncPreview> {
  return apiFetch("/totem/sync-preview", { method: "POST", body: JSON.stringify(p) });
}

// === C15 FEEROUTER SPLIT ====================================
export interface FeeSplitPreview {
  advisory: true; ok: boolean; reason?: string;
  total: string; treasury: string; buyback: string; reward: string;
  inputs: { balance: string };
  constants: { TREASURY_PCT: string; BUYBACK_PCT: string;
               REWARD_PCT: string; PCT_DENOMINATOR: string };
}
export async function feeSplitPreview(balanceWei: string): Promise<FeeSplitPreview> {
  return apiFetch("/system/feeSplitPreview", { method: "POST",
    body: JSON.stringify({ balance: balanceWei }) });
}
```

### 3.2 Componentes a crear — `src/pages/trade/components/`

| Componente | Contrato | Props | Llama |
|---|---|---|---|
| `GraduatePreviewCard.tsx` | C4 | `{ totemAddress, isDark }` | `graduatePreview` |
| `SyncPreviewCard.tsx` | C9 | `{ totemAddress, score, isDark }` | `syncPreview` |
| `HumanFeeBadge.tsx` | C8 | `{ score, isDark }` | `humanFeePreview` |
| `FeeSplitCard.tsx` | C15 | `{ volume24h, isDark }` | `feeSplitPreview` |

Patrón de referencia: `AntiManipWidget.tsx` (mismo `useEffect+alive`,
mismo manejo de `loading/error/data`, mismos tokens visuales del
dashboard, footer "advisory · el contrato decide").

### 3.3 Integración — `src/pages/trade/TotemDashboard.tsx`

Importar los 4 componentes al tope:

```ts
import GraduatePreviewCard from "./components/GraduatePreviewCard";
import SyncPreviewCard     from "./components/SyncPreviewCard";
import HumanFeeBadge       from "./components/HumanFeeBadge";
import FeeSplitCard        from "./components/FeeSplitCard";
```

Insertar el bloque dentro de la columna izquierda del grid principal,
**después** del bloque de métricas y **antes** de los TABS SECUNDARIOS:

```tsx
{/* ════════════════════ PROTOCOL PREVIEWS START ════════════════════ */}
{/* Cards advisory C4/C8/C9/C15. Calculator-pure. NO ejecuta on-chain.
    Para quitar todas: borrar este bloque + los 4 imports al tope. */}
<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
  <GraduatePreviewCard totemAddress={profile.address} isDark={isDark} />
  <SyncPreviewCard     totemAddress={profile.address}
                       score={profile.score} isDark={isDark} />
  {isOwner && <HumanFeeBadge score={profile.score} isDark={isDark} />}
  {isOwner && <FeeSplitCard volume24h={profile.volume_24h} isDark={isDark} />}
</div>
{/* ════════════════════ PROTOCOL PREVIEWS END ══════════════════════ */}
```

Para revertir TODO el cableado UI: eliminar el bloque marcado y los 4
imports. Cero cambios adicionales requeridos.

---

## 4. Plantillas de los archivos a crear

### 4.1 Patrón general de endpoint advisory

Todos los endpoints siguen el mismo patrón estricto, copiado de
`api/system/antiManip-preview.mjs` (ya pusheado). Ver el archivo como
referencia canónica.

### 4.2 Patrón general de componente UI

Ver `src/pages/trade/components/AntiManipWidget.tsx` como referencia
canónica:
- `useEffect` con `let alive = true; ...; return () => { alive = false; };`
- 3 estados explícitos: skip / loading / error / success.
- Tokens visuales tomados del `TotemDashboard` (cardBg, cardBorder, txt, etc).
- Footer fijo: `advisory · el contrato decide`.
- BigInt llega como string desde el endpoint, formatear con helpers locales.

### 4.3 Plantilla específica — `api/totem/sync-preview.mjs`

Único endpoint que falta crear. Esqueleto a completar con la firma
exacta de `previewSync` del mirror (`api/lib/totemSync.mjs` líneas 104-195):

```javascript
import { previewSync, MIN_SYNC_INTERVAL_SEC, MAX_ACCUMULATED_SCORE,
         NEGATIVE_BADGE_THRESHOLD, ONE_DAY_SEC } from "../lib/totemSync.mjs";

function parseBigIntStrict(value, name, { allowNullDefault = null } = {}) {
  if (value === undefined || value === null || value === "") {
    if (allowNullDefault !== null) return allowNullDefault;
    throw new Error(`${name} requerido`);
  }
  const s = typeof value === "string" ? value.trim() : String(value);
  if (!/^\d+$/.test(s)) throw new Error(`${name} debe ser entero string`);
  return BigInt(s);
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Método no permitido" });

  const { history, newScore, newInfluence, newTimestampSec, nowSec } = req.body ?? {};
  if (!history || typeof history !== "object") {
    return res.status(400).json({ error: "history (object) requerido" });
  }

  let h, score, infl, ts, now;
  try {
    h = {
      initialized:           !!history.initialized,
      totalScoreAccumulated: parseBigIntStrict(history.totalScoreAccumulated, "history.totalScoreAccumulated", { allowNullDefault: 0n }),
      lastScore:             parseBigIntStrict(history.lastScore,             "history.lastScore",             { allowNullDefault: 0n }),
      lastInfluence:         parseBigIntStrict(history.lastInfluence,         "history.lastInfluence",         { allowNullDefault: 0n }),
      lastUpdate:            parseBigIntStrict(history.lastUpdate,            "history.lastUpdate",            { allowNullDefault: 0n }),
      negativeEvents:        parseBigIntStrict(history.negativeEvents,        "history.negativeEvents",        { allowNullDefault: 0n }),
    };
    score = parseBigIntStrict(newScore,        "newScore");
    infl  = parseBigIntStrict(newInfluence,    "newInfluence");
    ts    = parseBigIntStrict(newTimestampSec, "newTimestampSec");
    now   = nowSec !== undefined && nowSec !== null
      ? parseBigIntStrict(nowSec, "nowSec")
      : BigInt(Math.floor(Date.now() / 1000));
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  let preview;
  try {
    preview = previewSync({
      history:         h,
      newScore:        score,
      newInfluence:    infl,
      newTimestampSec: ts,
      nowSec:          now,
    });
  } catch (e) {
    return res.status(500).json({ error: "Error en mirror totemSync", detail: e.message });
  }

  const constants = {
    MIN_SYNC_INTERVAL_SEC:    MIN_SYNC_INTERVAL_SEC.toString(),
    MAX_ACCUMULATED_SCORE:    MAX_ACCUMULATED_SCORE.toString(),
    NEGATIVE_BADGE_THRESHOLD: NEGATIVE_BADGE_THRESHOLD.toString(),
    ONE_DAY_SEC:              ONE_DAY_SEC.toString(),
  };

  if (!preview.ok) {
    return res.status(200).json({
      advisory: true, ok: false,
      reason: preview.reason, detail: preview.detail,
      constants,
    });
  }

  return res.status(200).json({
    advisory: true, ok: true, init: preview.init,
    newHistory: {
      initialized:           preview.newHistory.initialized,
      totalScoreAccumulated: preview.newHistory.totalScoreAccumulated.toString(),
      lastScore:             preview.newHistory.lastScore.toString(),
      lastInfluence:         preview.newHistory.lastInfluence.toString(),
      lastUpdate:            preview.newHistory.lastUpdate.toString(),
      negativeEvents:        preview.newHistory.negativeEvents.toString(),
    },
    level:                 preview.level.toString(),
    badge:                 preview.badge.toString(),
    scoreAccumulatedDelta: preview.scoreAccumulatedDelta.toString(),
    constants,
    note: "Calculator-pure. En PROD, leer Tótem.history(user) vía RPC y pasarla aquí.",
  });
}
```

---

## 5. Plan de pushes recomendado

Cada push valida con `node -e` los nuevos imports y los 19 invariants
ya existentes. No se pushea nada que rompa los 19/19.

### Push F15.1 — backend (3 archivos)

1. `api/system/transferPreview.mjs` *(ya commiteado junto con esta guía)*
2. `api/system/feeSplitPreview.mjs` *(ya commiteado junto con esta guía)*
3. `api/totem/sync-preview.mjs` *(falta crear según §4.3)*

> Nota: 1 y 2 viajan en el mismo commit que este `WIRING_GUIDE.md`
> para que el mapa quede consistente con el remoto desde el push 0.
> El push F15.1 real solo agrega el archivo 3.

### Push F15.2 — cliente + 2 cards (3 archivos)

1. `src/lib/tradeApi.ts` (añadir 4 funciones + tipos según §3.1)
2. `src/pages/trade/components/GraduatePreviewCard.tsx`
3. `src/pages/trade/components/SyncPreviewCard.tsx`

Validación: `pnpm --filter @workspace/h-by-humans run build` debe pasar.

### Push F15.3 — 2 cards más + integración (3 archivos)

1. `src/pages/trade/components/HumanFeeBadge.tsx`
2. `src/pages/trade/components/FeeSplitCard.tsx`
3. `src/pages/trade/TotemDashboard.tsx` (insertar bloque + 4 imports según §3.3)

Validación: build TS + abrir el dashboard de un totem y ver las 4 cards
renderizando con datos advisory.

---

## 6. Comandos de validación reutilizables

```bash
# Validar imports + 19 invariants verde
cd Humans
SUPABASE_URL=http://x SUPABASE_SERVICE_ROLE_KEY=x SESSION_SECRET=x node -e "
import('./api/lib/invariants.mjs').then(m => {
  const r = m.runAllInvariants();
  console.log(r.passed + '/' + r.total, r.ok ? 'GREEN' : 'RED');
  process.exit(r.ok ? 0 : 1);
});
"

# Validar que un endpoint advisory importa sin errores
node -e "import('./api/totem/sync-preview.mjs').then(m => console.log(typeof m.default))"

# Build TypeScript del frontend
pnpm --filter @workspace/h-by-humans run build
```

---

## 7. Cómo revertir el cableado UI completo

1. Borrar el bloque marcado `PROTOCOL PREVIEWS START/END` de
   `src/pages/trade/TotemDashboard.tsx`.
2. Borrar los 4 imports al tope de ese mismo archivo.
3. Borrar los 4 archivos `*Card.tsx` / `*Badge.tsx` en
   `src/pages/trade/components/`.
4. (Opcional) Borrar las 4 funciones nuevas y sus tipos al final de
   `src/lib/tradeApi.ts`.

Para revertir el cableado backend completo:
1. Borrar `api/system/transferPreview.mjs`,
   `api/system/feeSplitPreview.mjs`,
   `api/totem/sync-preview.mjs`.
2. Los mirrors `api/lib/*.mjs` y los invariants quedan: son útiles
   independientemente del cableado UI.

---

## 8. Acción humana persistente (no automatizable)

**Aplicar `Humans/sql/migration_11_totem_graduations.sql` en Supabase
dev y prod.** Sin esto, `graduate-preview` devuelve advisory con warning
"totem_graduations no existe" y `graduate-execute` devuelve 503.

---

## 9. Próximos bloques fuera del alcance de esta guía

- **C4 execute UI**: requiere contrato `GraduationManager` desplegado +
  migration_11 aplicada. Botón "Graduar" en card C4 con confirmación Orb.
- **C9 execute path**: requiere contrato `Tótem` desplegado. Botón
  "Sync ahora" en card C9.
- **C15 lectura real**: cuando exista `FEE_ROUTER_ADDRESS`, leer
  `balanceOf(feeRouter)` vía RPC y pasarlo a `feeSplitPreview` en lugar
  del proxy advisory desde `volume_24h`.
- **C8 enforcement real**: requiere `HUMAN_TOTEM_ADDRESS` desplegado y
  llamadas a `oracle.score(user)` para `score` y `scoreAge` reales.
