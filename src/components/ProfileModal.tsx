import React, { useEffect, useState, useContext, useRef } from "react";
import { supabase } from "../supabaseClient";
import { ThemeContext } from "../lib/ThemeContext";

interface ProfileModalProps {
  id: string | null;
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
  profile_visible: true
};

const ProfileModal: React.FC<ProfileModalProps> = ({
  id,
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

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

        setProfile(data || emptyProfile);
        setBioLength(data?.bio?.length || 0);

        if (!data?.username && id) {
          const autoUsername = `@${id.slice(0, 10)}`;
          setProfile((prev) => ({ ...prev, username: autoUsername }));
        }

      } catch (err: any) {

        setError(err.message);

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
          profile_visible: profile.profile_visible
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

      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", id);

      setProfile(prev => ({
        ...prev,
        avatar_url: publicUrl
      }));

    } catch (err: any) {

      setError(err.message);

    } finally {

      setUploadingAvatar(false);

    }

  };

  const startChat = async () => {

    if (!id || !profile.id) return;

    try {

      const { data, error } = await supabase.rpc(
        "get_or_create_conversation",
        {
          user_a: id,
          user_b: profile.id
        }
      );

      if (error) throw error;

      window.location.href = `/chat/${data}`;

    } catch (err) {

      console.error(err);

    }

  };

  const toggleProfileVisibility = () => {

    setProfile(prev => ({
      ...prev,
      profile_visible: !prev.profile_visible
    }));

  };

  const blockUser = (userId: string) => {

    if (!blockedUsers.includes(userId)) {
      setBlockedUsers([...blockedUsers, userId]);
    }

  };

  const viewProfile = async (userId: string) => {

    try {

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (data) {
        setProfile(data);
      }

    } catch (err) {

      console.error(err);

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
                <p className="text-white font-bold">
                  {profile.name || "Tu nombre"}
                </p>

                <input
                  value={`@${id?.slice(0, 10)}`}
                  disabled
                  className="bg-transparent text-gray-400 cursor-not-allowed outline-none"
                />
              </div>

            </div>

            <button
              onClick={startChat}
              className="w-full py-3 bg-purple-600 text-white rounded-full font-medium"
            >
              Enviar Mensaje
            </button>

            <button
              onClick={toggleProfileVisibility}
              className="w-full py-2 bg-gray-700 text-white rounded-xl"
            >
              {profile.profile_visible ? "Perfil Público" : "Perfil Privado"}
            </button>

            <button
              onClick={() => blockUser(profile.id)}
              className="w-full py-2 bg-red-600 text-white rounded-xl"
            >
              Bloquear Usuario
            </button>

            <button
              onClick={() => viewProfile(profile.id)}
              className="w-full py-2 bg-blue-600 text-white rounded-xl"
            >
              Ver Perfil
            </button>

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

            <p className="text-gray-500 text-sm text-right">
              {bioLength}/160
            </p>

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
