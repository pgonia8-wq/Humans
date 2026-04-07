import crypto from "node:crypto";
import { supabase, cors } from "./_supabase.mjs";
import { requireOrb } from "./_orbGuard.mjs";

const AIRDROP_PRICE_WLD = 25;
const AIRDROP_POOL = 2500000;
const MAX_LINKS = 5;
const APP_URL = "https://h-token.vercel.app";

  async function generateUniqueCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (let attempt = 0; attempt < 5; attempt++) {
      let code = "";
      const bytes = crypto.randomBytes(8);
      for (let i = 0; i < 8; i++) code += chars[bytes[i] % chars.length];
      const { data } = await supabase
        .from("airdrop_links")
        .select("id")
        .eq("code", code)
        .maybeSingle();
      if (!data) return code;
    }
    throw new Error("Failed to generate unique airdrop code after 5 attempts");
  }

export default async function handler(req, res) {
    cors(res);
    if (req.method === "OPTIONS") return res.status(200).end();

    /* ── GET: list creator's airdrop pools & links ── */
    if (req.method === "GET") {
      const { creator } = req.query;
      if (!creator) return res.status(400).json({ error: "creator param required" });

      try {
        const { data: pools } = await supabase
          .from("airdrop_pools")
          .select("*")
          .eq("creator_id", creator)
          .order("created_at", { ascending: false });

        const poolIds = (pools ?? []).map(p => p.id);
        let links = [];
        if (poolIds.length > 0) {
          const { data } = await supabase
            .from("airdrop_links")
            .select("*")
            .in("pool_id", poolIds)
            .order("created_at", { ascending: false });
          links = (data ?? []).map(r => ({
            id: r.id,
            poolId: r.pool_id,
            tokenId: r.token_id,
            tokenSymbol: r.token_symbol,
            code: r.code,
            amount: r.amount,
            claimedAmount: r.claimed_amount ?? 0,
            remaining: r.amount - (r.claimed_amount ?? 0),
            mode: r.mode,
            isActive: r.is_active,
            claims: r.claims ?? 0,
            createdAt: r.created_at,
            link: APP_URL + "/claim/" + r.code,
          }));
        }

        const mappedPools = (pools ?? []).map(p => ({
          id: p.id,
          tokenId: p.token_id,
          tokenSymbol: p.token_symbol,
          totalPool: p.total_pool,
          allocated: p.allocated ?? 0,
          available: p.total_pool - (p.allocated ?? 0),
          linkCount: links.filter(l => l.poolId === p.id).length,
          maxLinks: MAX_LINKS,
          createdAt: p.created_at,
        }));

        return res.status(200).json({ pools: mappedPools, links, total: links.length });
      } catch (err) {
        console.error("[GET /api/airdropLinks]", err.message);
        return res.status(500).json({ error: err.message });
      }
    }

    /* ── POST: buy pool OR create link ── */
    if (req.method === "POST") {
      const { action, tokenId, creatorId, transactionId, poolId, amount, mode } = req.body ?? {};

      if (!creatorId) return res.status(400).json({ error: "creatorId required" });

      const orbOk = await requireOrb(creatorId, res);
      if (!orbOk) return;

      /* ── BUY: purchase airdrop pool (once per token) ── */
      if (action === "buy_pool") {
        if (!tokenId || !transactionId) return res.status(400).json({ error: "tokenId and transactionId required" });

        try {
          const { data: token, error: tErr } = await supabase
            .from("tokens")
            .select("id, symbol, name, creator_id")
            .eq("id", tokenId)
            .single();
          if (tErr || !token) return res.status(404).json({ error: "Token not found" });
          if (token.creator_id !== creatorId) return res.status(403).json({ error: "Only creator can buy airdrops" });

          const { data: existing } = await supabase
            .from("airdrop_pools")
            .select("id")
            .eq("token_id", tokenId)
            .eq("creator_id", creatorId)
            .limit(1);

          if (existing && existing.length > 0) {
            return res.status(409).json({ error: "Airdrop already purchased for this token. Only one purchase per token allowed." });
          }

          const pool = {
            id: "pool_" + crypto.randomUUID().replace(/-/g, "").slice(0, 12),
            token_id: tokenId,
            token_symbol: token.symbol,
            token_name: token.name,
            creator_id: creatorId,
            total_pool: AIRDROP_POOL,
            allocated: 0,
            transaction_id: transactionId,
            created_at: new Date().toISOString(),
          };

          const { data: inserted, error: iErr } = await supabase
            .from("airdrop_pools")
            .insert(pool)
            .select()
            .single();
          if (iErr) throw iErr;

          const { data: profile } = await supabase.from("profiles").select("username").eq("id", creatorId).maybeSingle();
          await supabase.from("token_activity").insert({
            type: "airdrop_buy",
            user_id: creatorId,
            username: profile?.username ?? "anon",
            token_id: tokenId,
            token_symbol: token.symbol,
            amount: AIRDROP_POOL,
            price: AIRDROP_PRICE_WLD,
            total: AIRDROP_PRICE_WLD,
            timestamp: new Date().toISOString(),
          });

          return res.status(201).json({
            success: true,
            poolId: inserted.id,
            totalPool: AIRDROP_POOL,
            message: "Airdrop pool purchased: " + AIRDROP_POOL.toLocaleString() + " " + token.symbol,
          });
        } catch (err) {
          console.error("[POST buy_pool]", err.message);
          return res.status(500).json({ error: err.message });
        }
      }

      /* ── CREATE_LINK: create a distribution link from pool ── */
      if (action === "create_link") {
        if (!poolId || !amount || !mode) return res.status(400).json({ error: "poolId, amount, mode required" });
        if (!["permanent", "one_time"].includes(mode)) return res.status(400).json({ error: "mode must be permanent or one_time" });
        const numAmount = parseInt(amount);
        if (!numAmount || numAmount <= 0) return res.status(400).json({ error: "amount must be positive" });

        try {
          const { data: pool, error: pErr } = await supabase
            .from("airdrop_pools")
            .select("*")
            .eq("id", poolId)
            .single();
          if (pErr || !pool) return res.status(404).json({ error: "Pool not found" });
          if (pool.creator_id !== creatorId) return res.status(403).json({ error: "Not your pool" });

          const available = pool.total_pool - (pool.allocated ?? 0);
          if (numAmount > available) return res.status(400).json({ error: "Not enough tokens in pool. Available: " + available.toLocaleString() });

          const { data: existingLinks } = await supabase
            .from("airdrop_links")
            .select("id")
            .eq("pool_id", poolId);
          if (existingLinks && existingLinks.length >= MAX_LINKS) {
            return res.status(400).json({ error: "Max " + MAX_LINKS + " links per pool. Delete one to create a new one." });
          }

          const code = await generateUniqueCode();
          const newLink = {
            id: "adl_" + crypto.randomUUID().replace(/-/g, "").slice(0, 12),
            pool_id: poolId,
            token_id: pool.token_id,
            token_symbol: pool.token_symbol,
            code,
            amount: numAmount,
            claimed_amount: 0,
            mode,
            is_active: true,
            claims: 0,
            creator_id: creatorId,
            created_at: new Date().toISOString(),
          };

          const { error: iErr } = await supabase.from("airdrop_links").insert(newLink);
          if (iErr) throw iErr;

          await supabase.from("airdrop_pools").update({ allocated: (pool.allocated ?? 0) + numAmount }).eq("id", poolId);

          return res.status(201).json({
            success: true,
            linkId: newLink.id,
            code,
            link: APP_URL + "/claim/" + code,
            amount: numAmount,
            message: "Link created: " + numAmount.toLocaleString() + " " + pool.token_symbol,
          });
        } catch (err) {
          console.error("[POST create_link]", err.message);
          return res.status(500).json({ error: err.message });
        }
      }

      return res.status(400).json({ error: "Unknown action. Use buy_pool or create_link" });
    }

    /* ── DELETE: remove a link, return tokens to pool ── */
    if (req.method === "DELETE") {
      const { linkId, creatorId: cId } = req.body ?? {};
      if (!linkId || !cId) return res.status(400).json({ error: "linkId and creatorId required" });

      try {
        const { data: link, error: lErr } = await supabase
          .from("airdrop_links")
          .select("*")
          .eq("id", linkId)
          .single();
        if (lErr || !link) return res.status(404).json({ error: "Link not found" });
        if (link.creator_id !== cId) return res.status(403).json({ error: "Not your link" });

        const unclaimed = link.amount - (link.claimed_amount ?? 0);

        await supabase.from("airdrop_links").delete().eq("id", linkId);

        if (unclaimed > 0) {
          const { data: pool } = await supabase.from("airdrop_pools").select("allocated").eq("id", link.pool_id).single();
          if (pool) {
            await supabase.from("airdrop_pools").update({
              allocated: Math.max(0, (pool.allocated ?? 0) - unclaimed),
            }).eq("id", link.pool_id);
          }
        }

        return res.status(200).json({
          success: true,
          returned: unclaimed,
          message: "Link deleted. " + unclaimed.toLocaleString() + " tokens returned to pool.",
        });
      } catch (err) {
        console.error("[DELETE /api/airdropLinks]", err.message);
        return res.status(500).json({ error: err.message });
      }
    }

    return res.status(405).json({ error: "Method not allowed" });
  }
  