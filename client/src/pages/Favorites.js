import React, { useEffect, useState } from 'react';
import api from '../api';
import PostCard from '../components/PostCard';
import Loading from '../components/Loading';

export default function Favorites(){
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); api.get('/favorites').then(r=>setFavorites(r.data.favorites)).catch(()=>{}).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); }, []);
  return (
    <div>
      <h2>My Favorites</h2>
      <div className="posts-grid">
        {loading ? <Loading /> : favorites.map(f=> (<PostCard key={f.id} post={f} onChanged={load} />))}
      </div>
    </div>
  );
}
