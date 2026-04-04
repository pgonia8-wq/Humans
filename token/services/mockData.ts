export interface Token {
  id: string;
  name: string;
  symbol: string;
  emoji: string;
  creatorId: string;
  creatorName: string;
  priceWld: number;
  priceUsdc: number;
  marketCap: number;
  holders: number;
  curvePercent: number;
  change24h: number;
  volume24h: number;
  totalSupply: number;
  circulatingSupply: number;
  lockedSupply: number;
  burnedSupply: number;
  lockDurationDays: number;
  description: string;
  createdAt: string;
  isTrending: boolean;
  tags: string[];
  buyPressure: number;
}

export interface Airdrop {
  id: string;
  tokenId: string;
  tokenName: string;
  tokenSymbol: string;
  tokenEmoji: string;
  title: string;
  description: string;
  totalAmount: number;
  claimedAmount: number;
  dailyAmount: number;
  participants: number;
  maxParticipants: number;
  endDate: string;
  isActive: boolean;
  cooldownHours: number;
  userClaimedAt?: string | null;
  userTotalClaimed?: number;
}

export interface Holding {
  tokenId: string;
  tokenName: string;
  tokenSymbol: string;
  tokenEmoji: string;
  amount: number;
  avgBuyPrice: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPercent: number;
}

export interface ActivityItem {
  id: string;
  type: "buy" | "sell" | "airdrop" | "lock" | "burn" | "create";
  userId: string;
  username: string;
  tokenId: string;
  tokenSymbol: string;
  amount: number;
  price?: number;
  total?: number;
  timestamp: string;
}

export const MOCK_TOKENS: Token[] = [
  {
    id: "tkn_nova",
    name: "Nova Protocol",
    symbol: "NOVA",
    emoji: "🌟",
    creatorId: "usr_creator1",
    creatorName: "cosmicdev.eth",
    priceWld: 0.045,
    priceUsdc: 0.134,
    marketCap: 134000,
    holders: 2847,
    curvePercent: 78,
    change24h: 42.3,
    volume24h: 89400,
    totalSupply: 1000000,
    circulatingSupply: 780000,
    lockedSupply: 150000,
    burnedSupply: 70000,
    lockDurationDays: 90,
    description: "Nova Protocol is a decentralized coordination layer built for World citizens. Stake NOVA to govern protocol upgrades, earn yield from transaction fees, and unlock exclusive creator tools.",
    createdAt: "2025-12-15",
    isTrending: true,
    tags: ["DeFi", "Governance", "Yield"],
    buyPressure: 82,
  },
  {
    id: "tkn_pulse",
    name: "PulseDAO",
    symbol: "PULSE",
    emoji: "💜",
    creatorId: "usr_creator2",
    creatorName: "pulsemaker.eth",
    priceWld: 0.012,
    priceUsdc: 0.036,
    marketCap: 36000,
    holders: 891,
    curvePercent: 34,
    change24h: 18.7,
    volume24h: 22100,
    totalSupply: 1000000,
    circulatingSupply: 340000,
    lockedSupply: 600000,
    burnedSupply: 60000,
    lockDurationDays: 180,
    description: "PulseDAO powers a community-driven music rights protocol. Token holders vote on royalty splits, greenlight artist drops, and share streaming revenue proportional to holdings.",
    createdAt: "2026-01-03",
    isTrending: true,
    tags: ["Music", "DAO", "Royalties"],
    buyPressure: 61,
  },
  {
    id: "tkn_apex",
    name: "ApexFi",
    symbol: "APEX",
    emoji: "🔺",
    creatorId: "usr_creator3",
    creatorName: "apexbuilder.eth",
    priceWld: 0.089,
    priceUsdc: 0.267,
    marketCap: 267000,
    holders: 5203,
    curvePercent: 91,
    change24h: 7.2,
    volume24h: 45600,
    totalSupply: 1000000,
    circulatingSupply: 910000,
    lockedSupply: 50000,
    burnedSupply: 40000,
    lockDurationDays: 30,
    description: "ApexFi is a yield-optimization protocol bridging real-world assets with the World ecosystem. Automated vaults maximize APY while maintaining full transparency onchain.",
    createdAt: "2025-11-01",
    isTrending: false,
    tags: ["Yield", "RWA", "Vaults"],
    buyPressure: 45,
  },
  {
    id: "tkn_flare",
    name: "Flare Network",
    symbol: "FLARE",
    emoji: "🔥",
    creatorId: "usr_creator4",
    creatorName: "flaredev.eth",
    priceWld: 0.003,
    priceUsdc: 0.009,
    marketCap: 9000,
    holders: 214,
    curvePercent: 9,
    change24h: 234.5,
    volume24h: 18900,
    totalSupply: 1000000,
    circulatingSupply: 90000,
    lockedSupply: 870000,
    burnedSupply: 40000,
    lockDurationDays: 365,
    description: "Flare is the newest token on the bonding curve — get in before everyone else discovers it. Early adopters earn 3x multiplier on governance rewards.",
    createdAt: "2026-04-01",
    isTrending: true,
    tags: ["Early", "Governance", "Hot"],
    buyPressure: 94,
  },
  {
    id: "tkn_echo",
    name: "EchoSpace",
    symbol: "ECHO",
    emoji: "🌊",
    creatorId: "usr_creator5",
    creatorName: "echolab.eth",
    priceWld: 0.021,
    priceUsdc: 0.063,
    marketCap: 63000,
    holders: 1432,
    curvePercent: 55,
    change24h: -3.1,
    volume24h: 8700,
    totalSupply: 1000000,
    circulatingSupply: 550000,
    lockedSupply: 400000,
    burnedSupply: 50000,
    lockDurationDays: 120,
    description: "EchoSpace creates immersive social spaces for World App users. ECHO holders access exclusive communities, mint digital identity badges, and co-create virtual experiences.",
    createdAt: "2025-10-22",
    isTrending: false,
    tags: ["Social", "Identity", "Metaverse"],
    buyPressure: 38,
  },
  {
    id: "tkn_drift",
    name: "DriftZone",
    symbol: "DRIFT",
    emoji: "🌀",
    creatorId: "usr_creator6",
    creatorName: "driftcreator.eth",
    priceWld: 0.007,
    priceUsdc: 0.021,
    marketCap: 21000,
    holders: 567,
    curvePercent: 21,
    change24h: 88.4,
    volume24h: 31200,
    totalSupply: 1000000,
    circulatingSupply: 210000,
    lockedSupply: 750000,
    burnedSupply: 40000,
    lockDurationDays: 60,
    description: "DriftZone is a prediction market built on World ID verified humans. No bots, no manipulation — pure human consensus on future events.",
    createdAt: "2026-02-14",
    isTrending: true,
    tags: ["Prediction", "Verified", "Markets"],
    buyPressure: 77,
  },
];

export const MOCK_AIRDROPS: Airdrop[] = [
  {
    id: "adr_nova_daily",
    tokenId: "tkn_nova",
    tokenName: "Nova Protocol",
    tokenSymbol: "NOVA",
    tokenEmoji: "🌟",
    title: "Nova Daily Airdrop",
    description: "Claim daily NOVA tokens for being an early World citizen. Hold and earn governance rights.",
    totalAmount: 500000,
    claimedAmount: 210000,
    dailyAmount: 10,
    participants: 21000,
    maxParticipants: 50000,
    endDate: "2026-06-30",
    isActive: true,
    cooldownHours: 24,
    userClaimedAt: null,
    userTotalClaimed: 0,
  },
  {
    id: "adr_flare_launch",
    tokenId: "tkn_flare",
    tokenName: "Flare Network",
    tokenSymbol: "FLARE",
    tokenEmoji: "🔥",
    title: "FLARE Launch Airdrop",
    description: "New token launch special: first 1000 claimers get 50 FLARE. Claim before it's gone!",
    totalAmount: 50000,
    claimedAmount: 41000,
    dailyAmount: 50,
    participants: 820,
    maxParticipants: 1000,
    endDate: "2026-04-15",
    isActive: true,
    cooldownHours: 48,
    userClaimedAt: null,
    userTotalClaimed: 0,
  },
  {
    id: "adr_pulse_weekly",
    tokenId: "tkn_pulse",
    tokenName: "PulseDAO",
    tokenSymbol: "PULSE",
    tokenEmoji: "💜",
    title: "PulseDAO Weekly Drop",
    description: "Weekly governance tokens for active music curators. Vote on the next artist drop.",
    totalAmount: 100000,
    claimedAmount: 34000,
    dailyAmount: 25,
    participants: 1360,
    maxParticipants: 4000,
    endDate: "2026-05-30",
    isActive: true,
    cooldownHours: 168,
    userClaimedAt: null,
    userTotalClaimed: 0,
  },
];

export const MOCK_HOLDINGS: Holding[] = [
  {
    tokenId: "tkn_nova",
    tokenName: "Nova Protocol",
    tokenSymbol: "NOVA",
    tokenEmoji: "🌟",
    amount: 320,
    avgBuyPrice: 0.08,
    currentPrice: 0.134,
    value: 42.88,
    pnl: 17.28,
    pnlPercent: 67.5,
  },
  {
    tokenId: "tkn_apex",
    tokenName: "ApexFi",
    tokenSymbol: "APEX",
    tokenEmoji: "🔺",
    amount: 50,
    avgBuyPrice: 0.25,
    currentPrice: 0.267,
    value: 13.35,
    pnl: 0.85,
    pnlPercent: 6.8,
  },
];

export const MOCK_ACTIVITY: ActivityItem[] = [
  { id: "a1", type: "buy", userId: "u1", username: "alpha.eth", tokenId: "tkn_nova", tokenSymbol: "NOVA", amount: 500, price: 0.134, total: 67, timestamp: new Date(Date.now() - 45000).toISOString() },
  { id: "a2", type: "buy", userId: "u2", username: "beta.eth", tokenId: "tkn_flare", tokenSymbol: "FLARE", amount: 2000, price: 0.009, total: 18, timestamp: new Date(Date.now() - 120000).toISOString() },
  { id: "a3", type: "sell", userId: "u3", username: "gamma.eth", tokenId: "tkn_apex", tokenSymbol: "APEX", amount: 100, price: 0.267, total: 26.7, timestamp: new Date(Date.now() - 210000).toISOString() },
  { id: "a4", type: "airdrop", userId: "u4", username: "delta.eth", tokenId: "tkn_nova", tokenSymbol: "NOVA", amount: 10, timestamp: new Date(Date.now() - 300000).toISOString() },
  { id: "a5", type: "buy", userId: "u5", username: "epsilon.eth", tokenId: "tkn_drift", tokenSymbol: "DRIFT", amount: 1000, price: 0.021, total: 21, timestamp: new Date(Date.now() - 400000).toISOString() },
];

export function getMomentumLabel(curvePercent: number): { label: string; color: string; description: string } {
  if (curvePercent < 20) return { label: "EARLY", color: "#10f090", description: "Get in before the crowd" };
  if (curvePercent < 50) return { label: "RISING", color: "#06d6f7", description: "Momentum building fast" };
  if (curvePercent < 80) return { label: "HOT", color: "#f7a606", description: "High conviction zone" };
  return { label: "LAST CHANCE", color: "#f05050", description: "Curve almost complete" };
}

export function formatNum(n: number, decimals = 2): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toFixed(decimals);
}

export function timeAgo(isoString: string): string {
  const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}
