/**
   * mockTotems.ts — 10 tótems de demostración para que la UI sea visible
   * cuando el backend no devuelve datos. Solo se inyectan en DiscoveryPage
   * cuando `getAllTotems` retorna lista vacía sin error.
   *
   * No interfieren con datos reales. No se persisten. No tocan el backend.
   */
  import type { TotemProfile } from "../../lib/tradeApi";

  const NOW = Date.now();
  const day = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

  export const MOCK_TOTEMS: TotemProfile[] = [
    {
      address:    "0xa1b2c3d4e5f6789012345678901234567890abcd",
      name:       "Wiracocha",
      symbol:     "WRC",
      image:      "",
      price:      0.4218,
      supply:     852_300,
      volume_24h: 9_148.62,
      created_at: day(72),
    },
    {
      address:    "0xb2c3d4e5f67890123456789012345678901bcdef",
      name:       "Quetzalcóatl",
      symbol:     "QTZ",
      image:      "",
      price:      0.1083,
      supply:     320_780,
      volume_24h: 4_412.18,
      created_at: day(48),
    },
    {
      address:    "0xc3d4e5f67890123456789012345678901cdefab",
      name:       "Inti",
      symbol:     "INTI",
      image:      "",
      price:      0.2347,
      supply:     184_220,
      volume_24h: 6_204.55,
      created_at: day(36),
    },
    {
      address:    "0xd4e5f67890123456789012345678901defabcde",
      name:       "Mama Killa",
      symbol:     "MKL",
      image:      "",
      price:      0.0846,
      supply:     382_900,
      volume_24h: 1_902.34,
      created_at: day(28),
    },
    {
      address:    "0xe5f67890123456789012345678901efabcdef01",
      name:       "Pariacaca",
      symbol:     "PRC",
      image:      "",
      price:      0.0234,
      supply:     614_500,
      volume_24h: 1_124.07,
      created_at: day(21),
    },
    {
      address:    "0xf67890123456789012345678901fabcdef0123",
      name:       "Pachamama",
      symbol:     "PCH",
      image:      "",
      price:      0.0185,
      supply:     842_100,
      volume_24h: 920.46,
      created_at: day(19),
    },
    {
      address:    "0x67890123456789012345678901abcdef012345",
      name:       "Yacumama",
      symbol:     "YCM",
      image:      "",
      price:      0.0058,
      supply:     1_460_300,
      volume_24h: 581.22,
      created_at: day(14),
    },
    {
      address:    "0x7890123456789012345678901bcdef01234567",
      name:       "Guardián del Agua",
      symbol:     "GUA",
      image:      "",
      price:      0.0042,
      supply:     1_250_400,
      volume_24h: 1_281.94,
      created_at: day(9),
    },
    {
      address:    "0x890123456789012345678901cdef0123456789",
      name:       "Mama Cocha",
      symbol:     "MMC",
      image:      "",
      price:      0.0066,
      supply:     1_920_000,
      volume_24h: 248.10,
      created_at: day(6),
    },
    {
      address:    "0x90123456789012345678901def012345678901",
      name:       "Tunupa",
      symbol:     "TNP",
      image:      "",
      price:      0.0012,
      supply:     4_205_000,
      volume_24h: 78.42,
      created_at: day(2),
    },
  ];
  