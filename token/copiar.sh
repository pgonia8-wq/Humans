#!/bin/bash
# ============================================
# copiar.sh — Token Mini-App (H App Social Human)
# Bonding Curve Trading Platform v2
# Deploy to Vercel from H/token/
# ============================================
# Usage:   chmod +x copiar.sh && ./copiar.sh
# Vercel:  cd token && vercel --prod
# ============================================

set -e

echo "=========================================="
echo " TOKEN MINI-APP v2 — File Manifest"
echo " Bonding Curve b=1.72e-20 | Graduation @70M"
echo "=========================================="
echo ""

FILES=(
  # ─── Config ───
  "package.json"
  "tsconfig.json"
  "vite.config.ts"
  "vercel.json"
  "index.html"
  "index.css"

  # ─── Entry / App ───
  "main.tsx"
  "App.tsx"

  # ─── Context ───
  "context/AppContext.tsx"

  # ─── Services ───
  "services/api.ts"
  "services/types.ts"

  # ─── Config + Lib ───
  "config/bondingCurve.ts"
  "lib/bondingCurve.ts"
  "lib/utils.ts"

  # ─── Hooks ───
  "hooks/useAirdrops.ts"
  "hooks/useBuy.ts"
  "hooks/use-mobile.tsx"
  "hooks/useSell.ts"
  "hooks/use-toast.ts"
  "hooks/useToken.ts"
  "hooks/useTokens.ts"
  "hooks/useUser.ts"

  # ─── Features ───
  "features/creator/CreatorDashboard.tsx"
  "features/tokens/DiscoveryPage.tsx"
  "features/tokens/TokenCard.tsx"
  "features/tokens/TokenPage.tsx"
  "features/payments/BuySellUI.tsx"
  "features/airdrops/AirdropPage.tsx"
  "features/user/UserProfile.tsx"
  "features/conversion/BuyPressureIndicator.tsx"
  "features/conversion/FOMOBanner.tsx"
  "features/conversion/LiveActivityFeed.tsx"
  "features/conversion/TokenMomentumBar.tsx"

  # ─── Components ───
  "components/BottomTabBar.tsx"
  "pages/not-found.tsx"

  # ─── UI Components (shadcn/radix) ───
  "components/ui/accordion.tsx"
  "components/ui/alert-dialog.tsx"
  "components/ui/alert.tsx"
  "components/ui/aspect-ratio.tsx"
  "components/ui/avatar.tsx"
  "components/ui/badge.tsx"
  "components/ui/breadcrumb.tsx"
  "components/ui/button-group.tsx"
  "components/ui/button.tsx"
  "components/ui/calendar.tsx"
  "components/ui/card.tsx"
  "components/ui/carousel.tsx"
  "components/ui/chart.tsx"
  "components/ui/checkbox.tsx"
  "components/ui/collapsible.tsx"
  "components/ui/command.tsx"
  "components/ui/context-menu.tsx"
  "components/ui/dialog.tsx"
  "components/ui/drawer.tsx"
  "components/ui/dropdown-menu.tsx"
  "components/ui/empty.tsx"
  "components/ui/field.tsx"
  "components/ui/form.tsx"
  "components/ui/hover-card.tsx"
  "components/ui/input-group.tsx"
  "components/ui/input-otp.tsx"
  "components/ui/input.tsx"
  "components/ui/item.tsx"
  "components/ui/kbd.tsx"
  "components/ui/label.tsx"
  "components/ui/menubar.tsx"
  "components/ui/navigation-menu.tsx"
  "components/ui/pagination.tsx"
  "components/ui/popover.tsx"
  "components/ui/progress.tsx"
  "components/ui/radio-group.tsx"
  "components/ui/resizable.tsx"
  "components/ui/scroll-area.tsx"
  "components/ui/select.tsx"
  "components/ui/separator.tsx"
  "components/ui/sheet.tsx"
  "components/ui/sidebar.tsx"
  "components/ui/Skeleton.tsx"
  "components/ui/slider.tsx"
  "components/ui/sonner.tsx"
  "components/ui/spinner.tsx"
  "components/ui/switch.tsx"
  "components/ui/table.tsx"
  "components/ui/tabs.tsx"
  "components/ui/textarea.tsx"
  "components/ui/toast.tsx"
  "components/ui/toaster.tsx"
  "components/ui/toggle-group.tsx"
  "components/ui/toggle.tsx"
  "components/ui/tooltip.tsx"

  # ─── API Routes (Vercel Serverless) ───
  "api/_supabase.mjs"
  "api/_curve.mjs"
  "api/_orbGuard.mjs"
  "api/_snapshot.mjs"
  "api/checkOrbStatus.mjs"
  "api/verifyOrb.mjs"
  "api/verifyTokenPayment.mjs"
  "api/tokens.mjs"
  "api/tokens/trending.mjs"
  "api/tokens/[id].mjs"
  "api/tokens/[id]/buy.mjs"
  "api/tokens/[id]/sell.mjs"
  "api/tokens/[id]/activity.mjs"
  "api/tokens/[id]/holders.mjs"
  "api/tokens/[id]/graduate.mjs"
  "api/tokens/[id]/priceHistory.mjs"
  "api/buy.mjs"
  "api/sell.mjs"
  "api/graduate.mjs"
  "api/airdrops.mjs"
  "api/airdrops/[id]/claim.mjs"
  "api/upload.mjs"
  "api/user.mjs"
  "api/user/profile.mjs"
  "api/user/holdings.mjs"
  "api/user/activity.mjs"

  # ─── SQL Schema ───
  "sql/schema.sql"
)

MISSING=0
for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then
    SIZE=$(wc -c < "$f" | tr -d ' ')
    LINES=$(wc -l < "$f" | tr -d ' ')
    echo "  ✅ $f  (${LINES}L, ${SIZE}B)"
  else
    echo "  ❌ MISSING: $f"
    MISSING=$((MISSING + 1))
  fi
done

echo ""
echo "=========================================="
echo " Total files: ${#FILES[@]}"
echo " Missing: $MISSING"
echo "=========================================="

if [ "$MISSING" -gt 0 ]; then
  echo ""
  echo "⚠️  Fix missing files before deploying!"
  exit 1
fi

echo ""
echo "=========================================="
echo " BONDING CURVE PARAMETERS"
echo "=========================================="
echo "  P(s) = a + b·s²"
echo "  a = 0.0000005 WLD (initial price)"
echo "  b = 1.72e-20 (calibrated)"
echo "  V(s) = a·s + b·s³/3 (integral)"
echo ""
echo "  Price at 10M supply:  0.0000022 WLD"
echo "  Price at 50M supply:  0.0000435 WLD"
echo "  Price at 70M supply:  0.0000848 WLD"
echo "  Graduation @70M:      2001.53 WLD ✓"
echo "  Buy fee: 2% → treasury"
echo "  Sell: 10% slippage + 3% fee → treasury"
echo "  Optimistic locking on circulating_supply"
echo ""
echo "=========================================="
echo " DEPLOYMENT INSTRUCTIONS"
echo "=========================================="
echo ""
echo "1. Run SQL schema on Supabase:"
echo "   → Open Supabase Dashboard → SQL Editor"
echo "   → Paste contents of sql/schema.sql"
echo "   → Execute"
echo ""
echo "2. Set Vercel environment variables:"
echo "   SUPABASE_URL              = https://xxx.supabase.co"
echo "   SUPABASE_SERVICE_ROLE_KEY = service_role key"
echo "   WORLDCOIN_API_KEY         = from Developer Portal"
echo "   WORLDCOIN_APP_ID          = app_6a98c88249208506dcd4e04b529111fc"
echo "   VITE_PAYMENT_RECEIVER     = treasury wallet (World Chain)"
echo "   VITE_TOKEN_API_BASE       = https://your-app.vercel.app/api"
echo ""
echo "3. Deploy to Vercel:"
echo "   npm install"
echo "   vercel --prod"
echo ""
echo "4. After deploy, update VITE_TOKEN_API_BASE"
echo ""
echo "✅ Ready to deploy!"
