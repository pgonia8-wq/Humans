import React, { useEffect, useState, useContext, useRef } from "react";
import { supabase } from "../supabaseClient";
import { ThemeContext } from "../lib/ThemeContext";

interface ProfileModalProps {
  currentUserId: string | null;
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
  created_at: string;
  birthdate: string;
  city: string;
  country: string;
  posts_count: number;
  followers_count: number;
  following_count: number;
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
};

const ProfileModal: React.FC<ProfileModalProps> = ({
  currentUserId,
  onClose,
  showUpgradeButton = true,
}) => {
  const [profile, setProfile] = useState<UserProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "responses" | "likes">("posts");
  const [bioLength, setBioLength] = useState(0);
  const { theme, setTheme } = useContext(ThemeContext);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadOrCreateProfile = async () => {
      setLoading(true);
      setError(null);

      if (!currentUserId) {
        setProfile({ ...emptyProfile, id: "guest", username: "invitado" });
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUserId)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") {
          throw fetchError;
        }

        if (data) {
          setProfile(data);
          setBioLength(data.bio?.length || 0);
        } else {
          const newProfile = {
            id: currentUserId,
            name: "",
            username: `user_${currentUserId.slice(0, 8)}`,
            avatar_url: "",
            tier: "free" as const,
            bio: "",
            created_at: new Date().toISOString(),
            birthdate: "",
            city: "",
            country: "",
            posts_count: 0,
            followers_count: 0,
            following_count: 0,
          };

          const { error: upsertError } = await supabase
            .from("profiles")
            .upsert(newProfile);

          if (upsertError) throw upsertError;

          setProfile(newProfile);
        }
      } catch (err: any) {
        console.error("Error cargando/creando perfil:", err);
        setError("No pudimos cargar tu perfil. Intenta más tarde.");
      } finally {
        setLoading(false);
      }
    };

    loadOrCreateProfile();
  }, [currentUserId]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (!currentUserId) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: currentUserId,
          name: profile.name,
          bio: profile.bio,
          birthdate: profile.birthdate,
          city: profile.city,
          country: profile.country,
          avatar_url: profile.avatar_url,
        });

      if (error) throw error;

      showToast("Perfil guardado correctamente ✅");
      onClose();
    } catch (err: any) {
      showToast("Error al guardar: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;

    if (!file.type.startsWith("image/")) {
      showToast("Solo se permiten imágenes (JPG, PNG, etc.)", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("La imagen es muy grande (máximo 5 MB)", "error");
      return;
    }

    setUploadingAvatar(true);
    const timestamp = Date.now();

    
    const fileName = `${currentUserId}/avatar-${timestamp}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

    
      const newAvatarUrl = `${urlData.publicUrl}?t=${timestamp}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: newAvatarUrl })
        .eq("id", currentUserId);

      if (updateError) throw updateError;

      setProfile((prev) => ({ ...prev, avatar_url: newAvatarUrl }));
      showToast("Avatar actualizado correctamente");
    } catch (err: any) {
      console.error("Error en avatar:", err);
      showToast("No se pudo subir o asociar la imagen: " + err.message, "error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const joinedDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("es-MX", {
        month: "long",
        year: "numeric",
      })
    : "—";

  const isPremium = profile.tier === "premium" || profile.tier === "premium+";

  // Clases condicionales por tema
  const modalBg = theme === "dark" ? "bg-gray-900 text-white" : "bg-white text-black";
  const headerGradient = theme === "dark" ? "from-indigo-600 to-purple-600" : "from-indigo-500 to-purple-500";
  const inputBg = theme === "dark" ? "bg-gray-800" : "bg-gray-200 text-black";
  const borderColor = theme === "dark" ? "border-white/20" : "border-gray-300";
  const textGray = theme === "dark" ? "text-gray-400" : "text-gray-600";
  const tabActive = theme === "dark" ? "text-purple-400 border-purple-400" : "text-purple-600 border-purple-600";
  const tabInactive = theme === "dark" ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-800";
  const buttonGreen = theme === "dark" ? "bg-green-600 hover:bg-green-700" : "bg-green-500 hover:bg-green-600";
  const buttonRed = theme === "dark" ? "bg-red-600/80 hover:bg-red-700" : "bg-red-500 hover:bg-red-600";

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="text-white text-xl animate-pulse">Cargando perfil...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-8 rounded-2xl text-center max-w-sm">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={onClose} className="px-6 py-3 bg-purple-600 rounded-xl text-white">
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-black/80 flex flex-col z-50 ${modalBg}`}>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg z-50 animate-fade-in-out ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          } text-white`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className={`relative bg-gradient-to-r ${headerGradient} h-32 flex-shrink-0`}>
        <button
          onClick={onClose}
          aria-label="Cerrar perfil"
          className="absolute top-4 right-16 text-white text-3xl font-light hover:text-gray-200 z-10"
        >
          ×
        </button>

        <button
          onClick={toggleTheme}
          aria-label="Alternar tema"
          className="absolute top-4 right-4 text-white text-2xl hover:text-yellow-300 transition-colors z-10"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>

      {/* Avatar fijo centrado en la parte superior */}
<div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-28 h-28 z-20">
  <img
    src={profile.avatar_url || "/default-avatar.png"}
    alt="Tu avatar"
    className="w-28 h-28 rounded-full border-4 border-white object-cover shadow-lg"
    onError={(e) => ((e.target as HTMLImageElement).src = "/default-avatar.png")}
  />

  {/* Lápiz para cambiar avatar */}
  <div
    onClick={() => avatarInputRef.current?.click()}
    className="absolute bottom-0 right-0 bg-purple-600 rounded-full p-1.5 cursor-pointer hover:bg-purple-700 shadow-lg flex items-center justify-center"
    title="Cambiar avatar"
  >
    ✏️
  </div>

  <input
    ref={avatarInputRef}
    type="file"
    accept="image/*"
    onChange={handleAvatarChange}
    className="hidden"
    disabled={uploadingAvatar}
  />
</div>
      {/* Contenido principal */}
      <div className="flex-1 overflow-y-auto">
        <div className="pt-14 px-6 pb-6">
          <input
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            className={`bg-transparent text-2xl font-bold w-full focus:outline-none ${textGray}`}
            placeholder="Tu nombre"
            maxLength={50}
          />
          <p className={textGray + " mt-1"}>@{profile.username || "sin_username"}</p>

          {isPremium && (
            <div className="inline-block mt-2 px-4 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-bold rounded-full">
              PREMIUM
            </div>
          )}

          <textarea
            value={profile.bio}
            onChange={(e) => {
              const val = e.target.value;
              setProfile({ ...profile, bio: val });
              setBioLength(val.length);
            }}
            placeholder="Escribe tu bio..."
            maxLength={160}
            className={`mt-4 w-full ${inputBg} text-white p-4 rounded-2xl resize-none h-28 focus:outline-none focus:ring-2 focus:ring-purple-500`}
          />
          <div className={`text-right text-xs ${textGray} mt-1`}>{bioLength}/160</div>

          <div className="flex gap-6 mt-6 text-sm">
            <div>
              <span className="font-bold text-white">{profile.following_count}</span>{" "}
              <span className={textGray}>Siguiendo</span>
            </div>
            <div>
              <span className="font-bold text-white">{profile.followers_count}</span>{" "}
              <span className={textGray}>Seguidores</span>
            </div>
            <div className={textGray}>
              Se unió en <span className="text-white">{joinedDate}</span>
            </div>
          </div>

          <div className={`mt-5 flex flex-wrap gap-4 text-sm ${textGray}`}>
            {(profile.city || profile.country) && (
              <div>📍 {profile.city}{profile.country ? `, ${profile.country}` : ""}</div>
            )}
            {profile.birthdate && (
              <div>🎂 {new Date(profile.birthdate).toLocaleDateString("es-MX")}</div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${borderColor} sticky top-0 ${modalBg} z-10`}>
          {(["posts", "responses", "likes"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${
                activeTab === tab ? tabActive : tabInactive
              }`}
            >
              {tab === "posts" ? "Posts" : tab === "responses" ? "Respuestas" : "Likes"}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "posts" && (
            <p className={`text-center py-10 ${textGray}`}>Tus posts aparecerán aquí</p>
          )}
          {activeTab === "responses" && (
            <p className={`text-center py-10 ${textGray}`}>Tus respuestas aparecerán aquí</p>
          )}
          {activeTab === "likes" && (
            <p className={`text-center py-10 ${textGray}`}>Posts que te gustaron aparecerán aquí</p>
          )}
        </div>

        {/* Edición extra */}
        <div className={`p-6 border-t ${borderColor} space-y-5`}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs ${textGray} mb-1`}>Nacimiento</label>
              <input
                type="date"
                value={profile.birthdate}
                onChange={(e) => setProfile({ ...profile, birthdate: e.target.value })}
                className={`w-full ${inputBg} p-3 rounded-xl focus:outline-none`}
              />
            </div>
            <div>
              <label className={`block text-xs ${textGray} mb-1`}>Ciudad</label>
              <input
                type="text"
                placeholder="Ciudad"
                value={profile.city}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                className={`w-full ${inputBg} p-3 rounded-xl focus:outline-none`}
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs ${textGray} mb-1`}>País</label>
            <input
              type="text"
              placeholder="País"
              value={profile.country}
              onChange={(e) => setProfile({ ...profile, country: e.target.value })}
              className={`w-full ${inputBg} p-3 rounded-xl focus:outline-none`}
            />
          </div>
        </div>
      </div>

      {/* Botones inferiores */}
      <div className={`border-t ${borderColor} p-4 flex gap-3 flex-shrink-0`}>
        {showUpgradeButton && (
          <button
            onClick={() => alert("Upgrade → conectar wallet WLD")}
            className="flex-1 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl font-medium hover:opacity-90 transition"
          >
            Upgrade
          </button>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex-1 py-3.5 ${buttonGreen} rounded-2xl font-medium disabled:opacity-60 transition`}
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>

        <button
          onClick={() => alert("Reportado (función pendiente)")}
          className={`px-6 py-3.5 ${buttonRed} rounded-2xl text-sm font-medium transition`}
        >
          Reportar
        </button>
      </div>
    </div>
  );
};

export default ProfileModal;
