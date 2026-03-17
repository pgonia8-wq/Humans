import React, { useState, useEffect, useContext } from "react";
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

const ProfileModal: React.FC<ProfileModalProps> = ({
  id,
  onClose,
  currentUserId,
  showUpgradeButton = true,
  onOpenChat,
}) => {
  const { theme } = useContext(ThemeContext);
  const { t } = useLanguage();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [followStatus, setFollowStatus] = useState<"not_following" | "following" | "requested">("not_following");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);

  // NUEVO: estados para subir avatar desde teléfono
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError(null);

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;

        setProfile(data);
        setIsOwnProfile(id === currentUserId);

        // Contadores
        const { count: followers } = await supabase
          .from("followers")
          .select("*", { count: "exact" })
          .eq("following_id", id);
        setFollowersCount(followers || 0);

        const { count: following } = await supabase
          .from("followers")
          .select("*", { count: "exact" })
          .eq("follower_id", id);
        setFollowingCount(following || 0);

        const { count: posts } = await supabase
          .from("posts")
          .select("*", { count: "exact" })
          .eq("user_id", id)
          .eq("deleted_flag", false);
        setPostsCount(posts || 0);

        // Estado de follow
        if (currentUserId && currentUserId !== id) {
          const { data: follow } = await supabase
            .from("followers")
            .select("*")
            .eq("follower_id", currentUserId)
            .eq("following_id", id)
            .maybeSingle();

          setFollowStatus(follow ? "following" : "not_following");
        }
      } catch (err: any) {
        console.error("[ProfileModal] Error fetching profile:", err);
        setError(err.message || t("error_cargando_perfil"));
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id, currentUserId, t]);

  const handleFollow = async () => {
    if (!currentUserId || currentUserId === id) return;

    try {
      if (followStatus === "following") {
        await supabase
          .from("followers")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", id);
        setFollowStatus("not_following");
        setFollowersCount((prev) => prev - 1);
      } else {
        await supabase
          .from("followers")
          .insert({
            follower_id: currentUserId,
            following_id: id,
          });
        setFollowStatus("following");
        setFollowersCount((prev) => prev + 1);
      }
    } catch (err: any) {
      console.error("[ProfileModal] Error follow:", err);
      setToast({ message: err.message || t("error_follow"), type: "error" });
    }
  };

  // NUEVO: Seleccionar imagen del teléfono
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewAvatar(URL.createObjectURL(file));
    }
  };

  // NUEVO: Subir avatar a Supabase y actualizar perfil
  const handleUploadAvatar = async () => {
    if (!selectedFile || !currentUserId || !isOwnProfile) return;

    setUploadingAvatar(true);

    try {
      const fileExt = selectedFile.name.split(".").pop() || "jpg";
      const fileName = `\( {currentUserId}- \){Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", currentUserId);

      if (updateError) throw updateError;

      // Refrescar perfil local
      setProfile((prev: any) => ({ ...prev, avatar_url: publicUrl }));
      setPreviewAvatar(null);
      setSelectedFile(null);

      setToast({ message: t("avatar_subido_exito") || "Avatar subido correctamente", type: "success" });
    } catch (err: any) {
      console.error("[ProfileModal] Error subiendo avatar:", err);
      setToast({ message: err.message || t("error_subir_avatar") || "Error al subir avatar", type: "error" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
        <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full text-center">
          <p className="text-red-400 mb-4">{error || t("perfil_no_encontrado")}</p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
          >
            {t("cerrar")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border ${theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"}`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 text-2xl"
        >
          ✕
        </button>

        <div className="p-6">
          <div className="flex flex-col items-center gap-4 mb-6">
            {/* AVATAR CON SUBIDA - SOLO CAMBIO AQUÍ */}
            <div className="relative group">
              <img
                src={previewAvatar || profile.avatar_url || "/default-avatar.png"}
                alt="Avatar"
                className="w-32 h-32 rounded-full object-cover border-4 border-purple-500 shadow-lg transition-transform group-hover:scale-105"
              />
              {isOwnProfile && (
                <label className="absolute bottom-2 right-2 bg-purple-600 text-white p-3 rounded-full cursor-pointer hover:bg-purple-700 shadow-md opacity-90 hover:opacity-100 transition">
                  <span className="text-xl">📷</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                    disabled={uploadingAvatar}
                  />
                </label>
              )}
            </div>

            {/* Botones de subir/cancelar - aparecen solo si hay preview */}
            {previewAvatar && isOwnProfile && (
              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => {
                    setPreviewAvatar(null);
                    setSelectedFile(null);
                  }}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  {t("cancelar")}
                </button>
                <button
                  onClick={handleUploadAvatar}
                  disabled={uploadingAvatar}
                  className={`px-4 py-2 rounded-lg font-medium min-w-[120px] ${
                    uploadingAvatar
                      ? "bg-gray-600 cursor-not-allowed text-gray-300"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }`}
                >
                  {uploadingAvatar ? t("subiendo") || "Subiendo..." : t("guardar_avatar") || "Guardar avatar"}
                </button>
              </div>
            )}

            <h2 className="text-2xl font-bold">{profile.username || t("usuario_anonimo")}</h2>
            <p className="text-gray-400">@{profile.username?.toLowerCase() || "anon"}</p>
            <p className="text-center max-w-xs">{profile.bio || t("sin_bio")}</p>
            <p className="text-sm text-gray-500">
              {profile.city || t("sin_ciudad")} • {profile.country || t("sin_pais")}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8 text-center">
            <div>
              <p className="text-2xl font-bold">{postsCount}</p>
              <p className="text-gray-400 text-sm">{t("publicaciones")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{followersCount}</p>
              <p className="text-gray-400 text-sm">{t("seguidores")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{followingCount}</p>
              <p className="text-gray-400 text-sm">{t("siguiendo")}</p>
            </div>
          </div>

          {/* Botones de acción - intactos */}
          <div className="flex gap-3 mb-6">
            {currentUserId && currentUserId !== id ? (
              <>
                <button
                  onClick={handleFollow}
                  className={`flex-1 py-3 rounded-xl font-bold transition ${
                    followStatus === "following"
                      ? "bg-gray-700 text-white hover:bg-gray-600"
                      : "bg-purple-600 text-white hover:bg-purple-700"
                  }`}
                >
                  {followStatus === "following" ? t("siguiendo") : t("seguir")}
                </button>

                <button
                  onClick={() => onOpenChat?.(id!)}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
                >
                  {t("mensaje")}
                </button>
              </>
            ) : isOwnProfile ? (
              <button
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-indigo-700 transition"
              >
                {t("editar_perfil")}
              </button>
            ) : null}
          </div>

          {/* Sección de upgrade - intacta */}
          {showUpgradeButton && !profile.tier && (
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-4 rounded-xl mb-6">
              <h3 className="font-bold text-yellow-400 mb-2">{t("mejora_tu_perfil")}</h3>
              <p className="text-sm text-gray-300 mb-4">{t("accede_a_funciones_exclusivas")}</p>
              <button className="w-full py-3 bg-yellow-500 text-black rounded-xl font-bold hover:bg-yellow-400 transition">
                {t("ver_planes")}
              </button>
            </div>
          )}

          {/* Chat exclusivo - intacto */}
          {profile.tier === "premium" && (
            <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 p-4 rounded-xl mb-6">
              <h3 className="font-bold text-purple-400 mb-2">{t("chat_exclusivo")}</h3>
              <button
                onClick={() => onOpenChat?.(id!)}
                className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition"
              >
                {t("chat_exclusivo_creadores_tokens")}
              </button>
            </div>
          )}

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
    </div>
  );
};

export default ProfileModal;
