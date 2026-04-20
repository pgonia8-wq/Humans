import React, { useEffect, useState, useContext } from "react";
import { supabase } from "../supabaseClient";
import { ThemeContext } from "../lib/ThemeContext";
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";
import Dashboard from "../../dashboard/src/Dashboard";
import { useLanguage } from '../LanguageContext';
import { Country, State, City } from "country-state-city";

const RECEIVER = import.meta.env.VITE_PAYMENT_RECEIVER || "";

function generatePayReference(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface ProfileModalProps {
  id: string | null;
  onClose: () => void;
  currentUserId: string | null;
  showUpgradeButton?: boolean;
  onOpenChat?: (otherUserId: string) => void;
  onOpenTokenApp?: () => void;
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
  state: string;
  country: string;
  country_selected_at: string | null;
  website: string;
  location_text: string;
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
  state: "",
  country: "",
  country_selected_at: null,
  website: "",
  location_text: "",
  posts_count: 0,
  followers_count: 0,
  following_count: 0,
  profile_visible: true,
};

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const ProfileModal: React.FC<ProfileModalProps> = ({
  id,
  onClose,
  currentUserId,
  showUpgradeButton,
  onOpenChat,
  onOpenTokenApp,
}) => {
  const { t, language, setLanguage } = useLanguage();
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [bioLength, setBioLength] = useState(0);
  const [activeTab, setActiveTab] = useState<"info" | "location">("info");

  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintMessage, setComplaintMessage] = useState("");
  const [sendingComplaint, setSendingComplaint] = useState(false);

  const { theme, username: globalUsername } = useContext(ThemeContext);
  const isDark = theme === "dark";

  // isOwnProfile: true cuando id es null (propio perfil sin id explícito)
  // o cuando id coincide con currentUserId
  const isOwnProfile = !!currentUserId && (!id || id === currentUserId);

  // El id efectivo para cargar el perfil: si id es null, usar currentUserId (perfil propio)
  const profileId = id || currentUserId;

  const [showDashboard, setShowDashboard] = useState(false);

  const countries = Country.getAllCountries();
  const selectedCountryObj = countries.find(c => c.isoCode === profile.country);
  const states = profile.country ? State.getStatesOfCountry(profile.country) : [];
  const selectedStateObj = states.find(s => s.isoCode === profile.state);
  const cities = profile.country && profile.state
    ? City.getCitiesOfState(profile.country, profile.state)
    : [];

  const isCountryLocked = (): boolean => {
    if (!profile.country_selected_at) return false;
    const selected = new Date(profile.country_selected_at).getTime();
    return Date.now() - selected < ONE_YEAR_MS;
  };

  const countryLockDaysLeft = (): number => {
    if (!profile.country_selected_at) return 0;
    const selected = new Date(profile.country_selected_at).getTime();
    const ms = ONE_YEAR_MS - (Date.now() - selected);
    return Math.ceil(ms / (24 * 60 * 60 * 1000));
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showComplaintModal) setShowComplaintModal(false);
        else onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, showComplaintModal]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    // Usar profileId (id del perfil a ver, o currentUserId como fallback para perfil propio)
    if (!profileId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", profileId)
          .maybeSingle();

        if (error) throw error;

        const updatedProfile: UserProfile = {
          ...emptyProfile,
          ...data,
          username: data?.username || globalUsername || `@${profileId.slice(0, 10)}`,
        };

        setProfile(updatedProfile);
        setBioLength(updatedProfile.bio?.length || 0);
      } catch (err: any) {
        setToast({ message: err.message, type: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [profileId, globalUsername]);

  const refreshProfile = async () => {
    if (!profileId) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", profileId).maybeSingle();
    if (data) {
      setProfile({
        ...emptyProfile,
        ...data,
        username: data.username || globalUsername || `@${profileId.slice(0, 10)}`,
      });
    }
  };

  const AVATAR_ACCEPT = "image/png,image/jpeg,image/jpg,image/gif,image/webp";

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setToast({ message: t("formato_no_soportado") || "Formato no soportado. Usa PNG, JPG, JPEG, GIF o WebP.", type: "error" });
      return;
    }

    setSelectedFile(file);
    setPreviewAvatar(URL.createObjectURL(file));
  };

  const handleUploadAvatar = async () => {
    if (!selectedFile || !currentUserId || !isOwnProfile) return;
    setUploadingAvatar(true);
    try {
      const fileExt = selectedFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${currentUserId}-${Date.now()}.${fileExt}`;

      const img = document.createElement("img");
      img.src = URL.createObjectURL(selectedFile);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

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

      let uploadBlob: Blob;
      if (selectedFile.type === "image/gif") {
        uploadBlob = selectedFile;
      } else {
        uploadBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error("Error comprimiendo imagen"));
          }, "image/jpeg", 0.8);
        });
      }

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, uploadBlob, { upsert: true });
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
      setToast({ message: err.message || t("error_subir_avatar"), type: "error" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!currentUserId || !isOwnProfile) {
      setToast({ message: "No se encontró userId", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const isChangingCountry = profile.country && !isCountryLocked();
      const updatePayload: any = {
        name: profile.name,
        bio: profile.bio,
        birthdate: profile.birthdate,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        location_text: profile.location_text,
        profile_visible: profile.profile_visible,
      };

      if (isChangingCountry && profile.country) {
        updatePayload.country_selected_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", currentUserId);

      if (error) throw error;

      await refreshProfile();
      setToast({ message: t("perfil_guardado"), type: "success" });
    } catch (err: any) {
      setToast({ message: t("error_guardar") + ": " + (err.message || "desconocido"), type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleSendComplaint = async () => {
    if (!complaintMessage.trim()) return;
    setSendingComplaint(true);
    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-complaint`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${anonKey}`,
            "apikey": anonKey,
          },
          body: JSON.stringify({
            message: complaintMessage,
            userId: currentUserId,
            username: profile.username,
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al enviar");
      }

      setToast({ message: t("queja_enviada") || "Mensaje enviado correctamente", type: "success" });
      setComplaintMessage("");
      setShowComplaintModal(false);
    } catch (err: any) {
      setToast({ message: err.message || "Error al enviar mensaje", type: "error" });
    } finally {
      setSendingComplaint(false);
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
        reference: generatePayReference(),
        to: RECEIVER,
        tokens: [{ symbol: Tokens.WLD, token_amount: tokenToDecimals(5, Tokens.WLD).toString() }],
        description: t("suscripcion_chat_exclusivo"),
      });
      if (payRes?.finalPayload?.status !== "success") throw new Error(t("pago_cancelado"));
      await fetch("/api/subscribePremiumChat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          transactionId: payRes.finalPayload.transaction_id,
        }),
      });
      alert(t("suscripcion_exitosa"));
      window.location.href = "/chat/premium";
    } catch (err: any) {
      setToast({ message: err.message || t("error_pago"), type: "error" });
    }
  };

  const tierColors: Record<string, string> = {
    "premium+": "bg-yellow-500 text-black",
    "premium": "bg-purple-600 text-white",
    "basic": "bg-blue-600 text-white",
    "free": "bg-gray-600 text-white",
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-start justify-center z-50 px-2 overflow-y-auto pt-6 pb-10"
        onClick={onClose}
      >
        <div
          className={`rounded-3xl w-full max-w-lg relative overflow-hidden shadow-2xl border ${
            isDark
              ? "bg-[#111113] border-white/[0.08]"
              : "bg-white border-gray-200 shadow-2xl"
          }`}
          onClick={e => e.stopPropagation()}
        >
          {/* Cover gradient */}
          <div
            className="h-28 relative"
            style={{
              background: isDark
                ? "linear-gradient(135deg, #1e1060 0%, #2d1b69 50%, #111113 100%)"
                : "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
            }}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg transition backdrop-blur-sm"
              aria-label={t("cerrar_modal")}
            >
              ×
            </button>
            <span
              className={`absolute top-3 left-3 px-3 py-1 text-xs font-bold rounded-full ${tierColors[profile.tier] || tierColors["free"]}`}
            >
              {profile.tier.toUpperCase()}
            </span>
          </div>

          <div className="px-5 pb-0">
            <div className="flex items-end justify-between -mt-14 mb-3">
              <div className="relative">
                <div
                  className={`w-24 h-24 rounded-full border-4 overflow-hidden shadow-xl ${
                    isDark ? "border-[#111113] bg-gray-800" : "border-white bg-gray-200"
                  }`}
                >
                  {uploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 rounded-full">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500" />
                    </div>
                  )}
                  <img
                    src={previewAvatar || profile.avatar_url || "/default-avatar.png"}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                {isOwnProfile && (
                  <div className="absolute bottom-0 right-0 w-7 h-7 z-10">
                    <div className="bg-indigo-600 rounded-full w-7 h-7 flex items-center justify-center shadow-md pointer-events-none" style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
                      <span className="text-xs">✏️</span>
                    </div>
                    <input
                      type="file"
                      accept={AVATAR_ACCEPT}
                      onChange={handleAvatarChange}
                      disabled={uploadingAvatar}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {previewAvatar && isOwnProfile && (
                <div className="flex gap-2 mt-10">
                  <button
                    onClick={() => { setPreviewAvatar(null); setSelectedFile(null); }}
                    className={`px-3 py-1.5 text-sm rounded-full transition ${
                      isDark ? "bg-white/[0.07] text-gray-300 hover:bg-white/[0.12]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {t("cancelar")}
                  </button>
                  <button
                    onClick={handleUploadAvatar}
                    disabled={uploadingAvatar}
                    className="px-3 py-1.5 text-white text-sm rounded-full disabled:opacity-50 transition"
                    style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}
                  >
                    {uploadingAvatar ? t("subiendo") : t("guardar_avatar")}
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <p className={`text-center py-8 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{t("cargando_perfil")}</p>
            ) : (
              <>
                <div className="mb-1">
                  <p className={`text-lg font-bold leading-tight ${isDark ? "text-white" : "text-gray-900"}`}>@{profile.username}</p>
                  {profile.name ? <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{profile.name}</p> : null}
                </div>

                {profile.bio ? (
                  <p className={`text-sm mb-2 leading-snug ${isDark ? "text-gray-300" : "text-gray-700"}`}>{profile.bio}</p>
                ) : null}

                {(profile.city || selectedCountryObj?.name) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-4">
                    <span>📍 {[profile.city, selectedCountryObj?.name].filter(Boolean).join(", ")}</span>
                  </div>
                )}

                <div className={`flex gap-6 text-center border-y py-3 mb-5 ${isDark ? "border-white/[0.08]" : "border-gray-100"}`}>
                  <div>
                    <p className={`font-bold text-base ${isDark ? "text-white" : "text-gray-900"}`}>{profile.posts_count}</p>
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("publicaciones") || "Posts"}</p>
                  </div>
                  <div>
                    <p className={`font-bold text-base ${isDark ? "text-white" : "text-gray-900"}`}>{profile.followers_count}</p>
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("seguidores") || "Seguidores"}</p>
                  </div>
                  <div>
                    <p className={`font-bold text-base ${isDark ? "text-white" : "text-gray-900"}`}>{profile.following_count}</p>
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("siguiendo") || "Siguiendo"}</p>
                  </div>
                </div>

                {/* Si NO es perfil propio: solo lectura, sin tabs editables */}
                {!isOwnProfile ? (
                  <div className="space-y-3 pb-5">
                    {profile.name && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">{t("nombre") || "Nombre visible"}</p>
                        <p className={`text-sm px-3 py-2 rounded-xl ${isDark ? "text-white bg-white/[0.04]" : "text-gray-800 bg-gray-50"}`}>{profile.name}</p>
                      </div>
                    )}
                    {profile.bio && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">{t("biografia") || "Biografía"}</p>
                        <p className={`text-sm px-3 py-2 rounded-xl ${isDark ? "text-gray-300 bg-white/[0.04]" : "text-gray-700 bg-gray-50"}`}>{profile.bio}</p>
                      </div>
                    )}
                    {onOpenChat && currentUserId && (
                      <button
                        onClick={() => { onOpenChat(profile.id); onClose(); }}
                        className="w-full py-3 text-white rounded-2xl font-semibold text-sm transition"
                        style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}
                      >
                        {t("enviar_mensaje") || "Enviar mensaje"}
                      </button>
                    )}
                    <button
                      onClick={() => setShowComplaintModal(true)}
                      className={`w-full py-3 rounded-2xl text-sm transition flex items-center justify-center gap-2 border ${
                        isDark
                          ? "bg-white/[0.04] hover:bg-white/[0.07] border-white/[0.08] text-gray-400 hover:text-white"
                          : "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      <span>💬</span>
                      <span>{t("contacto") || "Contacto"}</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className={`flex border-b mb-5 ${isDark ? "border-white/[0.08]" : "border-gray-100"}`}>
                      <button
                        className={`flex-1 pb-2 text-sm font-medium transition ${
                          activeTab === "info"
                            ? "text-violet-400 border-b-2 border-violet-500"
                            : isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
                        }`}
                        onClick={() => setActiveTab("info")}
                      >
                        {t("informacion") || "Información"}
                      </button>
                      <button
                        className={`flex-1 pb-2 text-sm font-medium transition ${
                          activeTab === "location"
                            ? "text-violet-400 border-b-2 border-violet-500"
                            : isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"
                        }`}
                        onClick={() => setActiveTab("location")}
                      >
                        {t("ubicacion") || "Ubicación"}
                      </button>
                    </div>

                    {activeTab === "info" && (
                      <div className="space-y-4 pb-2">
                        <div>
                          <label className={`block text-xs mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("nombre") || "Nombre visible"}</label>
                          <input
                            type="text"
                            value={profile.name}
                            onChange={e => setProfile(prev => ({ ...prev, name: e.target.value }))}
                            className={`w-full p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/60 transition ${
                              isDark
                                ? "bg-white/[0.05] border border-white/[0.09] text-white placeholder-gray-600"
                                : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400"
                            }`}
                            placeholder={t("tu_nombre") || "Tu nombre"}
                          />
                        </div>

                        <div>
                          <div className="flex justify-between mb-1">
                            <label className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("biografia") || "Biografía"}</label>
                            <span className={`text-xs ${isDark ? "text-gray-600" : "text-gray-400"}`}>{bioLength}/160</span>
                          </div>
                          <textarea
                            value={profile.bio}
                            onChange={e => {
                              if (e.target.value.length <= 160) {
                                setProfile(prev => ({ ...prev, bio: e.target.value }));
                                setBioLength(e.target.value.length);
                              }
                            }}
                            className={`w-full p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/60 resize-none h-20 transition ${
                              isDark
                                ? "bg-white/[0.05] border border-white/[0.09] text-white placeholder-gray-600"
                                : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400"
                            }`}
                            placeholder={t("cuentanos_sobre_ti") || "Cuéntanos sobre ti..."}
                          />
                        </div>

                        <div>
                          <label className={`block text-xs mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("fecha_nacimiento")}</label>
                          <input
                            type="date"
                            value={profile.birthdate}
                            onChange={e => setProfile(prev => ({ ...prev, birthdate: e.target.value }))}
                            className={`w-full p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/60 transition ${
                              isDark
                                ? "bg-white/[0.05] border border-white/[0.09] text-white"
                                : "bg-gray-50 border border-gray-200 text-gray-900"
                            }`}
                          />
                        </div>

                        <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
                          isDark ? "bg-white/[0.04] border-white/[0.08]" : "bg-gray-50 border-gray-200"
                        }`}>
                          <label className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>{t("perfil_visible") || "Perfil visible"}</label>
                          <button
                            onClick={toggleProfileVisibility}
                            className={`relative w-11 h-6 rounded-full transition-colors ${profile.profile_visible ? "bg-violet-600" : isDark ? "bg-gray-700" : "bg-gray-300"}`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${profile.profile_visible ? "translate-x-5" : "translate-x-0"}`}
                            />
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === "location" && (
                      <div className="space-y-4 pb-2">
                        <div>
                          <label className={`block text-xs mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("ubicacion_texto") || "Descripción de ubicación"}</label>
                          <input
                            type="text"
                            value={profile.location_text}
                            onChange={e => setProfile(prev => ({ ...prev, location_text: e.target.value }))}
                            className={`w-full p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/60 transition ${
                              isDark
                                ? "bg-white/[0.05] border border-white/[0.09] text-white placeholder-gray-600"
                                : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400"
                            }`}
                            placeholder={t("ej_ciudad_creativa") || "ej. Ciudad de México, CDMX"}
                          />
                        </div>

                        <div>
                          <label className={`block text-xs mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("pais") || "País"}</label>
                          {isCountryLocked() ? (
                            <div className={`w-full p-3 rounded-xl text-sm flex items-center justify-between border ${
                              isDark ? "bg-white/[0.04] border-white/[0.08] text-gray-400" : "bg-gray-50 border-gray-200 text-gray-500"
                            }`}>
                              <span>{selectedCountryObj?.name || profile.country}</span>
                              <span className="text-xs text-orange-400 ml-2">
                                🔒 {countryLockDaysLeft()} {t("dias_restantes") || "días restantes"}
                              </span>
                            </div>
                          ) : (
                            <select
                              value={profile.country}
                              onChange={e => setProfile(prev => ({
                                ...prev,
                                country: e.target.value,
                                state: "",
                                city: "",
                              }))}
                              className={`w-full p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/60 appearance-none transition ${
                                isDark
                                  ? "bg-white/[0.05] border border-white/[0.09] text-white"
                                  : "bg-gray-50 border border-gray-200 text-gray-900"
                              }`}
                            >
                              <option value="">{t("seleccionar_pais") || "Seleccionar país"}</option>
                              {countries.map(c => (
                                <option key={c.isoCode} value={c.isoCode}>
                                  {c.flag} {c.name}
                                </option>
                              ))}
                            </select>
                          )}
                          {!isCountryLocked() && profile.country && (
                            <p className="text-xs text-orange-400 mt-1">
                              ⚠️ {t("aviso_pais_lock") || "Una vez guardado, no podrás cambiar el país durante 1 año."}
                            </p>
                          )}
                        </div>

                        {profile.country && states.length > 0 && (
                          <div>
                            <label className={`block text-xs mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("estado") || "Estado / Provincia"}</label>
                            <select
                              value={profile.state}
                              onChange={e => setProfile(prev => ({
                                ...prev,
                                state: e.target.value,
                                city: "",
                              }))}
                              className={`w-full p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/60 appearance-none transition ${
                                isDark
                                  ? "bg-white/[0.05] border border-white/[0.09] text-white"
                                  : "bg-gray-50 border border-gray-200 text-gray-900"
                              }`}
                            >
                              <option value="">{t("seleccionar_estado") || "Seleccionar estado"}</option>
                              {states.map(s => (
                                <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {profile.state && cities.length > 0 && (
                          <div>
                            <label className={`block text-xs mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("ciudad") || "Ciudad"}</label>
                            <select
                              value={profile.city}
                              onChange={e => setProfile(prev => ({ ...prev, city: e.target.value }))}
                              className={`w-full p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/60 appearance-none transition ${
                                isDark
                                  ? "bg-white/[0.05] border border-white/[0.09] text-white"
                                  : "bg-gray-50 border border-gray-200 text-gray-900"
                              }`}
                            >
                              <option value="">{t("seleccionar_ciudad") || "Seleccionar ciudad"}</option>
                              {cities.map(c => (
                                <option key={c.name} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDashboard(true);
                      }}
                      className="mt-4 w-full py-2 rounded-xl font-semibold text-white text-sm transition"
                      style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}
                    >
                      Creator Dashboard
                    </button>

                    <div className="space-y-3 mt-5 pb-5">
                      <div className="flex gap-3">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="flex-1 py-3 text-white rounded-2xl font-semibold text-sm disabled:opacity-50 transition"
                          style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}
                        >
                          {saving ? t("guardando") : t("guardar")}
                        </button>
                        <button
                          onClick={onClose}
                          className={`flex-1 py-3 rounded-2xl text-sm transition ${
                            isDark
                              ? "bg-white/[0.06] hover:bg-white/[0.10] text-gray-300"
                              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                          }`}
                        >
                          {t("cancelar")}
                        </button>
                      </div>

                      {showUpgradeButton && (
                        <button
                          onClick={handlePremiumChat}
                          className="w-full py-3 text-white rounded-2xl font-semibold text-sm transition"
                          style={{ background: "linear-gradient(135deg,#a855f7,#6366f1)" }}
                        >
                          {t("suscribirse_chat_premium", { amount: 5 })}
                        </button>
                      )}

                      {/* ── Idioma + Token Market ── */}
                      <div className="flex gap-3">
                        {/* Toggle de idioma */}
                        <button
                          onClick={() => setLanguage(language === "es" ? "en" : "es")}
                          className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition flex items-center justify-center gap-2 border ${
                            isDark
                              ? "bg-white/[0.04] hover:bg-white/[0.07] border-white/[0.08] text-gray-300 hover:text-white"
                              : "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
                          </svg>
                          {language === "es" ? "Español" : "English"}
                        </button>

                        {/* Token Market */}
                        {onOpenTokenApp && (
                          <button
                            onClick={() => { onOpenTokenApp(); onClose(); }}
                            className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition flex items-center justify-center gap-2 border ${
                              isDark
                                ? "bg-white/[0.04] hover:bg-white/[0.07] border-white/[0.08] text-amber-400 hover:text-amber-300"
                                : "bg-amber-50 hover:bg-amber-100 border-amber-100 text-amber-600 hover:text-amber-700"
                            }`}
                          >
                            <span className="text-base leading-none">🪙</span>
                            Tokens
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => setShowComplaintModal(true)}
                        className={`w-full py-3 rounded-2xl text-sm transition flex items-center justify-center gap-2 border ${
                          isDark
                            ? "bg-white/[0.04] hover:bg-white/[0.07] border-white/[0.08] text-gray-400 hover:text-white"
                            : "bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-500 hover:text-gray-800"
                        }`}
                      >
                        <span>💬</span>
                        <span>{t("contacto") || "Contacto"}</span>
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showComplaintModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60] px-4"
          onClick={() => setShowComplaintModal(false)}
        >
          <div
            className={`rounded-3xl p-6 w-full max-w-sm shadow-2xl border ${
              isDark ? "bg-[#111113] border-white/[0.08]" : "bg-white border-gray-200"
            }`}
            onClick={e => e.stopPropagation()}
          >
            {/* Accent top */}
            <div className="absolute inset-x-6 top-0 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg,#6366f1,#a855f7)" }} />
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-bold text-base ${isDark ? "text-white" : "text-gray-900"}`}>
                {t("quejas_sugerencias") || "Quejas y sugerencias"}
              </h3>
              <button
                onClick={() => setShowComplaintModal(false)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xl transition ${
                  isDark ? "text-gray-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                ×
              </button>
            </div>

            <p className={`text-xs mb-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {t("quejas_descripcion") || "Tu mensaje nos ayuda a mejorar. Lo revisaremos a la brevedad."}
            </p>

            <textarea
              value={complaintMessage}
              onChange={e => setComplaintMessage(e.target.value)}
              rows={5}
              className={`w-full p-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/60 resize-none mb-4 transition ${
                isDark
                  ? "bg-white/[0.05] border border-white/[0.09] text-white placeholder-gray-600"
                  : "bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400"
              }`}
              placeholder={t("escribe_tu_mensaje") || "Escribe tu mensaje aquí..."}
            />

            <button
              onClick={handleSendComplaint}
              disabled={sendingComplaint || !complaintMessage.trim()}
              className="w-full py-3 text-white rounded-2xl font-semibold text-sm disabled:opacity-50 transition"
              style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}
            >
              {sendingComplaint ? (t("enviando") || "Enviando...") : (t("enviar") || "Enviar")}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-4 pointer-events-none">
          <div
            className={`px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl border backdrop-blur-xl ${
              toast.type === "error"
                ? "bg-red-500/10 border-red-500/20 text-red-300"
                : "text-white border-white/10"
            }`}
            style={toast.type !== "error" ? { background: "linear-gradient(135deg,rgba(99,102,241,0.85),rgba(168,85,247,0.85))", boxShadow: "0 8px 32px rgba(168,85,247,0.35)" } : {}}
          >
            {toast.message}
          </div>
        </div>
      )}

      {showDashboard && (
        <div
          className="fixed inset-0 z-[9999] bg-black"
          onClick={() => setShowDashboard(false)}
        >
          <div
            className="w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Dashboard
              currentUserId={currentUserId}
              onClose={() => setShowDashboard(false)}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ProfileModal;
