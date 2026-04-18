import React, { useEffect, useState, useContext } from 'react';
import { supabase } from '../supabaseClient';
import ActionButton from '../components/ActionButton';
import { ThemeContext } from '../lib/ThemeContext';
import { Shield, Star, Zap } from 'lucide-react';

interface ProfilePageProps {
  userId: string | null;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ userId }) => {
  const [reputation, setReputation] = useState(0);
  const [wldBalance, setWldBalance] = useState(0);
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";

  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      const { data } = await supabase
        .from('user_reputation')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (data) setReputation(data.score);

      const { data: balanceData } = await supabase
        .from('user_tokens')
        .select('wld_balance')
        .eq('user_id', userId)
        .single();
      if (balanceData) setWldBalance(balanceData.wld_balance);
    };

    fetchData();
  }, [userId]);

  if (!userId) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-6 ${isDark ? "bg-[#0a0a0a]" : "bg-[#f8f9fa]"}`}>
        <div className="text-center">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))", border: "1px solid rgba(99,102,241,0.2)" }}
          >
            <Shield className="w-9 h-9 text-indigo-400" />
          </div>
          <p className={`text-base font-semibold ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            No has iniciado sesión
          </p>
          <p className={`text-sm mt-1 ${isDark ? "text-gray-600" : "text-gray-400"}`}>
            Verifica con World ID para ver tu perfil.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen px-6 py-8 ${isDark ? "bg-[#0a0a0a] text-white" : "bg-[#f8f9fa] text-gray-900"}`}>
      {/* Hero header */}
      <div
        className="relative w-full rounded-3xl overflow-hidden mb-6 p-6"
        style={{ background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 50%, #a855f7 100%)" }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/[0.07] pointer-events-none" />

        {/* Avatar placeholder */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold text-white border-2 border-white/30 flex-shrink-0">
            {userId.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-lg leading-tight truncate">
              {userId.slice(0, 12)}…
            </p>
            <p className="text-white/70 text-xs font-medium mt-0.5">Human verificado</p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Reputation */}
        <div className={`rounded-2xl p-4 border transition-all ${isDark ? "bg-[#111113] border-white/[0.07]" : "bg-white border-gray-100 shadow-sm"}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
              <Star className="w-3.5 h-3.5 text-white" />
            </div>
            <span className={`text-xs font-semibold ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Reputación
            </span>
          </div>
          <p className={`text-2xl font-bold tabular-nums ${isDark ? "text-white" : "text-gray-900"}`}>
            {reputation.toLocaleString()}
          </p>
        </div>

        {/* WLD Balance */}
        <div className={`rounded-2xl p-4 border transition-all ${isDark ? "bg-[#111113] border-white/[0.07]" : "bg-white border-gray-100 shadow-sm"}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className={`text-xs font-semibold ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Balance WLD
            </span>
          </div>
          <p className={`text-2xl font-bold tabular-nums ${isDark ? "text-white" : "text-gray-900"}`}>
            {wldBalance.toFixed(4)}
          </p>
        </div>
      </div>

      {/* ID card */}
      <div className={`rounded-2xl p-4 border mb-6 ${isDark ? "bg-[#111113] border-white/[0.07]" : "bg-white border-gray-100 shadow-sm"}`}>
        <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          User ID
        </p>
        <p className={`text-sm font-mono break-all ${isDark ? "text-gray-300" : "text-gray-700"}`}>
          {userId}
        </p>
      </div>

      {/* CTA */}
      <ActionButton
        label="Verificar World ID"
        onClick={() => alert('Aquí va World ID')}
        className="w-full"
      />
    </div>
  );
};

export default ProfilePage;
