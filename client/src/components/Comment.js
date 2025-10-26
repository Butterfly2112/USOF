import React, { useState, useContext } from 'react';
import api from '../api';
import { useSelector } from 'react-redux';
import { ThemeContext } from '../theme';
// Use simple like/dislike controls with counts

export default function Comment({ comment, onRefresh, depth = 0 }){
  const auth = useSelector(s=>s.auth);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const { theme } = useContext(ThemeContext);

  async function toggleLike(){
    if (!auth.user) return; // guests are read-only
    try{
      // default to 'like' if user pressed legacy button
      await api.post(`/comments/${comment.id}/like`, { type: 'like' });
      onRefresh();
    }catch(err){ console.error(err); }
  }

  async function toggleDislike(){
    if (!auth.user) return; // guests are read-only
    try{
      await api.post(`/comments/${comment.id}/like`, { type: 'dislike' });
      onRefresh();
    }catch(err){ console.error(err); }
  }

  async function postReply(e){
    e.preventDefault();
    if (!auth.user) return; // guests are read-only
    try{
      // Post reply and include parentCommentId so backend links it
      await api.post(`/posts/${comment.post_id}/comments`, { content: replyText, parentCommentId: comment.id });
      setReplyText(''); setReplyOpen(false);
      onRefresh();
    }catch(err){ console.error(err); }
  }

  async function onStartEdit(){
    setEditText(comment.content || '');
    setEditing(true);
  }

  async function onCancelEdit(){
    setEditing(false);
    setEditText('');
  }

  async function onSaveEdit(e){
    e.preventDefault();
    if (!auth.user) return;
    try{
      await api.patch(`/comments/${comment.id}`, { content: editText });
      setEditing(false);
      setEditText('');
      onRefresh();
    }catch(err){ console.error('Failed to save comment edit', err); alert('Failed to save comment'); }
  }

  async function onDelete(){
    if (!auth.user) return;
    if (!window.confirm('Delete this comment?')) return;
    try{
      await api.delete(`/comments/${comment.id}`);
      onRefresh();
    }catch(err){ console.error('Failed to delete comment', err); alert('Failed to delete comment'); }
  }

  return (
    <div className="comment" style={{ marginLeft: depth ? depth * 18 : 0 }}>
      <div className="comment-meta">{comment.authorLogin} • {new Date(comment.publish_date).toLocaleString()}</div>
      {comment.parent_id && comment.parent_author_login && (
        <div className="comment-reply-to">Replying to <strong>{comment.parent_author_login}</strong>: <em>{comment.parent_excerpt}</em></div>
      )}
      <div className="comment-content">{comment.content}</div>
      <div className="comment-actions">
        {auth.user ? (
          <>
            {(() => {
              const likeSrcLight = 'https://img.icons8.com/ios-glyphs/30/like--v1.png';
              const dislikeSrcLight = 'https://img.icons8.com/forma-regular-filled-sharp/24/dislike.png';
              const likeSrcDark = 'https://img.icons8.com/material-rounded/24/FFFFFF/like--v1.png';
              const dislikeSrcDark = 'https://img.icons8.com/material-sharp/24/FFFFFF/dislike.png';
              const likeSrc = theme === 'dark' ? likeSrcDark : likeSrcLight;
              const dislikeSrc = theme === 'dark' ? dislikeSrcDark : dislikeSrcLight;
              return (
                <>
                  <button className="btn reaction-inline" onClick={toggleLike} title="Like">
                    <img className="like-icon" src={likeSrc} alt="like" width="18" height="18" />
                    <span className="count">{comment.likes_count ?? 0}</span>
                  </button>
                  <button className="btn reaction-inline" onClick={toggleDislike} title="Dislike">
                    <img className="dislike-icon" src={dislikeSrc} alt="dislike" width="18" height="18" />
                    <span className="count">{comment.dislikes_count ?? 0}</span>
                  </button>
                </>
              );
            })()}
            <button className="btn" onClick={()=>setReplyOpen(s=>!s)}>Reply</button>
            {(auth.user.id === comment.author_id || auth.user.role === 'admin') && (
              <>
                <button className="btn" onClick={onStartEdit}>Edit</button>
                <button onClick={onDelete} className="btn danger">Delete</button>
              </>
            )}
          </>
        ) : null}
      </div>
      {replyOpen && auth.user && (
        <form onSubmit={postReply} className="form reply-form">
          <label htmlFor={"reply-" + comment.id} style={{fontWeight:700,marginBottom:6}}>Add a comment</label>
          <textarea id={"reply-" + comment.id} name={"reply-" + comment.id} value={replyText} onChange={e=>setReplyText(e.target.value)} required aria-label={`Reply to comment ${comment.id}`} />
          <div style={{marginTop:8}}>
            <button type="submit" className="btn primary">Post Comment</button>
          </div>
        </form>
      )}

      {editing && auth.user && (
        <form onSubmit={onSaveEdit} className="form edit-comment-form">
          <textarea id={"edit-" + comment.id} name={"edit-" + comment.id} value={editText} onChange={e=>setEditText(e.target.value)} required aria-label={`Edit comment ${comment.id}`} />
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button type="submit" className="btn primary">Save</button>
            <button type="button" onClick={onCancelEdit} className="btn ghost">Cancel</button>
          </div>
        </form>
      )}
      {/* render child replies recursively if present */}
      {comment.children && comment.children.length > 0 && (
        <div className="comment-children">
          {comment.children.map(child => (
            <Comment key={child.id} comment={child} onRefresh={onRefresh} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
