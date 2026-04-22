/**
   * mockTotems.ts — 10 tótems demo + helpers para que las pantallas que
   * dependen del backend (TokenPage) puedan renderizar también con mocks.
   *
   * Visible solo cuando el backend devuelve lista vacía sin error. Los mocks
   * NO permiten tradear: status.overall = "GRADUATED" en el VM sintético
   * deshabilita el botón Buy/Sell (canTrade check === "OK").
   */
  import type { TotemProfile } from "../../lib/tradeApi";

  export interface MockTotem extends TotemProfile {
    level:  number;
    badge:  string;
    score:  number;
  }

  const NOW = Date.now();
  const day  = (n: number) => new Date(NOW - n * 86_400_000).toISOString();
  const tsMs = (n: number) => NOW - n * 86_400_000;

  export const MOCK_TOTEMS: MockTotem[] = [
    { address:"0xa1b2c3d4e5f6789012345678901234567890abcd", name:"Wiracocha",         symbol:"WRC",  image:"", price:0.4218, supply:852_300,   volume_24h:9_148.62, created_at:day(72), level:5, badge:"Elite",      score: 942 },
    { address:"0xb2c3d4e5f67890123456789012345678901bcdef", name:"Quetzalcóatl",     symbol:"QTZ",  image:"", price:0.1083, supply:320_780,   volume_24h:4_412.18, created_at:day(48), level:4, badge:"Ascendente", score: 718 },
    { address:"0xc3d4e5f67890123456789012345678901cdefab", name:"Inti",              symbol:"INTI", image:"", price:0.2347, supply:184_220,   volume_24h:6_204.55, created_at:day(36), level:4, badge:"Solar",      score: 684 },
    { address:"0xd4e5f67890123456789012345678901defabcde", name:"Mama Killa",        symbol:"MKL",  image:"", price:0.0846, supply:382_900,   volume_24h:1_902.34, created_at:day(28), level:3, badge:"Lunar",      score: 502 },
    { address:"0xe5f67890123456789012345678901efabcdef01", name:"Pariacaca",         symbol:"PRC",  image:"", price:0.0234, supply:614_500,   volume_24h:1_124.07, created_at:day(21), level:3, badge:"Tormenta",   score: 438 },
    { address:"0xf67890123456789012345678901fabcdef0123", name:"Pachamama",          symbol:"PCH",  image:"", price:0.0185, supply:842_100,   volume_24h:920.46,   created_at:day(19), level:3, badge:"Tierra",     score: 412 },
    { address:"0x67890123456789012345678901abcdef012345", name:"Yacumama",           symbol:"YCM",  image:"", price:0.0058, supply:1_460_300, volume_24h:581.22,   created_at:day(14), level:2, badge:"Río",        score: 318 },
    { address:"0x7890123456789012345678901bcdef01234567", name:"Guardián del Agua",  symbol:"GUA",  image:"", price:0.0042, supply:1_250_400, volume_24h:1_281.94, created_at:day(9),  level:2, badge:"Guardián",   score: 286 },
    { address:"0x890123456789012345678901cdef0123456789", name:"Mama Cocha",         symbol:"MMC",  image:"", price:0.0066, supply:1_920_000, volume_24h:248.10,   created_at:day(6),  level:2, badge:"Océano",     score: 224 },
    { address:"0x90123456789012345678901def012345678901", name:"Tunupa",             symbol:"TNP",  image:"", price:0.0012, supply:4_205_000, volume_24h:78.42,    created_at:day(2),  level:1, badge:"Naciente",   score: 142 },
  ];

  const MOCK_INDEX = new Map(MOCK_TOTEMS.map(t => [t.address.toLowerCase(), t]));

  export function isMockAddress(addr: string | null | undefined): boolean {
    if (!addr) return false;
    return MOCK_INDEX.has(addr.toLowerCase());
  }
  export function getMockTotem(addr: string): MockTotem | null {
    return MOCK_INDEX.get(addr.toLowerCase()) ?? null;
  }

  /** Sort the mock list client-side por una métrica. */
  export function sortMockTotems(by: "volume" | "price" | "score" | "supply"): MockTotem[] {
    const arr = [...MOCK_TOTEMS];
    switch (by) {
      case "volume": return arr.sort((a, b) => b.volume_24h - a.volume_24h);
      case "price":  return arr.sort((a, b) => b.price - a.price);
      case "score":  return arr.sort((a, b) => b.score - a.score);
      case "supply": return arr.sort((a, b) => b.supply - a.supply);
      default:       return arr;
    }
  }

  /**
   * VM sintético para TokenPage cuando se abre un mock.
   * Estructura mínima compatible con TotemViewModel; status.overall = "GRADUATED"
   * para que el botón Buy/Sell quede deshabilitado (no se puede tradear demos).
   */
  export function buildMockViewModel(addr: string): any | null {
    const m = getMockTotem(addr);
    if (!m) return null;
    const ageSec = Math.floor((NOW - new Date(m.created_at).getTime()) / 1000);
    const F = <T,>(value: T, source: string = "db"): any => ({ value, source, stale: false });
    // Reglas reales de graduación: level=4, supply=15.000 WLD equivalente, edad=45 días
    const need = { level: 4, supply: 15_000, age: 45 * 86_400 };
    const ratio = (have: number, n: number) => Math.min(10000, Math.round((have / n) * 10000));
    const supplyWldEq = m.supply * m.price; // proxy: WLD equivalente del supply
    const gates = {
      level:  { have: m.level,         need: need.level,  ratioBps: ratio(m.level,         need.level)  },
      supply: { have: supplyWldEq,     need: need.supply, ratioBps: ratio(supplyWldEq,     need.supply) },
      volume: { have: String(m.volume_24h), need: String(need.supply), ratioBps: ratio(m.volume_24h, need.supply), uses: "verifiedVolume" as const },
      age:    { have: ageSec,          need: need.age,    ratioBps: ratio(ageSec,          need.age)    },
    };
    const overallBps = Math.round((gates.level.ratioBps + gates.supply.ratioBps + gates.volume.ratioBps + gates.age.ratioBps) / 4);
    const slaOk = { stale: false, ageSec: 0, budgetSec: 60, reason: null };
    return {
      address: m.address,
      identity:    { _v:"identity_v1", name:F(m.name), owner:F(null), symbol:F(m.symbol), _sla:slaOk },
      status:      { _v:"status_v1", graduated:F(false), ammPair:F(null), fraudLocked:F(false), frozen:F(false), emergencyMode:F(false), isHuman:F(true), isTotem:F(true), overall:"GRADUATED", _sla:slaOk },
      oracle:      { _v:"oracle_v1", score:F(m.score), influence:F(m.score * 1.3), signedAt:F(tsMs(0.01)), scoreDelta:F(12), influenceDelta:F(8), narrative:F("ESTABLE"), signedAgeSec:F(120), _sla:slaOk },
      market:      { _v:"market_v1", price:F(m.price), supply:F(m.supply), rawVolume:F(m.volume_24h), verifiedVolume:F(String(m.volume_24h)), volumeShown:F(String(m.volume_24h)), createdAt:F(tsMs(ageSec/86400)), lastTradeAt:F(tsMs(0.5)), ageSec:F(ageSec), curveTensionBps:F(4200), lastTradeAgeSec:F(43_000), _sla:slaOk },
      progression: { _v:"progression_v1", level:F(m.level), badge:F(m.badge), totalScoreAccumulated:F(m.score * 4), negativeEvents:F(0), levelProgress:F({ nextThreshold: m.level + 1, progressBps: 6_500 }), graduation:F({ gates, bottleneckGate:"supply", overallBps, eligible:false }), _sla:slaOk },
      userContext: { _v:"userContext_v1", balance:F(0), sellWindowUsed:F(0), credits:F("0"), _sla:slaOk },
      trading:     { _v:"trading_v1", buyFeeBps:F(100), sellFeeBps:F(100), ownerCapBps:F(2_000), userCapBps:F(500), humanTotemFeeBps:F(50), rateLimit:F(null), _sla:slaOk },
      risk:        { _v:"risk_v1", trustLevelBps:F(7_500), _sla:slaOk },
      _meta:       { generatedAt: NOW, isMock: true },
    };
  }
  