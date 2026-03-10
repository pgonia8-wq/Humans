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
  onOpenChat?: (otherUserId: string) => void; // <<< FIX INSERTADO
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

const ProfileModal: React.FC<ProfileModalProps> = ({ id, onClose, currentUserId, onOpenChat }) => {
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [bioLength, setBioLength] = useState(0);

  const { theme } = useContext(ThemeContext);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!id && loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <p className="text-white">Cargando perfil...</p>
      </div>
    );
  }

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
      if (!MiniKit.isInstalled()) throw new Error("MiniKit no detectado dentro de World App");

      const payRes = await MiniKit.commandsAsync.pay({
        reference: "premium-chat-" + Date.now(),
        to: RECEIVER,
        tokens: [{ symbol: Tokens.WLD, token_amount: tokenToDecimals(5, Tokens.WLD).toString() }],
        description: "Suscripción Chat Exclusivo Creadores Tokens",
      });

      if (payRes?.finalPayload?.status !== "success") {
        throw new Error(payRes?.finalPayload?.description || "Pago cancelado");
      }

      const transactionId = payRes?.finalPayload?.transaction_id;

      await fetch("/api/subscribePremiumChat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, transactionId }),
      });

      alert("¡Suscripción exitosa! Abriendo chat...");
      window.location.href = "/chat/premium";
    } catch (err: any) {
      setToast({ message: err.message || "Error en el pago", type: "error" });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-2 overflow-y-auto">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-lg border border-white/10 space-y-4">
        {loading ? (
          <p>Cargando perfil...</p>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white">Tu Perfil</h2>

            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={profile.avatar_url || "/default-avatar.png"}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-purple-600 p-1 rounded-full"
                >
                  ✏️
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  className="hidden"
                  accept="image/*"
                />
              </div>

              <div>
                <p className="text-white font-bold">{profile.name || "Tu nombre"}</p>
                <input
                  value={profile.username || `@${id?.slice(0, 10)}`}
                  disabled
                  className="bg-transparent text-gray-400 cursor-not-allowed outline-none"
                />
              </div>
            </div>

            {/* Botón DM */}
            <button
              onClick={() => onOpenChat?.(profile.id)} // <<< FIX INSERTADO
              className="w-full py-3 bg-purple-600 text-white rounded-full font-medium"
            >
              Enviar Mensaje
            </button>

            <button
              onClick={handlePremiumChat}
              className="w-full py-3 bg-pink-600 text-white rounded-full font-medium"
            >
              Abrir Chat Exclusivo para Creadores de Tokens
            </button>

            <button
              onClick={toggleProfileVisibility}
              className="w-full py-2 bg-gray-700 text-white rounded-xl"
            >
              {profile.profile_visible ? "Perfil Público" : "Perfil Privado"}
            </button>

            <textarea
              value={profile.bio || ""}
              onChange={(e) => {
                if (e.target.value.length <= 160) {
                  setProfile({ ...profile, bio: e.target.value });
                  setBioLength(e.target.value.length);
                }
              }}
              className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white"
            />
            <p className="text-gray-500 text-sm text-right">{bioLength}/160</p>

            <input
              type="date"
              value={profile.birthdate || ""}
              onChange={(e) => setProfile({ ...profile, birthdate: e.target.value })}
              className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white"
            />
            <input
              value={profile.city || ""}
              onChange={(e) => setProfile({ ...profile, city: e.target.value })}
              placeholder="Ciudad"
              className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white"
            />
            <input
              value={profile.country || ""}
              onChange={(e) => setProfile({ ...profile, country: e.target.value })}
              placeholder="País"
              className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white"
            />

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 bg-green-600 text-white rounded-full"
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
          </>
        )}

        {toast && (
          <p className={toast.type === "success" ? "text-green-500" : "text-red-500"}>
            {toast.message}
          </p>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
