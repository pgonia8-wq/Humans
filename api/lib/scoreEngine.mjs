// =========================
// CONFIG
// =========================

const MAX_SCORE = 10000;

const WEIGHTS = {
  social: 1.0,
  economic: 1.2,
  risk: 1.5,
};

// =========================
// UTILIDADES
// =========================

function logScale(x) {
  return Math.log10(1 + x);
}

function sqrtScale(x) {
  return Math.sqrt(x);
}

function clamp(x) {
  if (x < 0) return 0;
  if (x > MAX_SCORE) return MAX_SCORE;
  return x;
}

// =========================
// SUB-SCORES
// =========================

// 🟢 CONFIANZA (calidad humana)
function trustScore(user) {
  let score = 0;

  score += logScale(user.posts || 0) * 40;
  score += logScale(user.likesReceived || 0) * 3;
  score += logScale(user.comments || 0) * 6;

  score -= (user.reports || 0) * 80;
  score -= (user.blocks || 0) * 40;

  if (user.banned) score -= 500;

  return clamp(score);
}

// 🔵 INFLUENCIA (alcance)
function influenceScore(user) {
  let score = 0;

  score += logScale(user.followers || 0) * 10;
  score += logScale(user.reposts || 0) * 8;
  score += logScale(user.views || 0) * 2;

  return clamp(score);
}

// 🔴 RIESGO (comportamiento financiero)
function riskScore(user) {
  let risk = 0;

  risk += sqrtScale(user.tokenSells || 0) * 10;
  risk -= sqrtScale(user.tokenBuys || 0) * 5;
  risk -= sqrtScale(user.holdingTime || 0) * 3;

  // volatilidad
  if (user.volatility > 0.7) {
    risk += 200;
  }

  return clamp(risk);
}

// =========================
// SCORE FINAL
// =========================

export function calculateScore(user) {

  const trust = trustScore(user);
  const influence = influenceScore(user);
  const risk = riskScore(user);

  // 🧠 fórmula híbrida
  let score =
    trust * WEIGHTS.social +
    influence * WEIGHTS.economic -
    risk * WEIGHTS.risk;

  // penalización si riesgo alto
  if (risk > 300) {
    score *= 0.8;
  }

  return clamp(Math.floor(score));
}

// =========================
// EXPORT EXTRA (MUY IMPORTANTE)
// =========================

export function calculateBreakdown(user) {
  return {
    trust: trustScore(user),
    influence: influenceScore(user),
    risk: riskScore(user),
  };
}
