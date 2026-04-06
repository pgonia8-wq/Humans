#!/bin/bash
# ============================================
# deploy.sh — Token Mini-App Deploy Script
# H App Social Human — Bonding Curve Platform
# ============================================
# Ejecutar desde la carpeta token/:
#   chmod +x deploy.sh && ./deploy.sh
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}=========================================="
echo " H TOKEN MINI-APP — Deploy Script v2"
echo " Bonding Curve b=1.72e-20"
echo -e "==========================================${NC}"
echo ""

# ─── Check node/npm ───
if ! command -v node &> /dev/null; then
  echo -e "${RED}[ERROR] Node.js not found. Install it first.${NC}"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo -e "${RED}[ERROR] npm not found. Install it first.${NC}"
  exit 1
fi

echo -e "${GREEN}[✓]${NC} Node $(node -v) / npm $(npm -v)"

# ─── Check required files ───
REQUIRED_FILES=(
  "package.json"
  "vite.config.ts"
  "vercel.json"
  "index.html"
  "App.tsx"
  "api/_supabase.mjs"
  "api/_curve.mjs"
  "api/_orbGuard.mjs"
  "api/tokens.mjs"
  "api/tokens/[id]/buy.mjs"
  "api/tokens/[id]/sell.mjs"
  "api/tokens/[id]/graduate.mjs"
  "sql/schema.sql"
  "config/bondingCurve.ts"
  "lib/bondingCurve.ts"
)

MISSING=0
for f in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo -e "${RED}[✗] Missing: $f${NC}"
    MISSING=$((MISSING + 1))
  fi
done

if [ "$MISSING" -gt 0 ]; then
  echo ""
  echo -e "${RED}[ERROR] $MISSING required files missing. Fix before deploying.${NC}"
  exit 1
fi

echo -e "${GREEN}[✓]${NC} All critical files present"

# ─── Install dependencies ───
echo ""
echo -e "${YELLOW}[1/4] Installing dependencies...${NC}"
npm install --silent 2>&1 | tail -3
echo -e "${GREEN}[✓]${NC} Dependencies installed"

# ─── Build ───
echo ""
echo -e "${YELLOW}[2/4] Building for production...${NC}"
npx vite build 2>&1 | tail -5

if [ ! -d "dist" ]; then
  echo -e "${RED}[ERROR] Build failed — dist/ not created${NC}"
  exit 1
fi

echo -e "${GREEN}[✓]${NC} Build complete → dist/"

# ─── Check env vars ───
echo ""
echo -e "${YELLOW}[3/4] Checking environment variables...${NC}"

ENV_VARS=(
  "SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "WORLDCOIN_API_KEY"
  "WORLDCOIN_APP_ID"
  "VITE_PAYMENT_RECEIVER"
  "VITE_TOKEN_API_BASE"
)

ENV_MISSING=0
for var in "${ENV_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "  ${YELLOW}⚠ $var${NC} — not set (set in Vercel Dashboard)"
    ENV_MISSING=$((ENV_MISSING + 1))
  else
    echo -e "  ${GREEN}✓ $var${NC} — set"
  fi
done

if [ "$ENV_MISSING" -gt 0 ]; then
  echo ""
  echo -e "${YELLOW}[!] $ENV_MISSING env vars not set locally."
  echo -e "    Set them in Vercel Dashboard → Settings → Environment Variables${NC}"
fi

# ─── Deploy ───
echo ""
echo -e "${YELLOW}[4/4] Deploying to Vercel...${NC}"

if command -v vercel &> /dev/null; then
  echo ""
  echo -e "${CYAN}Ready to deploy. Run:${NC}"
  echo ""
  echo "  vercel --prod"
  echo ""
else
  echo ""
  echo -e "${YELLOW}Vercel CLI not installed. Install with:${NC}"
  echo "  npm i -g vercel"
  echo ""
  echo -e "${CYAN}Then deploy:${NC}"
  echo "  vercel --prod"
  echo ""
fi

echo -e "${CYAN}=========================================="
echo " REQUIRED VERCEL ENV VARS:"
echo "==========================================${NC}"
echo "  SUPABASE_URL              = https://xxx.supabase.co"
echo "  SUPABASE_SERVICE_ROLE_KEY = service_role key"
echo "  WORLDCOIN_API_KEY         = from Developer Portal"
echo "  WORLDCOIN_APP_ID          = app_6a98c88249208506dcd4e04b529111fc"
echo "  VITE_PAYMENT_RECEIVER     = treasury wallet (World Chain)"
echo "  VITE_TOKEN_API_BASE       = https://your-app.vercel.app/api"
echo ""
echo -e "${CYAN}=========================================="
echo " SQL SCHEMA:"
echo "==========================================${NC}"
echo "  Run sql/schema.sql in Supabase Dashboard"
echo "  → SQL Editor → New Query → Paste → Execute"
echo ""
echo -e "${GREEN}✅ Ready!${NC}"
