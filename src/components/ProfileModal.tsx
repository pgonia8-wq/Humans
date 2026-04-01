/**
 * ProfileModal.tsx – CORREGIDO
 *
 * ESTRUCTURA: idéntica al original del repo (banner, avatar overlay, tabs, botones).
 * Solo se modifican las líneas con errores, sin tocar el diseño ni el layout.
 *
 * CORRECCIONES APLICADAS:
 * [P1] isOwnProfile: era `!!currentUserId` (siempre true si había sesión).
 *      Ahora es `currentUserId === id` para distinguir perfil propio del ajeno.
 * [P2] handleAvatarChange: accept ampliado a PNG, JPG, JPEG, GIF, WEBP, AVIF, BMP.
 *      Se añade validación de tamaño (máx 10 MB) y tipo antes de procesar.
 * [P3] handlePremiumChat: reference de pago era "premium-chat-" + Date.now()
 *      (cadena arbitraria). Worldcoin exige UUID v4 → corregido con crypto.randomUUID().
 * [P4] handlePremiumChat: MiniKit.isInstalled() verificado ANTES de llamar a pay().
 * [P5] handlePremiumChat: /api/subscribePremiumChat no se awaiteaba correctamente
 *      ni se verificaba si el servidor devolvía error → corregido con await + check.
 * [P6] handleSave: sin validación de nombre mínimo antes de guardar.
 * [P7] refreshProfile: errores de Supabase silenciados → añadido logging.
 * [P8] handleSendComplaint: fetch sin timeout → puede colgarse en WebView de World App.
 * [P9] toast: el div del toast no tenía clases de color según tipo → corregido.
 * [P10] handleUploadAvatar: GIF y otros formatos se bloqueaban por la validación de tipo.
 *       Ahora se aceptan todos los formatos de imagen comunes.
 */

import React, { useEffect, useState, useContext } from "react";
import { supabase } from "../supabaseClient";
import { ThemeContext } from "../lib/ThemeContext";
import { MiniKit, Tokens, tokenToDecimals } from "@worldcoin/minikit-js";
import Dashboard from "../../dashboard/src/Dashboard";
import { useLanguage } from '../LanguageContext';
import { Country, State, City } from "country-state-city";

const RECEIVER = "0xdf4a991bc05945bd0212e773adcff6ea619f4c4b";

// ── [P3] Genera UUID v4 válido para Worldcoin Pay ──────────────────────────
function generatePayReference(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback manual para WebView que no expone crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ── [P8] fetch con timeout para WebView de World App ──────────────────────
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  ms = 12000
): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

// ── [P2] Tipos de imagen aceptados (incluye GIF, PNG, JPG, WEBP, AVIF…) ──
const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/jpg,image/png,image/gif,image/webp,image/avif,image/bmp,image/svg+xml";
const MAX_FILE_SIZE_MB = 10;

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
}) => {
  const { t } = useLanguage();
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

  // ── [P1] CORREGIDO: solo es el propio perfil cuando id === currentUserId ──
  const isOwnProfile = !!(currentUserId && currentUserId === id);

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

        const updatedProfile: UserProfile = {
          ...emptyProfile,
          ...data,
          username: data?.username || globalUsername || `@${id.slice(0, 10)}`,
        };

        setProfile(updatedProfile);
        setBioLength(updatedProfile.bio?.length || 0);
      } catch (err: any) {
        console.error("[ProfileModal] Error cargando perfil:", err.message);
        setToast({ message: err.message, type: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id, globalUsername]);

  // ── [P7] CORREGIDO: refreshProfile con manejo de errores ──
  const refreshProfile = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (error) {
        console.error("[ProfileModal] Error en refreshProfile:", error.message);
        return;
      }
      if (data) {
        setProfile({
          ...emptyProfile,
          ...data,
          username: data.username || globalUsername || `@${id.slice(0, 10)}`,
        });
      }
    } catch (err: any) {
      console.error("[ProfileModal] Error inesperado en refreshProfile:", err.message);
    }
  };

  // ── [P2][P10] CORREGIDO: acepta PNG, JPG, GIF, WEBP, AVIF, BMP ──────────
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño (máx 10 MB)
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setToast({ message: `El archivo supera ${MAX_FILE_SIZE_MB} MB. Elige una imagen más pequeña.`, type: "error" });
      e.target.value = "";
      return;
    }

    // Validar que sea imagen (por tipo MIME)
    if (!file.type.startsWith("image/")) {
      setToast({ message: "Solo se pueden subir imágenes (PNG, JPG, GIF, WEBP…)", type: "error" });
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    setPreviewAvatar(URL.createObjectURL(file));
  };

  const handleUploadAvatar = async () => {
    if (!selectedFile || !currentUserId || !isOwnProfile) return;
    setUploadingAvatar(true);
    try {
      const fileExt = selectedFile.name.split(".").pop() || "jpg";
      const fileName = `${currentUserId}-${Date.now()}.${fileExt}`;

      // Los GIF animados NO pueden comprimirse con canvas sin perder animación.
      // Para GIF se sube el archivo original; para el resto se comprime.
      let uploadBlob: Blob = selectedFile;

      if (!selectedFile.type.includes("gif") && !selectedFile.type.includes("svg")) {
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

        const compressed: Blob = await new Promise((resolve, reject) => {
          canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error("Error comprimiendo imagen"));
          }, "image/jpeg", 0.82);
        });
        uploadBlob = compressed;
      }

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, uploadBlob, { upsert: true, contentType: selectedFile.type });

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
      setToast({ message: t("avatar_subido_exito") || "Avatar actualizado correctamente", type: "success" });
      console.log("[ProfileModal] Avatar subido:", publicUrl);
    } catch (err: any) {
      console.error("[ProfileModal] Error subiendo avatar:", err.message);
      setToast({ message: err.message || t("error_subir_avatar") || "Error al subir avatar", type: "error" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── [P6] CORREGIDO: validación de nombre antes de guardar ─────────────────
  const handleSave = async () => {
    if (!currentUserId) {
      setToast({ message: "No se encontró userId", type: "error" });
      return;
    }

    if (!profile.name || profile.name.trim().length < 1) {
      setToast({ message: t("nombre_requerido") || "El nombre no puede estar vacío", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const isChangingCountry = profile.country && !isCountryLocked();
      const updatePayload: any = {
        name: profile.name.trim(),
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
      setToast({ message: t("perfil_guardado") || "Perfil guardado", type: "success" });
      console.log("[ProfileModal] Perfil guardado para userId:", currentUserId);
    } catch (err: any) {
      console.error("[ProfileModal] Error guardando perfil:", err.message);
      setToast({ message: `${t("error_guardar") || "Error al guardar"}: ${err.message}`, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // ── [P8] CORREGIDO: fetch con timeout ────────────────────────────────────
  const handleSendComplaint = async () => {
    if (!complaintMessage.trim()) return;
    setSendingComplaint(true);
    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!anonKey) throw new Error("Configuración de Supabase no encontrada");

      const res = await fetchWithTimeout(
        "https://vtjqfzpfehfofamhowjz.supabase.co/functions/v1/send-complaint",
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
        },
        10000
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error((errData as any).error || `Error ${res.status}`);
      }

      setToast({ message: t("queja_enviada") || "Mensaje enviado correctamente", type: "success" });
      setComplaintMessage("");
      setShowComplaintModal(false);
    } catch (err: any) {
      console.error("[ProfileModal] Error enviando queja:", err.message);
      setToast({ message: err.message || "Error al enviar mensaje", type: "error" });
    } finally {
      setSendingComplaint(false);
    }
  };

  const toggleProfileVisibility = () => {
    setProfile(prev => ({ ...prev, profile_visible: !prev.profile_visible }));
  };

  // ── [P3][P4][P5] CORREGIDO: UUID v4, MiniKit.isInstalled(), await + check ─
  const handlePremiumChat = async () => {
    if (!currentUserId) {
      setToast({ message: t("id_no_encontrado") || "No se encontró userId", type: "error" });
      return;
    }

    if (profile.tier === "premium" || profile.tier === "premium+") {
      window.location.href = "/chat/premium";
      return;
    }

    try {
      // [P4] Verificar MiniKit ANTES de intentar el pago
      if (!MiniKit.isInstalled()) {
        throw new Error(t("minikit_no_detectado") || "Abre esta app desde World App");
      }

      const payRes = await MiniKit.commandsAsync.pay({
        // [P3] UUID v4 real — Worldcoin rechaza cualquier otro formato
        reference: generatePayReference(),
        to: RECEIVER,
        tokens: [{ symbol: Tokens.WLD, token_amount: tokenToDecimals(5, Tokens.WLD).toString() }],
        description: t("suscripcion_chat_exclusivo") || "Suscripción Chat Premium",
      });

      if (payRes?.finalPayload?.status !== "success") {
        console.warn("[ProfileModal] Pago cancelado:", payRes?.finalPayload?.status);
        throw new Error(t("pago_cancelado") || "Pago cancelado");
      }

      const transactionId = payRes.finalPayload.transaction_id;
      console.log("[ProfileModal] Pago recibido, verificando backend. txId:", transactionId);

      // [P5] Verificar respuesta del backend correctamente
      let subRes: Response;
      try {
        subRes = await fetchWithTimeout("/api/subscribePremiumChat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUserId, transactionId }),
        }, 12000);
      } catch (fetchErr: any) {
        throw new Error(`Error de red al verificar: ${fetchErr.message}`);
      }

      if (!subRes.ok) {
        const errData = await subRes.json().catch(() => ({}));
        throw new Error((errData as any).error || `Error del servidor: ${subRes.status}`);
      }

      console.log("[ProfileModal] Suscripción confirmada por backend");
      setToast({ message: t("suscripcion_exitosa") || "¡Suscripción activada!", type: "success" });
      setTimeout(() => { window.location.href = "/chat/premium"; }, 1200);

    } catch (err: any) {
      console.error("[ProfileModal] Error en handlePremiumChat:", err.message);
      setToast({ message: err.message || t("error_pago") || "Error en el pago", type: "error" });
    }
  };

  const tierColors: Record<string, string> = {
    "premium+": "bg-yellow-500 text-black",
    "premium": "bg-purple-600 text-white",
    "basic": "bg-blue-600 text-white",
    "free": "bg-gray-600 text-white",
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — estructura idéntica al original del repositorio
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center z-50 px-2 overflow-y-auto pt-6 pb-10"
        onClick={onClose}
      >
        <div
          className="bg-gray-950 rounded-3xl w-full max-w-lg border border-white/10 relative overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Banner header */}
          <div className="h-28 bg-gradient-to-br from-purple-900 via-indigo-900 to-gray-900 relative">
            <button
              onClick={onClose}
              className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg transition"
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
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-gray-950 overflow-hidden bg-gray-800 shadow-xl">
                  {uploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 rounded-full">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500" />
                    </div>
                  )}
                  <img
                    src={previewAvatar || profile.avatar_url || "/default-avatar.png"}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/default-avatar.png"; }}
                  />
                </div>

                {/* Botón de editar avatar — solo perfil propio */}
                {isOwnProfile && (
                  <div className="absolute bottom-0 right-0 w-7 h-7 z-10">
                    <div className="bg-purple-600 rounded-full w-7 h-7 flex items-center justify-center shadow-md pointer-events-none">
                      <span className="text-xs">✏️</span>
                    </div>
                    {/* [P2] accept ampliado: PNG, JPG, GIF, WEBP, AVIF, BMP, SVG */}
                    <input
                      type="file"
                      accept={ACCEPTED_IMAGE_TYPES}
                      onChange={handleAvatarChange}
                      disabled={uploadingAvatar}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Botones de confirmación de avatar */}
              {previewAvatar && isOwnProfile && (
                <div className="flex gap-2 mt-10">
                  <button
                    onClick={() => { setPreviewAvatar(null); setSelectedFile(null); }}
                    className="px-3 py-1.5 bg-gray-700 text-white text-sm rounded-full hover:bg-gray-600 transition"
                  >
                    {t("cancelar") || "Cancelar"}
                  </button>
                  <button
                    onClick={handleUploadAvatar}
                    disabled={uploadingAvatar}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-full disabled:opacity-50 transition"
                  >
                    {uploadingAvatar ? (t("subiendo") || "Subiendo…") : (t("guardar_avatar") || "Guardar avatar")}
                  </button>
                </div>
              )}

              {/* Botón "Enviar mensaje" — solo perfil ajeno */}
              {!isOwnProfile && onOpenChat && id && (
                <button
                  onClick={() => { onOpenChat(id); onClose(); }}
                  className="mb-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-2xl font-semibold transition"
                >
                  💬 {t("enviar_mensaje") || "Mensaje"}
                </button>
              )}
            </div>

            {loading ? (
              <p className="text-white text-center py-8">{t("cargando_perfil") || "Cargando perfil…"}</p>
            ) : (
              <>
                {/* Nombre y username */}
                <div className="mb-1">
                  <p className="text-white text-lg font-bold leading-tight">@{profile.username}</p>
                  {profile.name ? <p className="text-gray-400 text-sm">{profile.name}</p> : null}
                </div>

                {profile.bio ? (
                  <p className="text-gray-300 text-sm mb-2 leading-snug">{profile.bio}</p>
                ) : null}

                {(profile.city || selectedCountryObj?.name) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-4">
                    <span>📍 {[profile.city, selectedCountryObj?.name].filter(Boolean).join(", ")}</span>
                  </div>
                )}

                {/* Stats */}
                <div className="flex gap-6 text-center border-y border-white/10 py-3 mb-5">
                  <div>
                    <p className="text-white font-bold text-base">{profile.posts_count}</p>
                    <p className="text-gray-500 text-xs">{t("publicaciones") || "Posts"}</p>
                  </div>
                  <div>
                    <p className="text-white font-bold text-base">{profile.followers_count}</p>
                    <p className="text-gray-500 text-xs">{t("seguidores") || "Seguidores"}</p>
                  </div>
                  <div>
                    <p className="text-white font-bold text-base">{profile.following_count}</p>
                    <p className="text-gray-500 text-xs">{t("siguiendo") || "Siguiendo"}</p>
                  </div>
                </div>

                {/* Tabs — solo para perfil propio */}
                {isOwnProfile && (
                  <div className="flex border-b border-white/10 mb-5">
                    <button
                      className={`flex-1 pb-2 text-sm font-medium transition ${activeTab === "info" ? "text-purple-400 border-b-2 border-purple-500" : "text-gray-500 hover:text-gray-300"}`}
                      onClick={() => setActiveTab("info")}
                    >
                      {t("informacion") || "Información"}
                    </button>
                    <button
                      className={`flex-1 pb-2 text-sm font-medium transition ${activeTab === "location" ? "text-purple-400 border-b-2 border-purple-500" : "text-gray-500 hover:text-gray-300"}`}
                      onClick={() => setActiveTab("location")}
                    >
                      {t("ubicacion") || "Ubicación"}
                    </button>
                  </div>
                )}

                {/* Tab: Información */}
                {isOwnProfile && activeTab === "info" && (
                  <div className="space-y-4 pb-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t("nombre") || "Nombre visible"}</label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={e => setProfile(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-gray-900 border border-white/10 p-3 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder={t("tu_nombre") || "Tu nombre"}
                      />
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs text-gray-500">{t("biografia") || "Biografía"}</label>
                        <span className="text-xs text-gray-600">{bioLength}/160</span>
                      </div>
                      <textarea
                        value={profile.bio}
                        onChange={e => {
                          if (e.target.value.length <= 160) {
                            setProfile(prev => ({ ...prev, bio: e.target.value }));
                            setBioLength(e.target.value.length);
                          }
                        }}
                        className="w-full bg-gray-900 border border-white/10 p-3 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none h-20"
                        placeholder={t("cuentanos_sobre_ti") || "Cuéntanos sobre ti..."}
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t("fecha_nacimiento") || "Fecha de nacimiento"}</label>
                      <input
                        type="date"
                        value={profile.birthdate}
                        onChange={e => setProfile(prev => ({ ...prev, birthdate: e.target.value }))}
                        className="w-full bg-gray-900 border border-white/10 p-3 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div className="flex items-center justify-between bg-gray-900 border border-white/10 rounded-xl px-4 py-3">
                      <label className="text-sm text-gray-300">{t("perfil_visible") || "Perfil visible"}</label>
                      <button
                        onClick={toggleProfileVisibility}
                        className={`relative w-11 h-6 rounded-full transition-colors ${profile.profile_visible ? "bg-purple-600" : "bg-gray-700"}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${profile.profile_visible ? "translate-x-5" : "translate-x-0"}`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab: Ubicación */}
                {isOwnProfile && activeTab === "location" && (
                  <div className="space-y-4 pb-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t("ubicacion_texto") || "Descripción de ubicación"}</label>
                      <input
                        type="text"
                        value={profile.location_text}
                        onChange={e => setProfile(prev => ({ ...prev, location_text: e.target.value }))}
                        className="w-full bg-gray-900 border border-white/10 p-3 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder={t("ej_ciudad_creativa") || "ej. Ciudad de México, CDMX"}
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t("pais") || "País"}</label>
                      {isCountryLocked() ? (
                        <div className="w-full bg-gray-900 border border-white/10 p-3 rounded-xl text-gray-400 text-sm flex items-center justify-between">
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
                          className="w-full bg-gray-900 border border-white/10 p-3 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
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
                        <label className="block text-xs text-gray-500 mb-1">{t("estado") || "Estado / Provincia"}</label>
                        <select
                          value={profile.state}
                          onChange={e => setProfile(prev => ({
                            ...prev,
                            state: e.target.value,
                            city: "",
                          }))}
                          className="w-full bg-gray-900 border border-white/10 p-3 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
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
                        <label className="block text-xs text-gray-500 mb-1">{t("ciudad") || "Ciudad"}</label>
                        <select
                          value={profile.city}
                          onChange={e => setProfile(prev => ({ ...prev, city: e.target.value }))}
                          className="w-full bg-gray-900 border border-white/10 p-3 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
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

                {/* Botón Creator Dashboard */}
                {isOwnProfile && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDashboard(true);
                    }}
                    className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-xl font-semibold transition"
                  >
                    Creator Dashboard
                  </button>
                )}

                {/* Botones de acción */}
                <div className="space-y-3 mt-5 pb-5">
                  {isOwnProfile && (
                    <div className="flex gap-3">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-semibold text-sm disabled:opacity-50 transition"
                      >
                        {saving ? (t("guardando") || "Guardando…") : (t("guardar") || "Guardar")}
                      </button>
                      <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl text-sm transition"
                      >
                        {t("cancelar") || "Cancelar"}
                      </button>
                    </div>
                  )}

                  {/* Botón Premium Chat (showUpgradeButton o perfil propio sin premium) */}
                  {(showUpgradeButton || (isOwnProfile && profile.tier !== "premium" && profile.tier !== "premium+")) && (
                    <button
                      onClick={handlePremiumChat}
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-2xl font-semibold text-sm transition"
                    >
                      {profile.tier === "premium" || profile.tier === "premium+"
                        ? (t("ir_chat_premium") || "Ir al Chat Premium")
                        : (t("suscribirse_chat_premium", { amount: 5 }) || "Chat Premium · 5 WLD")}
                    </button>
                  )}

                  {/* Botón Contacto (abre modal de quejas/sugerencias) */}
                  <button
                    onClick={() => setShowComplaintModal(true)}
                    className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-white/10 text-gray-300 hover:text-white rounded-2xl text-sm transition flex items-center justify-center gap-2"
                  >
                    <span>💬</span>
                    <span>{t("contacto") || "Contacto"}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal Quejas / Sugerencias / Contacto */}
      {showComplaintModal && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[60] px-4"
          onClick={() => setShowComplaintModal(false)}
        >
          <div
            className="bg-gray-950 border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-base">
                {t("quejas_sugerencias") || "Quejas y sugerencias"}
              </h3>
              <button
                onClick={() => setShowComplaintModal(false)}
                className="text-gray-500 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            <p className="text-gray-400 text-xs mb-4">
              {t("quejas_descripcion") || "Tu mensaje nos ayuda a mejorar. Lo revisaremos a la brevedad."}
            </p>

            <textarea
              value={complaintMessage}
              onChange={e => setComplaintMessage(e.target.value)}
              rows={5}
              className="w-full bg-gray-900 border border-white/10 p-3 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none mb-4"
              placeholder={t("escribe_tu_mensaje") || "Escribe tu mensaje aquí..."}
            />

            <button
              onClick={handleSendComplaint}
              disabled={sendingComplaint || !complaintMessage.trim()}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-semibold text-sm disabled:opacity-50 transition"
            >
              {sendingComplaint ? (t("enviando") || "Enviando...") : (t("enviar") || "Enviar")}
            </button>
          </div>
        </div>
      )}

      {/* [P9] CORREGIDO: toast con colores según tipo (success / error) */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-4 max-w-xs w-full">
          <div className={`px-5 py-3 rounded-2xl text-sm font-medium shadow-xl text-center ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}>
            {toast.message}
          </div>
        </div>
      )}

      {/* Dashboard overlay */}
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
