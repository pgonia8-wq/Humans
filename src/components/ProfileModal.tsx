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
  const { theme, accentColor } = useContext(ThemeContext);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUserId) return setLoading(false);

    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUserId)
          .single();

        if (error) throw error;
        setProfile(data || emptyProfile);
        setBioLength(data?.bio.length || 0);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentUserId]);

  const handleSave = async () => {
    if (!currentUserId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: profile.name,
          username: profile.username,
          bio: profile.bio,
          birthdate: profile.birthdate,
          city: profile.city,
          country: profile.country,
        })
        .eq("id", currentUserId);

      if (error) throw error;
      setToast({ message: "Perfil guardado correctamente", type: "success" });
    } catch (err: any) {
      setError(err.message);
      setToast({ message: "Error al guardar perfil", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(`\( {currentUserId}/ \){file.name}`, file);

      if (error) throw error;

      const { publicURL } = supabase.storage
        .from("avatars")
        .getPublicUrl(data.path);

      if (publicURL) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ avatar_url: publicURL })
          .eq("id", currentUserId);

        if (updateError) throw updateError;

        setProfile((prev) => ({ ...prev, avatar_url: publicURL }));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-2">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-lg border border-white/10 space-y-4">
        {loading ? (
          <p>Cargando perfil...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
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
                  📷
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
                <p className="text-gray-400">@{profile.username || "invitado"}</p>
              </div>
            </div>

            <input
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Tu nombre"
              className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white"
            />

            <input
              value={profile.username}
              onChange={(e) => setProfile({ ...profile, username: e.target.value })}
              placeholder="@username"
              className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white"
            />

            <textarea
              value={profile.bio}
              onChange={(e) => {
                if (e.target.value.length <= 160) {
                  setProfile({ ...profile, bio: e.target.value });
                  setBioLength(e.target.value.length);
                }
              }}
              placeholder="Escribe tu bio..."
              className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white min-h-[80px]"
            />
            <p className="text-gray-500 text-sm text-right">{bioLength}/160</p>

            <input
              type="date"
              value={profile.birthdate}
              onChange={(e) => setProfile({ ...profile, birthdate: e.target.value })}
              className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white"
            />

            <input
              value={profile.city}
              onChange={(e) => setProfile({ ...profile, city: e.target.value })}
              placeholder="Ciudad"
              className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white"
            />

            <input
              value={profile.country}
              onChange={(e) => setProfile({ ...profile, country: e.target.value })}
              placeholder="País"
              className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white"
            />

            <div className="flex justify-between text-gray-400">
              <p>0 Siguiendo</p>
              <p>0 Seguidores</p>
              <p>Se unió en -</p>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <div className="flex justify-around text-gray-400 text-sm">
                <button onClick={() => setActiveTab("posts")}>Posts</button>
                <button onClick={() => setActiveTab("responses")}>Respuestas</button>
                <button onClick={() => setActiveTab("likes")}>Likes</button>
              </div>
              {/* Tabs content would go here, but truncated */}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 bg-green-600 text-white rounded-full font-medium"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-red-600 text-white rounded-full font-medium"
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
