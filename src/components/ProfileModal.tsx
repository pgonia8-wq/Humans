import React, { useEffect, useState, useContext, useRef } from "react";
import { supabase } from "../supabaseClient";
import { ThemeContext } from "../lib/ThemeContext";

interface ProfileModalProps {
  viewerId: string | null;
  profileId: string;
  onClose: () => void;
}

interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar_url: string;
  bio: string;
  birthdate: string;
  city: string;
  country: string;
  created_at: string;
  followers_count: number;
  following_count: number;
  is_private: boolean;
}

const emptyProfile: UserProfile = {
  id: "",
  name: "",
  username: "",
  avatar_url: "",
  bio: "",
  birthdate: "",
  city: "",
  country: "",
  created_at: "",
  followers_count: 0,
  following_count: 0,
  is_private: false
};

const ProfileModal: React.FC<ProfileModalProps> = ({
  viewerId,
  profileId,
  onClose
}) => {

  const { theme, setTheme } = useContext(ThemeContext);

  const [profile,setProfile] = useState<UserProfile>(emptyProfile);
  const [loading,setLoading] = useState(true);
  const [isFollowing,setIsFollowing] = useState(false);

  const [activeTab,setActiveTab] = useState<"posts"|"responses"|"likes">("posts");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = viewerId === profileId;

  useEffect(()=>{

    loadProfile();

    if(!isOwnProfile){
      checkFollow();
    }

  },[profileId]);

  const loadProfile = async ()=>{

    const {data,error} = await supabase
      .from("profiles")
      .select("*")
      .eq("id",profileId)
      .maybeSingle();

    if(!error && data){
      setProfile(data);
    }

    setLoading(false);
  };

  const checkFollow = async ()=>{

    if(!viewerId) return;

    const {data} = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id",viewerId)
      .eq("following_id",profileId)
      .maybeSingle();

    setIsFollowing(!!data);
  };

  const followUser = async ()=>{

    if(!viewerId) return;

    await supabase.from("follows").insert({
      follower_id: viewerId,
      following_id: profileId
    });

    setIsFollowing(true);
  };

  const unfollowUser = async ()=>{

    if(!viewerId) return;

    await supabase
      .from("follows")
      .delete()
      .eq("follower_id",viewerId)
      .eq("following_id",profileId);

    setIsFollowing(false);
  };

  const startChat = async ()=>{

    if(!viewerId) return;

    const {data,error} = await supabase.rpc(
      "get_or_create_conversation",
      {
        user_a: viewerId,
        user_b: profileId
      }
    );

    if(!error && data){
      window.location.href = `/chat/${data}`;
    }

  };

  const blockUser = async ()=>{

    if(!viewerId) return;

    await supabase.from("blocks").insert({
      blocker_id: viewerId,
      blocked_id: profileId
    });

    onClose();
  };

  const togglePrivacy = async ()=>{

    const newValue = !profile.is_private;

    await supabase
      .from("profiles")
      .update({is_private:newValue})
      .eq("id",profileId);

    setProfile(prev=>({
      ...prev,
      is_private:newValue
    }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>)=>{

    const file = e.target.files?.[0];
    if(!file || !viewerId) return;

    const {data,error} = await supabase.storage
      .from("avatars")
      .upload(`${viewerId}/${file.name}`,file,{upsert:true});

    if(error) return;

    const {data:publicUrlData} = supabase.storage
      .from("avatars")
      .getPublicUrl(data.path);

    const url = publicUrlData.publicUrl;

    await supabase
      .from("profiles")
      .update({avatar_url:url})
      .eq("id",viewerId);

    setProfile(prev=>({...prev,avatar_url:url}));
  };

  if(loading){
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
        <p className="text-white">Cargando perfil...</p>
      </div>
    );
  }

  return (

<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-2">

<div className="bg-gray-900 rounded-2xl p-6 w-full max-w-lg border border-white/10 space-y-4">

<h2 className="text-xl font-bold text-white">Perfil</h2>

<div className="flex items-center gap-4">

<div className="relative">

<img
src={profile.avatar_url || "/default-avatar.png"}
className="w-20 h-20 rounded-full object-cover"
/>

{isOwnProfile && (

<button
onClick={()=>fileInputRef.current?.click()}
className="absolute bottom-0 right-0 bg-purple-600 p-1 rounded-full"
>
✏️
</button>

)}

<input
type="file"
ref={fileInputRef}
onChange={handleAvatarUpload}
className="hidden"
accept="image/*"
/>

</div>

<div>

<p className="text-white font-bold">{profile.name || "Usuario"}</p>

<p className="text-gray-400 text-sm">@{profile.id.slice(0,10)}</p>

</div>

</div>

<p className="text-gray-300">{profile.bio}</p>

<div className="flex justify-between text-gray-400">

<p>{profile.following_count} Siguiendo</p>

<p>{profile.followers_count} Seguidores</p>

</div>

{/* BOTONES SOLO PARA OTRO PERFIL */}

{!isOwnProfile && (

<div className="flex gap-2">

{isFollowing ? (

<button
onClick={unfollowUser}
className="flex-1 py-2 bg-gray-700 rounded-xl"
>
Siguiendo
</button>

) : (

<button
onClick={followUser}
className="flex-1 py-2 bg-purple-600 rounded-xl"
>
Seguir
</button>

)}

<button
onClick={startChat}
className="flex-1 py-2 bg-blue-600 rounded-xl"
>
Mensaje
</button>

</div>

)}

{/* BLOQUEAR SOLO OTRO PERFIL */}

{!isOwnProfile && (

<button
onClick={blockUser}
className="w-full py-2 bg-red-600 rounded-xl"
>
Bloquear usuario
</button>

)}

{/* PRIVACIDAD SOLO TU PERFIL */}

{isOwnProfile && (

<button
onClick={togglePrivacy}
className="w-full py-2 bg-gray-700 rounded-xl"
>
{profile.is_private ? "Perfil privado 🔒" : "Perfil público 🌎"}
</button>

)}

{/* TABS */}

<div className="border-t border-gray-700 pt-4">

<div className="flex justify-around text-gray-400 text-sm">

<button onClick={()=>setActiveTab("posts")}>Posts</button>

<button onClick={()=>setActiveTab("responses")}>Respuestas</button>

<button onClick={()=>setActiveTab("likes")}>Likes</button>

</div>

</div>

<button
onClick={onClose}
className="w-full py-3 bg-red-600 text-white rounded-full"
>
Cerrar
</button>

</div>

</div>

  );
};

export default ProfileModal;
