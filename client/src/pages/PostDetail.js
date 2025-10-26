import React, { useEffect, useState, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { useSelector } from 'react-redux';
import { ThemeContext } from '../theme';
import Comment from '../components/Comment';
import Loading from '../components/Loading';

export default function PostDetail(){
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const auth = useSelector(s=>s.auth);
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [showShare, setShowShare] = useState(false);

  useEffect(()=>{ load(); }, [postId]);
  async function load(){
    setLoading(true);
    try{
      const res = await api.get(`/posts/${postId}`);
      const p = res.data.post;
      // Client-side normalization fallback: ensure image srcs use forward slashes and have a leading slash
      try {
        if (p && p.content) {
          p.content = String(p.content).replace(/src=["']?([^"'\s>]+)["']?/gi, (m, g1) => {
            let fixed = String(g1).replace(/\\/g, '/');
            if (!fixed.startsWith('/') && !/^https?:\/\//i.test(fixed)) fixed = '/' + fixed;
            return `src="${fixed}"`;
          });
        }
        if (p && Array.isArray(p.images)) {
          p.images = p.images.map(s => {
            if (!s) return s;
            let fixed = String(s).replace(/\\/g, '/');
            if (!fixed.startsWith('/') && !/^https?:\/\//i.test(fixed)) fixed = '/' + fixed;
            return fixed;
          });
        }
      } catch (e) { /* ignore */ }
      setPost(p);
      const c = await api.get(`/posts/${postId}/comments`);
      // build tree structure from flat comment list
      const flat = c.data.comments || [];
      const map = {};
      flat.forEach(cm => { map[cm.id] = { ...cm, children: [] }; });
      const roots = [];
      for (const id in map) {
        const node = map[id];
        if (node.parent_id && map[node.parent_id]) {
          map[node.parent_id].children.push(node);
        } else {
          roots.push(node);
        }
      }
      setComments(roots);
    }catch(err){ console.error(err); }
    setLoading(false);
  }

  async function onAddComment(e){
    e.preventDefault();
    if (!auth.user) return; // guests are read-only
    try{
      const res = await api.post(`/posts/${postId}/comments`, { content: commentText });
      setCommentText('');
      load();
    }catch(err){ alert('Failed to add comment'); }
  }

  async function onLike(){
    if (!auth.user) return; // guests are read-only
    try{
      await api.post(`/posts/${postId}/like`, { type: 'like' });
      load();
    }catch(err){ console.error(err); }
  }

  async function onDislike(){
    if (!auth.user) return;
    try{
      await api.post(`/posts/${postId}/like`, { type: 'dislike' });
      load();
    }catch(err){ console.error(err); }
  }

  async function onFavorite(){
    if (!auth.user) return; // guests are read-only
    try{
      const wasFav = Boolean(post && post.favorited_at);
      // optimistic update
      setPost(prev => ({ ...prev, favorited_at: wasFav ? null : (new Date()).toISOString() }));
      if (wasFav) {
        await api.delete(`/favorites/${postId}`);
      } else {
        await api.post(`/favorites/${postId}`);
      }
      // refresh authoritative state
      load();
    }catch(e){
      console.error(e);
      // revert optimistic change on error
      try{ const r = await api.get(`/posts/${postId}`); setPost(r.data.post); }catch(_){}
    }
  }

  async function onSubscribe(){
    if (!auth.user) return; // guests are read-only
    try{ await api.post(`/subscriptions/${postId}`); load(); }catch(e){ console.error(e); }
  }

  async function onDelete(){
    if (!auth.user) return; // should be guarded
    try{
      await api.delete(`/posts/${postId}`);
      navigate('/');
    }catch(err){ alert('Delete failed'); }
  }

  function openLightbox(src){
    setLightboxSrc(src);
    setZoom(1);
  }

  function closeLightbox(){
    setLightboxSrc(null);
    setZoom(1);
  }

  useEffect(()=>{
    function onKey(e){ if (e.key === 'Escape') closeLightbox(); }
    if (lightboxSrc) document.addEventListener('keydown', onKey);
    return ()=> document.removeEventListener('keydown', onKey);
  }, [lightboxSrc]);

  // Zoom handlers (wheel and double-click only)
  function changeZoom(delta){
    setZoom(prev => {
      return Math.min(4, Math.max(1, +(prev + delta).toFixed(2)));
    });
  }

  function onWheelZoom(e){
    if (!lightboxSrc) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    changeZoom(delta);
  }

  function onImgDoubleClick(){
    if (zoom === 1) setZoom(2);
    else setZoom(1);
  }

  if (loading || !post) return <div><Loading /></div>;

  return (
    <div>
      <div className="post-detail">
        <h2>{post.title}</h2>
        <div className="meta">By <Link to={`/profile/${post.author_id}`}>{post.authorLogin}</Link> • {new Date(post.publish_date).toLocaleString()}</div>
  {/* Render content without inline <img> tags to avoid duplicates — images are shown below */}
  <div className="content" dangerouslySetInnerHTML={{ __html: (post.content || '').replace(/<img[^>]*>/gi, '') }} />

  {post.images && post.images.length > 0 && (
    <div className="post-images" style={{display:'flex',gap:8,marginBottom:12}}>
      {post.images.map((src,i)=> (
        <div key={i} style={{maxWidth:220,overflow:'hidden',borderRadius:8,cursor:'pointer'}}>
          <img src={src} alt={`img-${i}`} style={{width:'100%',display:'block'}} onClick={()=>openLightbox(src)} />
        </div>
      ))}
    </div>
  )}

  {/* Lightbox overlay */}
  {lightboxSrc && (
    <div className="lightbox-overlay" onClick={closeLightbox}>
      <div className="lightbox-inner" onClick={e=>e.stopPropagation()} onWheel={onWheelZoom}>
        <img
          className="lightbox-img"
          src={lightboxSrc}
          alt="full"
          onDoubleClick={onImgDoubleClick}
          style={ zoom === 1 ? { cursor: 'zoom-in', maxWidth: '100%', maxHeight: '80vh' } : { cursor: 'zoom-out', width: `${zoom * 100}%` } }
        />
      </div>
    </div>
  )}

        <div className="categories">Categories: {post.categories && post.categories.map(c=>c.title).join(', ')}</div>

        <div className="actions action-row">
          <div className="action-left">
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
                      <button className="btn reaction-inline" onClick={onLike} title="Like">
                        <img className="like-icon" src={likeSrc} alt="like" width="18" height="18" />
                        <span className="count">{post.likesCount || post.likes_count || 0}</span>
                      </button>
                      <button className="btn reaction-inline" onClick={onDislike} title="Dislike">
                        <img className="dislike-icon" src={dislikeSrc} alt="dislike" width="18" height="18" />
                        <span className="count">{post.dislikesCount || post.dislikes_count || 0}</span>
                      </button>
                    </>
                  );
                })()}
                <button type="button" className={"btn fav-inline" + (post.favorited_at ? ' filled' : '')} onClick={(e)=>{ e.stopPropagation(); onFavorite(); }} title="Toggle favorite" aria-pressed={post.favorited_at ? 'true' : 'false'}>
                  {post.favorited_at ? '★' : '☆'}
                </button>
                <button className="subscribe-inline" onClick={async ()=>{
                  if (!auth.user) return;
                  try{
                    if (post.is_subscribed) await api.delete(`/subscriptions/${postId}`);
                    else await api.post(`/subscriptions/${postId}`);
                    load();
                  }catch(e){ console.error(e); }
                }} title="Subscribe">
                  {post.is_subscribed ? `Subscribed (${post.subscribers_count || 0})` : `Subscribe (${post.subscribers_count || 0})`}
                </button>
                <div className="share-wrapper">
                  <button className="btn share-btn" onClick={()=>setShowShare(s=>!s)}>Share</button>
                  {showShare && (
                      <div className="share-menu" role="menu">
                        {(() => {
                          const url = window.location.origin + `/posts/${postId}`;
                          const title = post.title || '';
                          async function shareViaWeb(data){ if (navigator.share){ try{ await navigator.share(data); return true; }catch(e){ return false; } } return false; }
                          const doFacebook = ()=>{ window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,'_blank','noopener'); setShowShare(false); };
                          const doTelegram = ()=>{ window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,'_blank','noopener'); setShowShare(false); };
                          const doInstagram = async ()=>{
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
              </>
            ) : null}
          </div>

          <div className="action-right">
            {auth.user && (auth.user.id === post.author_id || auth.user.role === 'admin') && (
              <>
                <Link to={`/posts/${postId}/edit`} className="btn small">Edit</Link>
                <button onClick={onDelete} className="btn danger small">Delete</button>
              </>
            )}
          </div>
        </div>
      </div>

      <section className="comments">
        <h3>Comments</h3>
        {comments.map(c=> (
          <Comment key={c.id} comment={c} onRefresh={load} />
        ))}

        {auth.user ? (
          <form onSubmit={onAddComment} className="form comment-form">
            <textarea id="comment" name="comment" value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Add a comment" required aria-label="Add a comment" />
            <button type="submit" className="btn primary">Post Comment</button>
          </form>
        ) : (
          <div className="comment-readonly">Login to post comments</div>
        )}
      </section>
    </div>
  );
}
