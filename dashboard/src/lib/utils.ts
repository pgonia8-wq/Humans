export const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸", MX: "🇲🇽", ES: "🇪🇸", BR: "🇧🇷", AR: "🇦🇷",
  CO: "🇨🇴", DE: "🇩🇪", FR: "🇫🇷", GB: "🇬🇧", CA: "🇨🇦",
  JP: "🇯🇵", KR: "🇰🇷", IN: "🇮🇳", AU: "🇦🇺", IT: "🇮🇹",
  PT: "🇵🇹", NL: "🇳🇱", SE: "🇸🇪", PL: "🇵🇱", RU: "🇷🇺",
};

export function getFlag(country: string) {
  return COUNTRY_FLAGS[country?.toUpperCase()] ?? "🌍";
}

export function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}
