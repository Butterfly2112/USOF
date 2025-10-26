import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import Loading from './Loading';
import { hydrateAuth } from '../store/actions/authActions';

export default function PostForm(){
  const { postId } = useParams();
  const auth = useSelector(s=>s.auth);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categories, setCategories] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [images, setImages] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  useEffect(()=>{ if (postId) load(); }, [postId]);
  useEffect(()=>{
    if (!auth.user) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('usof_token') : null;
      if (!token) navigate('/login');
    }
  }, [auth.user]);
  useEffect(()=>{
    // fetch categories for selection
    let mounted = true;
    api.get('/categories').then(r=>{ if(mounted && r.data && r.data.categories) setAvailableCategories(r.data.categories); }).catch(()=>{});
    return ()=>{ mounted = false; };
  }, []);
  async function load(){
    setLoading(true);
    try{
      // Ensure auth is hydrated before fetching (so Authorization header is present)
      if (!auth.user) {
        const token = typeof window !== 'undefined' ? localStorage.getItem('usof_token') : null;
        if (token) {
          try { dispatch(hydrateAuth()); } catch(e) { /* ignore */ }
        }
      }

      let triedHydrate = false;
      while (true) {
        try {
          const res = await api.get(`/posts/${postId}`);
          const p = res.data.post;
          setTitle(p.title||''); setContent(p.content||''); setCategories((p.categories||[]).map(c=>c.id).join(','));
          break;
        } catch (err) {
          const status = err?.response?.status;
          // If 404 and we haven't tried hydrating auth yet, try once more (maybe token wasn't applied)
          if ((status === 404 || status === 401) && !triedHydrate) {
            triedHydrate = true;
            const token = typeof window !== 'undefined' ? localStorage.getItem('usof_token') : null;
            if (token) {
              try { dispatch(hydrateAuth()); } catch(e){}
              // retry the GET
              continue;
            }
          }
          console.error('Failed to load post for edit', err);
          if (status === 404) {
            alert('Post not found or you do not have permission to edit this post');
            navigate('/');
          } else {
            alert('Failed to load post for edit');
          }
          break;
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e){
    e.preventDefault();
    if (!title || title.trim().length < 3) return alert('Title too short');
    if (!content || content.trim().length < 10) return alert('Content too short');
    const cats = categories.split(',').map(x=>x.trim()).filter(Boolean);
    // If user provided a new category name, try to create it (or reuse existing)
    if (newCategory && String(newCategory).trim()) {
      const nc = String(newCategory).trim();
      try {
        const cr = await api.post('/categories', { title: nc });
        if (cr.data && cr.data.success && cr.data.categoryId) {
          cats.push(cr.data.categoryId);
          // optimistically add to available categories list
          setAvailableCategories(prev => {
            // avoid duplicates
            if (prev.find(p => String(p.title).toLowerCase() === nc.toLowerCase())) return prev;
            return [...prev, { id: cr.data.categoryId, title: nc }];
          });
        }
      } catch (err) {
        // If category already exists, try to find it in the availableCategories or refetch
        const serverErr = err.response?.data?.error;
        if (serverErr && serverErr.toLowerCase().includes('already exists')) {
          // find by title (case-insensitive)
          const found = availableCategories.find(p => String(p.title).toLowerCase() === nc.toLowerCase());
          if (found) {
            cats.push(found.id);
          } else {
            try {
              const list = await api.get('/categories');
              const matched = (list.data.categories || []).find(p => String(p.title).toLowerCase() === nc.toLowerCase());
              if (matched) cats.push(matched.id);
            } catch (e) { /* ignore and continue */ }
          }
        } else {
          console.error('Failed to create category', err);
          alert('Failed to create category: ' + (serverErr || err.message));
        }
      }
    }
    try{
      if (images && images.length > 0) {
        // send multipart/form-data for images
        const fd = new FormData();
        fd.append('title', title);
        fd.append('content', content);
        fd.append('status', 'active');
        // send categories as comma-separated string for compatibility
        fd.append('categories', cats.join(','));
        for (const f of images) fd.append('images', f);
        if (postId) {
          await api.patch(`/posts/${postId}`, fd); // allow browser to set Content-Type with boundary
          navigate(`/posts/${postId}`);
        } else {
          const r = await api.post('/posts', fd);
          navigate(`/posts/${r.data.postId}`);
        }
      } else {
        const payload = { title, content, categories: cats };
        if (postId){
          await api.patch(`/posts/${postId}`, payload);
          navigate(`/posts/${postId}`);
        } else {
          const r = await api.post('/posts', payload);
          navigate(`/posts/${r.data.postId}`);
        }
      }
    } catch(err){
      const server = err.response?.data;
      console.error('Post submit failed', err, server);
      alert('Failed to save post: ' + (server?.error || server?.message || err.message || 'Unknown'));
    }
  }

  function onFiles(e){
    const files = Array.from(e.target.files || []);
    setImages(files);
  }

  if (loading) return <Loading />;

  return (
    <div className="page">
      <div className="card" style={{maxWidth:900,margin:'10px auto'}}>
        <div className="page-header">
          <h2 style={{margin:0}}>{postId ? 'Edit Post' : 'Create Post'}</h2>
        </div>
        <form onSubmit={onSubmit} className="form">
  <label htmlFor="post-title">Title</label>
  <input id="post-title" name="title" value={title} onChange={e=>setTitle(e.target.value)} required />
  <label>Content</label>
  <ReactQuill value={content} onChange={setContent} />
        <label>Categories</label>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
          {availableCategories.map(c => (
            <label key={c.id} style={{display:'inline-flex',alignItems:'center',gap:6}}>
              <input name="categories[]" type="checkbox" value={c.id} checked={categories.split(',').map(x=>x.trim()).filter(Boolean).includes(String(c.id))} onChange={e=>{
                const id = String(c.id);
                const cur = categories.split(',').map(x=>x.trim()).filter(Boolean);
                if (e.target.checked) cur.push(id); else {
                  const idx = cur.indexOf(id); if (idx >= 0) cur.splice(idx,1);
                }
                setCategories(cur.join(','));
              }} />
              <span>{c.title}</span>
            </label>
          ))}
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:12}}>
          <input id="new-category" name="newCategory" className="small-input" placeholder="New category" value={newCategory} onChange={e=>setNewCategory(e.target.value)} />
          <button type="button" className="btn small" onClick={async ()=>{
            const nc = (newCategory || '').trim();
            if (!nc) return alert('Enter category title');
            try {
              const res = await api.post('/categories', { title: nc });
              if (res.data && res.data.success && res.data.categoryId) {
                const id = res.data.categoryId;
                // add to available and select it
                setAvailableCategories(prev => [...prev, { id, title: nc }]);
                const cur = categories.split(',').map(x=>x.trim()).filter(Boolean);
                if (!cur.includes(String(id))) cur.push(String(id));
                setCategories(cur.join(','));
                setNewCategory('');
              }
            } catch (err) {
              const serverErr = err.response?.data?.error;
              if (serverErr && serverErr.toLowerCase().includes('already exists')) {
                // find existing and select
                try {
                  const list = await api.get('/categories');
                  setAvailableCategories(list.data.categories || []);
                  const found = (list.data.categories || []).find(p => String(p.title).toLowerCase() === nc.toLowerCase());
                  if (found) {
                    const cur = categories.split(',').map(x=>x.trim()).filter(Boolean);
                    if (!cur.includes(String(found.id))) cur.push(String(found.id));
                    setCategories(cur.join(','));
                    setNewCategory('');
                  }
                } catch (e) { console.error(e); alert('Failed to refresh categories'); }
              } else {
                console.error('Failed to create category', err);
                alert(serverErr || 'Failed to create category');
              }
            }
          }}>Add</button>
        </div>
        <label>Images (optional)</label>
        <div className="file-input-row">
          <input ref={fileInputRef} id="images" type="file" accept="image/*" multiple onChange={onFiles} style={{display:'none'}} />
          <button type="button" className="btn small" onClick={()=>fileInputRef.current && fileInputRef.current.click()}>Вибрати файли</button>
          <div className="file-input-meta">{images && images.length > 0 ? `${images.length} file(s) selected` : 'Файл не вибрано'}</div>
        </div>
              {images && images.length > 0 && (
          <div style={{display:'flex',gap:8,marginTop:8}}>
            {images.map((f,i)=> (
              <div key={i} style={{width:80,height:60,overflow:'hidden',border:'1px solid #ddd'}}>
                <img src={URL.createObjectURL(f)} alt="preview" style={{width:'100%'}} />
              </div>
            ))}
          </div>
        )}
              <button type="submit" className="btn">Save</button>
        </form>
      </div>
    </div>
  );
}
