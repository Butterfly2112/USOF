import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../api';

export default function Categories(){
  const [cats, setCats] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useSelector(s => s.auth);
  const navigate = useNavigate();

  async function load(){
    try{
      const r = await api.get('/categories');
      if (r.data && r.data.categories) setCats(r.data.categories);
    }catch(e){ console.error(e); }
  }

  useEffect(()=>{ load(); }, []);

  function goToCat(id){
    navigate(`/?categories=${id}`);
  }

  async function onCreate(e){
    e.preventDefault();
    if (!auth.user) return alert('You must be logged in to create categories');
    if (!title || !String(title).trim()) return alert('Title required');
    setLoading(true);
    try{
      await api.post('/categories', { title: title.trim(), description: description || '' });
      setTitle(''); setDescription('');
      await load();
      alert('Category created');
    }catch(err){
      console.error(err);
      const msg = err?.response?.data?.error || 'Failed to create category';
      alert(msg);
    }finally{ setLoading(false); }
  }

  return (
    <div>
      <h2>Categories</h2>

      {auth.user ? (
        <form onSubmit={onCreate} style={{display:'flex',gap:8,marginBottom:12}}>
          <input id="category-title" name="title" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} required />
          <input id="category-description" name="description" placeholder="Short description" value={description} onChange={e=>setDescription(e.target.value)} />
          <button className="btn" disabled={loading} type="submit">Create</button>
        </form>
      ) : (
        <div style={{marginBottom:12}}>Login to create a category</div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {cats.map(c => (
          <button key={c.id} className="btn" onClick={()=>goToCat(c.id)}>{c.title} — {String(c.description).substring(0,120)}</button>
        ))}
      </div>
    </div>
  );
}
