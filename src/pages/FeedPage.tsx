import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import PostCard from '../components/PostCard';

interface Post {
  id: string;
  title?: string;
  content?: string;
  created_at: string;
  [key: string]: any; // Para campos extra opcionales
}

const FeedPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from<Post>('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching posts:", error);
    } else if (data) {
      setPosts(data);
    }
  };

  useEffect(() => {
    fetchPosts();

    // Suscripción a nuevos posts en tiempo real
    const subscription = supabase
      .from('posts')
      .on('INSERT', () => fetchPosts())
      .subscribe();

    return () => {
      subscription.unsubscribe(); // cleanup correcto
    };
  }, []);

  return (
    <div className="flex flex-col items-center p-4 space-y-4 w-full max-w-xl mx-auto">
      {posts.length === 0 ? (
        <p className="text-gray-400 text-center">No hay posts todavía.</p>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}
    </div>
  );
};

export default FeedPage;
