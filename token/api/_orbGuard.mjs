import { supabase } from "./_supabase.mjs";

export async function requireOrb(userId, res) {
  if (!userId || typeof userId !== "string") {
    res.status(401).json({ error: "userId required", orbRequired: true });
    return false;
  }

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, verified, verification_level")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[ORB_GUARD] Supabase error:", error.message);
      res.status(500).json({ error: "Could not verify ORB status" });
      return false;
    }

    if (!profile) {
      res.status(403).json({
        error: "User not found. ORB verification required.",
        orbRequired: true,
        code: "USER_NOT_FOUND",
      });
      return false;
    }

    if (!profile.verified) {
      res.status(403).json({
        error: "ORB verification required to use this feature.",
        orbRequired: true,
        code: "NOT_VERIFIED",
      });
      return false;
    }

    const level = (profile.verification_level ?? "").toLowerCase();
    if (level && level !== "orb") {
      res.status(403).json({
        error: "ORB-level verification required. Device verification is not sufficient.",
        orbRequired: true,
        code: "ORB_REQUIRED",
        currentLevel: level,
      });
      return false;
    }

    return true;
  } catch (err) {
    console.error("[ORB_GUARD] Unexpected error:", err.message);
    res.status(500).json({ error: "Internal error checking ORB status" });
    return false;
  }
}
