import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useSelector } from 'react-redux';
import { ThemeContext } from '../theme';
// simplified: remove ReactionPicker per user request; keep simple like/dislike

export default function PostCard({ post, onChanged, previewLength: previewOverride }){
  const auth = useSelector(s=>s.auth);
  const pageSize = useSelector(s => s.posts.pageSize || 10);
  const navigate = useNavigate();
  const [statePost, setStatePost] = useState(post);
  const [showShare, setShowShare] = useState(false);

  function stripHtml(html){
    if (!html) return '';
    return html.replace(/<[^>]+>/g, '');
  }

  // determine preview length based on current pagination pageSize
  // larger page sizes -> shorter previews so more posts fit on screen
  const computedPreviewLength = previewOverride || Math.max(80, Math.min(400, Math.round(200 * (10 / (Number(pageSize) || 10)))));

  async function onLike(){
    if (!auth.user) return; // guests are read-only
    try{
      await api.post(`/posts/${statePost.id}/like`, { type: 'like' });
      const res = await api.get(`/posts/${statePost.id}`);
      setStatePost(res.data.post);
      if (typeof onChanged === 'function') onChanged();
    }catch(e){ console.error(e); }
  }

  async function onDislike(){
    if (!auth.user) return;
    try{
      await api.post(`/posts/${statePost.id}/like`, { type: 'dislike' });
      const res = await api.get(`/posts/${statePost.id}`);
      setStatePost(res.data.post);
      if (typeof onChanged === 'function') onChanged();
    }catch(e){ console.error(e); }
  }

  async function onFavorite(){
    if (!auth.user) return; // guests are read-only
    try{
      // Optimistic UI: flip local favorited state immediately so the star becomes filled
      // and then call the server. If server fails, revert and show error.
      const wasFav = Boolean(statePost.favorited_at);
      // optimistic update
      setStatePost(prev => ({ ...prev, favorited_at: wasFav ? null : (new Date()).toISOString() }));
      try {
        if (wasFav) {
          await api.delete(`/favorites/${statePost.id}`);
        } else {
          await api.post(`/favorites/${statePost.id}`);
        }
        if (typeof onChanged === 'function') onChanged();
      } catch (err) {
        // revert optimistic change
        setStatePost(prev => ({ ...prev, favorited_at: wasFav ? (new Date()).toISOString() : null }));
        console.error(err);
      }
    }catch(e){ console.error(e); }
  }

  return (
    <article className="post-card">
      <h3><Link to={`/posts/${statePost.id}`}>{statePost.title}</Link></h3>
      {statePost.categories && statePost.categories.length > 0 && (
        <div className="badges">
          {statePost.categories.map(c => (<span key={c.id} className="badge">{c.title}</span>))}
        </div>
      )}
  <div className="meta">By { (statePost.authorName || statePost.authorLogin || 'Unknown') } • {new Date(statePost.publish_date).toLocaleString()}</div>
  {/* Ensure every post has a preview. If no content is available, fall back to title excerpt. Preview length scales with pageSize. */}
  <p className="preview">
    {(() => {
      const raw = statePost.content ? stripHtml(statePost.content) : (statePost.title || 'No preview available');
      const short = raw.substring(0, computedPreviewLength);
      return short + (raw.length > computedPreviewLength ? '...' : '');
    })()}
  </p>
  <div className="post-footer">
      <div className="footer-top">
        {(() => {
          const { theme } = useContext(ThemeContext);
          const likeSrcLight = 'https://img.icons8.com/ios-glyphs/30/like--v1.png';
          const dislikeSrcLight = 'https://img.icons8.com/forma-regular-filled-sharp/24/dislike.png';
          // Dark-theme icons provided by user
          const likeSrcDark = 'https://img.icons8.com/material-rounded/24/FFFFFF/like--v1.png';
          const dislikeSrcDark = 'https://img.icons8.com/material-sharp/24/FFFFFF/dislike.png';
          const likeSrc = theme === 'dark' ? likeSrcDark : likeSrcLight;
          const dislikeSrc = theme === 'dark' ? dislikeSrcDark : dislikeSrcLight;
          return (
            <>
              <button className="btn reaction-inline" onClick={onLike} title="Like">
                <img className="like-icon" src={likeSrc} alt="like" width="20" height="20" />
                <span className="count">{statePost.likes_count ?? statePost.likesCount ?? 0}</span>
              </button>
              <button className="btn reaction-inline" onClick={onDislike} title="Dislike">
                <img className="dislike-icon" src={dislikeSrc} alt="dislike" width="20" height="20" />
                <span className="count">{statePost.dislikes_count ?? 0}</span>
              </button>
            </>
          );
        })()}
        {statePost.status && (<div className="status-inline">{statePost.status}</div>)}
  {typeof post.rating !== 'undefined' && (<div className="rating-inline">Rating: {statePost.rating}</div>)}
        <button type="button" className={"btn fav-inline" + (statePost.favorited_at ? ' filled' : '')} onClick={(e)=>{ e.stopPropagation(); onFavorite(); }} title="Toggle favorite" aria-pressed={statePost.favorited_at ? 'true' : 'false'}>
          {statePost.favorited_at ? '★' : '☆'}
        </button>
      </div>
      <div className="footer-bottom">
        {auth.user ? (
          <div className="share-wrapper">
            <button className="btn share-btn" onClick={()=>setShowShare(s=>!s)}>Share</button>
            {showShare && (
              <div className="share-menu" role="menu">
                {(() => {
                  const url = window.location.origin + `/posts/${statePost.id}`;
                  const title = statePost.title || '';
                  async function shareViaWeb(data){
                    if (navigator.share){
                      try{ await navigator.share(data); return true; }catch(e){ return false; }
                    }
                    return false;
                  }
                  const doFacebook = ()=>{ window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,'_blank','noopener'); setShowShare(false); };
                  const doTelegram = ()=>{ window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,'_blank','noopener'); setShowShare(false); };
                  const doInstagram = async ()=>{
                    // Instagram doesn't support web share of URLs directly. Use Web Share API if available (opens native share sheet where Instagram may be selected).
                    const ok = await shareViaWeb({ title, text: title, url });
                    if (!ok){ try{ await navigator.clipboard.writeText(url); alert('Link copied to clipboard. Open Instagram app and paste the link in a new post.'); }catch(e){ prompt('Copy link', url); } }
                    setShowShare(false);
                  };
                  const doCopy = async ()=>{ try{ await navigator.clipboard.writeText(url); alert('Link copied to clipboard'); }catch(e){ prompt('Copy link', url); } setShowShare(false); };
                  return (
                    <>
                      <button type="button" onClick={doFacebook} title="Share on Facebook">Facebook</button>
                      <button type="button" onClick={doInstagram} title="Share on Instagram">Instagram</button>
                      <button type="button" onClick={doTelegram} title="Share on Telegram">Telegram</button>
                      <button type="button" onClick={doCopy} title="Copy link">Copy link</button>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        ) : (
          <div className="share-placeholder">Share</div>
        )}
      </div>
    </div>
    </article>
  );
}
