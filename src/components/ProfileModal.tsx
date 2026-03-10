import React, { useEffect, useState, useContext, useRef } from "react";
import { supabase } from "../supabaseClient";
import { ThemeContext } from "../lib/ThemeContext";
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";

const RECEIVER = "0xdf4a991bc05945bd0212e773adcff6ea619f4c4b";

interface ProfileModalProps {
  id: string | null;
  onClose: () => void;
  currentUserId: string | null;
  openChat?: (otherUserId: string) => void; // ← NUEVA PROP
}

interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar_url: string;
  tier: "free" | "basic" | "premium" | "premium+";
  bio: string;
  created_at: string;
  birthdate: string;
  city: string;
  country: string;
  posts_count: number;
  followers_count: number;
  following_count: number;
  profile_visible: boolean;
}

const emptyProfile: UserProfile = {
  id: "",
  name: "",
  username: "",
  avatar_url: "",
  tier: "free",
  bio: "",
  created_at: "",
  birthdate: "",
  city: "",
  country: "",
  posts_count: 0,
  followers_count: 0,
  following_count: 0,
  profile_visible: true,
};

const ProfileModal: React.FC<ProfileModalProps> = ({ id, onClose, currentUserId, openChat }) => {
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [bioLength, setBioLength] = useState(0);

  const { theme } = useContext(ThemeContext);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- FIX: Loader si no hay ID ---
  if (!id && loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <p className="text-white">Cargando perfil...</p>
      </div>
    );
  }

  // --- Cargar perfil ---
  useEffect(() => {
    if (!id) return setLoading(false);

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        if (error) throw error;

        // --- FIX: fallback seguro ---
        setProfile({
          ...emptyProfile,
          ...data,
          username: data?.username || `@${id.slice(0, 10)}`,
          bio: data?.bio || "",
          name: data?.name || "",
          birthdate: data?.birthdate || "",
          city: data?.city || "",
          country: data?.country || "",
        });

        setBioLength(data?.bio?.length || 0);
      } catch (err: any) {
        setToast({ message: err.message, type: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  // --- Guardar cambios ---
  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: profile.name,
          bio: profile.bio,
          birthdate: profile.birthdate,
          city: profile.city,
          country: profile.country,
          profile_visible: profile.profile_visible,
        })
        .eq("id", id);
      if (error) throw error;
      setToast({ message: "Perfil guardado", type: "success" });
    } catch (err: any) {
      setToast({ message: "Error guardando perfil", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // --- Subir avatar ---
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploadingAvatar(true);
    try {
      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(`${id}/${file.name}`, file);
      if (error) throw error;

      const { data: publicURLData } = supabase.storage
        .from("avatars")
        .getPublicUrl(data.path);
      const publicUrl = publicURLData.publicUrl;

      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", id);
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // --- Toggle visibilidad ---
  const toggleProfileVisibility = () => {
    setProfile(prev => ({ ...prev, profile_visible: !prev.profile_visible }));
  };

  // --- Abrir Chat Exclusivo para Creadores de Tokens ---
  const handlePremiumChat = async () => {
    if (!currentUserId) {
      setToast({ message: "No se encontró tu ID", type: "error" });
      return;
    }

    if (profile.tier === "premium" || profile.tier === "premium+") {
      window.location.href = "/chat/premium";
      return;
    }

    try {
      if (!MiniKit.isInstalled()) throw new Error("MiniKit no detectado dentro de World App");

      const payRes = await MiniKit.commandsAsync.pay({
        reference: "premium-chat-" + Date.now(),
        to: RECEIVER,
        tokens: [{ symbol: Tokens.WLD, token_amount: tokenToDecimals(5, Tokens.WLD).toString() }],
        description: "Suscripción Chat Exclusivo Creadores Tokens",
      });

      if (payRes?.finalPayload?.status !== "success") {
        throw new Error(pay
