import React, { useEffect, useState, useContext, useRef } from "react";
import { supabase } from "../supabaseClient";
import { ThemeContext } from "../lib/ThemeContext";
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";

interface ProfileModalProps {
  onClose: () => void;
  showUpgradeButton?: boolean;
}

interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar_url: string;
  tier: "free" | "basic" | "premium" | "premium+";
  bio: string;
  birthdate: string;
  city: string;
  country: string;
}

const emptyProfile: UserProfile = {
  id: "",
  name: "",
  username: "",
  avatar_url: "",
  tier: "free",
  bio: "",
  birthdate: "",
  city: "",
  country: "",
};

const RECEIVER = "0xdf4a991bc05945bd0212e773adcff6ea619f4c4b"; // dirección de cobro

const ProfileModal: React.FC<ProfileModalProps> = ({ onClose, showUpgradeButton = true }) => {
  const { theme } = useContext(ThemeContext);

  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [bioLength, setBioLength] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [hasPremium, setHasPremium] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const userId = MiniKit?.user?.id || ""; // ID del usuario desde MiniKit

  useEffect(() => {
    if (!userId) return setLoading(false);

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        if (error) throw error;

        if (data) {
          setProfile(data);
          setBioLength(data.bio?.length || 0);
          setHasPremium(data.tier === "premium" || data.tier === "premium+");
        } else {
          setProfile({ ...emptyProfile, id: userId });
        }

        if (!data?.username) {
          setProfile((prev) => ({ ...prev, username: `@${userId.slice(0, 10)}` }));
        }
      } catch (err: any) {
        setToast({ message: err.message || "Error cargando perfil", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  const handleSave = async () => {
    if (!userId) return;
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
        })
        .eq("id", userId);
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
    if (!file || !userId) return;
    setUploadingAvatar(true);
    try {
      const { data, error } = await supabase.storage.from("avatars").upload(`${userId}/${file.name}`, file);
      if (error) throw error;

      const { data: publicURLData } = supabase.storage.from("avatars").getPublicUrl(data.path);
      const publicUrl = publicURLData.publicUrl;

      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);

      setProfile((prev) => ({ ...prev, avatar_url: publicUrl }));
    } catch (err: any) {
      setToast({ message: err.message, type: "error" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const goToPremiumChat = async () => {
    if (!userId) return;
    if (hasPremium) {
      window.location.href = "/premium-chat";
      return;
    }

    try {
      setProcessingPayment(true);
      if (!MiniKit.isInstalled()) throw new Error("MiniKit no detectado");

      const payRes = await MiniKit.commandsAsync.pay({
        reference: "premium-chat-" + Date.now(),
        to: RECEIVER,
        tokens: [
          {
            symbol: Tokens.WLD,
            token_amount: tokenToDecimals(5, Tokens.WLD).toString(), // 5 WLD con 18 decimales
          },
        ],
        description: "Suscripción mensual Chat Premium",
      });

      if (payRes?.finalPayload?.status !== "success") throw new Error("Pago cancelado");

      // Actualizamos el perfil a premium
      await supabase.from("profiles").update({ tier: "premium" }).eq("id", userId);
      setHasPremium(true);
      window.location.href = "/premium-chat";
    } catch (err: any) {
      setToast({ message: err.message || "Error al procesar pago", type: "error" });
    } finally {
      setProcessingPayment(false);
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
                <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
              </div>

              <div>
                <p className="text-white font-bold">{profile.name || "Tu nombre"}</p>
                <input value={profile.username || `@${userId.slice(0, 10)}`} disabled className="bg-transparent text-gray-400 cursor-not-allowed outline-none" />
              </div>
            </div>

            <textarea
              value={profile.bio}
              onChange={(e) => {
                if (e.target.value.length <= 160) {
                  setProfile({ ...profile, bio: e.target.value });
                  setBioLength(e.target.value.length);
                }
              }}
              className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white"
            />
            <p className="text-gray-500 text-sm text-right">{bioLength}/160</p>

            <input type="date" value={profile.birthdate} onChange={(e) => setProfile({ ...profile, birthdate: e.target.value })} className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white" />
            <input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} placeholder="Ciudad" className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white" />
            <input value={profile.country} onChange={(e) => setProfile({ ...profile, country: e.target.value })} placeholder="País" className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white" />

            <button
              onClick={goToPremiumChat}
              disabled={processingPayment}
              className="w-full py-3 bg-purple-600 text-white rounded-full font-medium"
            >
              {hasPremium ? "Acceder a Chat Exclusivo" : processingPayment ? "Procesando..." : "Suscribirse 5 WLD/mes"}
            </button>

            <div className="flex gap-3 mt-2">
              <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-green-600 text-white rounded-full">
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <button onClick={onClose} className="flex-1 py-3 bg-red-600 text-white rounded-full">
                Cancelar
              </button>
            </div>

            {toast && <p className={toast.type === "success" ? "text-green-500" : "text-red-500"}>{toast.message}</p>}
          </>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
