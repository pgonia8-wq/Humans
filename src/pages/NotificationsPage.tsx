// Error #6 corregido: se reemplaza la API de Supabase Realtime v1 deprecada
// (.on().subscribe() y removeSubscription()) por la API v2 correcta (.channel().on().subscribe())

import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) setNotifications(data);
    };

    fetchNotifications();

    // API v2 correcta de Supabase Realtime
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => fetchNotifications()
      )
      .subscribe();

    // Cleanup con la API v2 correcta
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="p-4 flex flex-col space-y-2">
      <h2 className="text-2xl font-bold mb-4">Notificaciones</h2>
      {notifications.length === 0 && <p>No tienes notificaciones.</p>}
      {notifications.map((n) => (
        <div key={n.id} className="p-2 bg-white shadow rounded">
          <p>{n.message}</p>
          <small className="text-gray-500">{new Date(n.created_at).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
};

export default NotificationsPage;
