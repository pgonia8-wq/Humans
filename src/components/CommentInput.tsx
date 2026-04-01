import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

interface CommentInputProps {
  postId: string;
  userId?: string | null;
}

const CommentInput: React.FC<CommentInputProps> = ({ postId, userId }) => {
  const [comment, setComment] = useState('');

  const handleComment = async () => {
    if (!comment.trim()) return;

    const currentUserId = userId ?? localStorage.getItem("userId");
    if (!currentUserId) return;

    await supabase.from('comments').insert({
      post_id: postId,
      user_id: currentUserId,
      content: comment.trim(),
    });
    setComment('');
  };

  return (
    <div className="flex gap-2 mt-2">
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleComment(); }}
        placeholder="Escribe un comentario..."
        className="flex-1 px-2 py-1 border rounded"
      />
      <button onClick={handleComment} className="px-4 py-1 bg-purple-500 text-white rounded">
        Enviar
      </button>
    </div>
  );
};

export default CommentInput;
