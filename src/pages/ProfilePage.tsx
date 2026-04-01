import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import ActionButton from '../components/ActionButton';

interface ProfilePageProps {
  userId: string | null;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ userId }) => {
  const [reputation, setReputation] = useState(0);
  const [wldBalance, setWldBalance] = useState(0);

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

  return (
    <div className="flex flex-col items-center p-4 space-y-4">
      {userId && (
        <div className="bg-white shadow-md rounded-xl p-4 w-full max-w-md flex flex-col items-center gap-2">
          <p className="text-lg font-semibold">ID: {userId.slice(0, 12)}...</p>
          <p>Reputación: {reputation}</p>
          <p>Balance WLD: {wldBalance}</p>
          <ActionButton label="Verificar World ID" onClick={() => alert('Aquí va World ID')} />
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
