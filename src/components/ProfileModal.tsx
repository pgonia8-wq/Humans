import React, { useEffect, useState, useContext, useRef } from "react";
import { supabase } from "../supabaseClient";
import { ThemeContext } from "../lib/ThemeContext";
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";

const RECEIVER = "0xdf4a991bc05945bd0212e773adcff6ea619f4c4b";

interface ProfileModalProps {
  id: string | null;
  onClose: () => void;
  currentUserId: string | null;
  showUpgradeButton?: boolean;
  onOpenChat?: (otherUserId: string) => void;
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

const ProfileModal: React.FC<ProfileModalProps> = ({
  id,
  onClose,
  currentUserId,
  showUpgradeButton,
  onOpenChat,
}) => {
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [bioLength, setBioLength] = useState(0);
  const [editMode, setEditMode] = useState(false);

  const { theme } = useContext(ThemeContext);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;

        const updatedProfile = {
          ...emptyProfile,
          ...data,
          username: data?.username || `@${id.slice(0, 10)}`,
        };

        setProfile(updatedProfile);
        setBioLength(updatedProfile.bio.length || 0);
      } catch (err: any) {
        setToast({ message: err.message, type: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  const refreshProfile = async () => {
    if (!id) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
    if (data) {
      setProfile({
        ...emptyProfile,
        ...data,
        username: data.username || `@${id.slice(0, 10)}`,
      });
    }
  };

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

      await refreshProfile();
      setToast({ message: "✅ Perfil guardado correctamente", type: "success" });
      setEditMode(false);
    } catch (err: any) {
      setToast({ message: "❌ Error al guardar: " + err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setUploadingAvatar(true);

    try {
      const previewUrl = URL.createObjectURL(file);
      setProfile(prev => ({ ...prev, avatar_url: previewUrl }));

      const img = document.createElement("img");
      img.src = previewUrl;
      await new Promise(resolve => { img.onload = resolve; });

      const canvas = document.createElement("canvas");
      const MAX = 512;
      let { width, height } = img;
      if (width > height) {
        if (width > MAX) { height *= MAX / width; width = MAX; }
      } else {
        if (height > MAX) { width *= MAX / height; height = MAX; }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);

      const compressedBlob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, "image/jpeg", 0.8)
      );

      if (!compressedBlob) throw new Error("Error comprimiendo");

      const fileName = `${id}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, compressedBlob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const avatarUrl = data.publicUrl;

      await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", id);

      setProfile(prev => ({ ...prev, avatar_url: avatarUrl }));

      window.dispatchEvent(
        new CustomEvent("avatarUpdated", {
          detail: { userId: id, avatarUrl }
        })
      );

      setToast({ message: "✅ Avatar actualizado", type: "success" });
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const toggleProfileVisibility = () => {
    setProfile(prev => ({ ...prev, profile_visible: !prev.profile_visible }));
  };

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
      if (!MiniKit.isInstalled()) throw new Error("MiniKit no detectado");

      const payRes = await MiniKit.commandsAsync.pay({
        reference: "premium-chat-" + Date.now(),
        to: RECEIVER,
        tokens: [{ symbol: Tokens.WLD, token_amount: tokenToDecimals(5, Tokens.WLD).toString() }],
        description: "Suscripción Chat Exclusivo",
      });

      if (payRes?.finalPayload?.status !== "success") {
        throw new Error("Pago cancelado");
      }

      await fetch("/api/subscribePremiumChat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, transactionId: payRes.finalPayload.transaction_id }),
      });

      alert("¡Suscripción exitosa!");
      window.location.href = "/chat/premium";
    } catch (err: any) {
      setToast({ message: err.message || "Error en pago", type: "error" });
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-2 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-2xl p-6 w-full max-w-lg border border-white/10 space-y-4 relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Botón cerrar X */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl"
          aria-label="Cerrar modal"
        >
          ×
        </button>

        {loading ? (
          <p className="text-white text-center py-8">Cargando perfil...</p>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Tu Perfil</h2>
              <span className={`px-3 py-1 text-xs rounded-full ${profile.tier === "premium+" ? "bg-yellow-500 text-black" : profile.tier === "premium" ? "bg-purple-600 text-white" : "bg-gray-600 text-white"}`}>
                {profile.tier.toUpperCase()}
              </span>
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-800 border-4 border-purple-600">
                {uploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                  </div>
                )}

                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl text-white">
                    {profile.username?.[1]?.toUpperCase() || "A"}
                  </div>
                )}
              </div>

              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="px-4 py-2 bg-gray-700 text-white rounded-full text-sm hover:bg-gray-600 transition disabled:opacity-50"
              >
                {uploadingAvatar ? "Subiendo..." : "Cambiar avatar"}
              </button>
            </div>

            {/* Campos editables */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre de usuario</label>
                <input
                  type="text"
                  value={profile.username}
                  disabled
                  className="w-full bg-gray-800 p-3 rounded text-white cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Nombre</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={e => setProfile(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-gray-800 p-3 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Biografía ({bioLength}/160)</label>
                <textarea
                  value={profile.bio}
                  onChange={e => {
                    if (e.target.value.length <= 160) {
                      setProfile(prev => ({ ...prev, bio: e.target.value }));
                      setBioLength(e.target.value.length);
                    }
                  }}
                  className="w-full bg-gray-800 p-3 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none h-24"
                  placeholder="Cuéntanos sobre ti..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Fecha de nacimiento</label>
                  <input
                    type="date"
                    value={profile.birthdate}
                    onChange={e => setProfile(prev => ({ ...prev, birthdate: e.target.value }))}
                    className="w-full bg-gray-800 p-3 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Ciudad</label>
                  <input
                    type="text"
                    value={profile.city}
                    onChange={e => setProfile(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full bg-gray-800 p-3 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Tu ciudad"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">País</label>
                  <input
                    type="text"
                    value={profile.country}
                    onChange={e => setProfile(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full bg-gray-800 p-3 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Tu país"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-400">Perfil visible</label>
                <input
                  type="checkbox"
                  checked={profile.profile_visible}
                  onChange={toggleProfileVisibility}
                  className="w-5 h-5 accent-purple-600"
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 bg-green-600 text-white rounded-full disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>

              <button
                onClick={onClose}
                className="flex-1 py-3 bg-red-600 text-white rounded-full"
              >
                Cancelar
              </button>
            </div>

            {/* Botón Cerrar adicional */}
            {!saving && (
              <button
                onClick={onClose}
                className="mt-4 w-full py-3 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition"
              >
                Cerrar
              </button>
            )}

            {/* Upgrade Premium Chat */}
            {showUpgradeButton && (
              <button
                onClick={handlePremiumChat}
                className="w-full py-3 bg-purple-600 text-white rounded-full mt-4 hover:bg-purple-700 transition"
              >
                Suscribirse a Chat Premium (5 WLD)
              </button>
            )}

            {/* Chat Exclusivo Creadores de Tokens */}
            <button
              onClick={() => window.location.href = "/chat/tokens"}
              className="w-full py-3 bg-indigo-600 text-white rounded-full mt-4 hover:bg-indigo-700 transition"
            >
              Chat Exclusivo Creadores de Tokens
            </button>

          </>
        )}

        {toast && (
          <p className={`text-center py-2 rounded mt-4 ${
            toast.type === "success" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
          }`}>
            {toast.message}
          </p>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
