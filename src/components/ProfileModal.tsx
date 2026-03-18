import React, { useEffect, useState, useContext, useRef } from "react";
import { supabase } from "../supabaseClient";
import { ThemeContext } from "../lib/ThemeContext";
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";
import { useLanguage } from '../LanguageContext';

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
  const { t } = useLanguage();
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [bioLength, setBioLength] = useState(0);
  const [editMode, setEditMode] = useState(false);

  const { theme, username: globalUsername } = useContext(ThemeContext);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOwnProfile = !!currentUserId;   // Si estás logueado → mostramos el lápiz
  // Estados para avatar
const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [uploadingAvatar, setUploadingAvatar] = useState(false);

// Handler para seleccionar imagen del teléfono
const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (file) {
    setSelectedFile(file);
    setPreviewAvatar(URL.createObjectURL(file));
  }
};

// Handler para subir avatar a Supabase Storage y actualizar perfil
const handleUploadAvatar = async () => {
  if (!selectedFile || !currentUserId || !isOwnProfile) return;

  setUploadingAvatar(true);

  try {
    const fileExt = selectedFile.name.split(".").pop() || "jpg";
    const fileName = `${currentUserId}-${Date.now()}.${fileExt}`;

    // --- Crear imagen para canvas ---
const img = document.createElement("img");
img.src = URL.createObjectURL(selectedFile);
await new Promise((resolve, reject) => {
  img.onload = resolve;
  img.onerror = reject;
});

// --- Redimensionar ---
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

// --- Convertir a Blob comprimido ---
const compressedBlob: Blob = await new Promise((resolve, reject) => {
  canvas.toBlob(blob => {
    if (blob) resolve(blob);
    else reject(new Error("Error comprimiendo imagen"));
  }, "image/jpeg", 0.8);
});

// --- Subir a Supabase ---
const { error: uploadError } = await supabase.storage
  .from("avatars")
  .upload(fileName, compressedBlob, { upsert: true });
if (uploadError) throw uploadError;
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
    const publicUrl = data.publicUrl;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", currentUserId);

    if (updateError) throw updateError;

    setProfile((prev: any) => ({ ...prev, avatar_url: publicUrl }));
                 
    
    setPreviewAvatar(null);
    setSelectedFile(null);
       
    setToast({ message: t("avatar_subido_exito"), type: "success" });
  } catch (err: any) {
    console.error("[ProfileModal] Error subiendo avatar:", err);
    setToast({ message: err.message || t("error_subir_avatar"), type: "error" });
  } finally {
    setUploadingAvatar(false);
  }
};
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

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
          username: data?.username || globalUsername || `@${id.slice(0, 10)}`,
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
  }, [id, globalUsername]);

  const refreshProfile = async () => {
    if (!id) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
    if (data) {
      setProfile({
        ...emptyProfile,
        ...data,
        username: data.username || globalUsername || `@${id.slice(0, 10)}`,
      });
    }
  };

  const handleSave = async () => {
  // Usamos profile.username como principal (el que se muestra en el modal y es único)
  const userIdentifier = profile.username;

  // Si por algún motivo está vacío (raro), fallback a otros valores que tengas
  // pero en tu caso profile.username debería estar siempre presente
  if (!userIdentifier) {
    setToast({ message: "No se encontró username en el perfil", type: "error" });
    return;
  }

  // Log para que veas que está usando el valor correcto (quítalo después si quieres)
  console.log("[GUARDAR DEBUG] Usando username:", userIdentifier);

  setSaving(true);

  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        name: profile.username,              // el "Nombre" editable
        bio: profile.bio,
        birthdate: profile.birthdate,
        city: profile.city,
        country: profile.country,
        profile_visible: profile.profile_visible,
      })
      
    if (error) {
      console.error("[ERROR Supabase update]:", error.message);
      throw error;
    }

    await refreshProfile();
    setToast({ message: t("perfil_guardado"), type: "success" });
    setEditMode(false);
  } catch (err: any) {
    console.error("[Catch en handleSave]:", err);
    setToast({ message: t("error_guardar") + ": " + (err.message || "desconocido"), type: "error" });
  } finally {
    setSaving(false);
  }
};

  const toggleProfileVisibility = () => {
    setProfile(prev => ({ ...prev, profile_visible: !prev.profile_visible }));
  };

  const handlePremiumChat = async () => {
    if (!currentUserId) {
      setToast({ message: t("id_no_encontrado"), type: "error" });
      return;
    }

    if (profile.tier === "premium" || profile.tier === "premium+") {
      window.location.href = "/chat/premium";
      return;
    }

    try {
      if (!MiniKit.isInstalled()) throw new Error(t("minikit_no_detectado"));

      const payRes = await MiniKit.commandsAsync.pay({
        reference: "premium-chat-" + Date.now(),
        to: RECEIVER,
        tokens: [{ symbol: Tokens.WLD, token_amount: tokenToDecimals(5, Tokens.WLD).toString() }],
        description: t("suscripcion_chat_exclusivo"),
      });

      if (payRes?.finalPayload?.status !== "success") {
        throw new Error(t("pago_cancelado"));
      }

      await fetch("/api/subscribePremiumChat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          transactionId: payRes.finalPayload.transaction_id
        }),
      });

      alert(t("suscripcion_exitosa"));
      window.location.href = "/chat/premium";
    } catch (err: any) {
      setToast({ message: err.message || t("error_pago"), type: "error" });
    }
  };

  return (
  <div
    className="fixed inset-0 bg-black/80 flex items-start justify-center z-50 px-2 overflow-y-auto pt-10"
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
        aria-label={t("cerrar_modal")}
      >
        ×
      </button>

      {loading ? (
        <p className="text-white text-center py-8">{t("cargando_perfil")}</p>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">{t("tu_perfil")}</h2>
            <span
              className={`px-3 py-1 text-xs rounded-full ${
                profile.tier === "premium+" ? "bg-yellow-500 text-black"
                : profile.tier === "premium" ? "bg-purple-600 text-white"
                : "bg-gray-600 text-white"
              }`}
            >
              {profile.tier.toUpperCase()}
            </span>
          </div>

          {/* Avatar */}
<div className="flex flex-col items-center gap-3 relative">
  <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-800 border-4 border-purple-600">
    {/* Spinner mientras sube el avatar */}
    {uploadingAvatar && (
      <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )}

    {/* Imagen del avatar */}
    <img
      src={previewAvatar || profile.avatar_url || "/default-avatar.png"}
      alt="Avatar"
      className="w-full h-full rounded-full object-cover border-4 border-purple-500 shadow-lg"
    />

    {/* Lápiz para editar avatar */}
  {isOwnProfile ? (
  <div className="absolute -bottom-5 -right-5 z-[100] bg-red-600 text-white p-5 rounded-full text-4xl shadow-2xl ring-4 ring-red-300">
    🛠️ DEBUG
    {/* Tu lápiz original sigue aquí, pero ahora con más visibilidad */}
    <label 
      className="absolute inset-0 flex items-center justify-center bg-purple-600/80 hover:bg-purple-700 rounded-full cursor-pointer"
    >
      <span className="text-5xl">✏️</span>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
        disabled={uploadingAvatar}
      />
    </label>
  </div>
) : null}
  </div>

  {/* Botones cancelar / guardar avatar (aparecen solo si hay preview) */}
  {previewAvatar && isOwnProfile && (
    <div className="flex gap-3 mt-2">
      <button
        onClick={() => {
          setPreviewAvatar(null);
          setSelectedFile(null);
        }}
        className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
      >
        {t("cancelar")}
      </button>

      <button
        onClick={handleUploadAvatar}
        disabled={uploadingAvatar}
        className={`px-4 py-2 rounded-lg font-medium ${
          uploadingAvatar
            ? "bg-gray-600 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700 text-white"
        }`}
      >
        {uploadingAvatar ? t("subiendo") : t("guardar_avatar")}
      </button>
    </div>
  )}
</div>
          {/* Campos editables */}
          <div className="space-y-4">
            {/* Nombre de usuario */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {t("nombre_usuario")}
              </label>
              <input
                type="text"
                value={globalUsername || profile.username}
                disabled
                className="w-full bg-gray-800 p-3 rounded text-white cursor-not-allowed"
              />
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {t("nombre")}
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={e =>
                  setProfile(prev => ({ ...prev, name: e.target.value }))
                }
                className="w-full bg-gray-800 p-3 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder={t("tu_nombre")}
              />
            </div>

            {/* Biografía */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                {t("biografia", { count: bioLength })}
              </label>
              <textarea
                value={profile.bio}
                onChange={e => {
                  if (e.target.value.length <= 160) {
                    setProfile(prev => ({ ...prev, bio: e.target.value }));
                    setBioLength(e.target.value.length);
                  }
                }}
                className="w-full bg-gray-800 p-3 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none h-24"
                placeholder={t("cuentanos_sobre_ti")}
              />
            </div>

            {/* Fecha, ciudad, país */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  {t("fecha_nacimiento")}
                </label>
                <input
                  type="date"
                  value={profile.birthdate}
                  onChange={e =>
                    setProfile(prev => ({ ...prev, birthdate: e.target.value }))
                  }
                  className="w-full bg-gray-800 p-3 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  {t("ciudad")}
                </label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={e =>
                    setProfile(prev => ({ ...prev, city: e.target.value }))
                  }
                  className="w-full bg-gray-800 p-3 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={t("tu_ciudad")}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  {t("pais")}
                </label>
                <input
                  type="text"
                  value={profile.country}
                  onChange={e =>
                    setProfile(prev => ({ ...prev, country: e.target.value }))
                  }
                  className="w-full bg-gray-800 p-3 rounded text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={t("tu_pais")}
                />
              </div>
            </div>

            {/* Perfil visible */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400">
                {t("perfil_visible")}
              </label>
              <input
                type="checkbox"
                checked={profile.profile_visible}
                onChange={toggleProfileVisibility}
                className="w-5 h-5 accent-purple-600"
              />
            </div>

            {/* Botones Guardar / Cancelar */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 bg-green-600 text-white rounded-full disabled:opacity-50"
              >
                {saving ? t("guardando") : t("guardar")}
              </button>

              <button
                onClick={onClose}
                className="flex-1 py-3 bg-red-600 text-white rounded-full"
              >
                {t("cancelar")}
              </button>
            </div>

            {/* Botón Cerrar adicional */}
            {!saving && (
              <button
                onClick={onClose}
                className="mt-4 w-full py-3 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition"
              >
                {t("cerrar")}
              </button>
            )}

            {/* Upgrade Premium Chat */}
            {showUpgradeButton && (
              <button
                onClick={handlePremiumChat}
                className="w-full py-3 bg-purple-600 text-white rounded-full mt-4 hover:bg-purple-700 transition"
              >
                {t("suscribirse_chat_premium", { amount: 5 })}
              </button>
            )}

            {/* Chat Exclusivo Creadores de Tokens */}
            <button
              onClick={() => (window.location.href = "/chat/tokens")}
              className="w-full py-3 bg-indigo-600 text-white rounded-full mt-4 hover:bg-indigo-700 transition"
            >
              {t("chat_exclusivo_creadores_tokens")}
            </button>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <p
          className={`text-center py-2 rounded mt-4 ${
            toast.type === "success"
              ? "bg-green-900 text-green-300"
              : "bg-red-900 text-red-300"
          }`}
        >
          {toast.message}
        </p>
      )}
    </div>
  </div>
);
};
export default ProfileModal;


  
