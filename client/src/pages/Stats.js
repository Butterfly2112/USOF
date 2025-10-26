import React, { useEffect, useState } from 'react';
import api from '../api';
import Loading from '../components/Loading';
import { Link } from 'react-router-dom';

export default function Stats(){
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(()=>{ load(); }, []);

  async function load(){
    setLoading(true); setError(null);
    try{
      const res = await api.get('/stats/overview');
      setData(res.data.stats);
    }catch(e){
      setError(e?.response?.data?.error || e.message || 'Failed to load stats');
    }
    setLoading(false);
  }

  if (loading) return <div><Loading/></div>;
  if (error) return <div style={{color:'var(--muted)'}}><h2>Stats</h2><div style={{color:'red'}}>{error}</div></div>;

  const fileStats = data.fileStats || {};
  const db = data.db || {};
  const posts = fileStats.posts || {};
  const topPosts = Object.keys(posts).map(id=>({ id, views: posts[id] })).sort((a,b)=>b.views-a.views).slice(0,10);
  const totalPostViews = fileStats.totalPostViews || 0;
  const homeViews = fileStats.homeViews || 0;

  return (
    <div>
      <h2>Site statistics</h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,marginBottom:12}}>
        <div className="card">
          <h4>Home views</h4>
          <div style={{fontSize:28,fontWeight:700}}>{homeViews}</div>
        </div>
        <div className="card">
          <h4>Total post views</h4>
          <div style={{fontSize:28,fontWeight:700}}>{totalPostViews}</div>
        </div>
        <div className="card">
          <h4>Users</h4>
          <div style={{fontSize:28,fontWeight:700}}>{db.users ?? 0}</div>
        </div>
        <div className="card">
          <h4>Posts</h4>
          <div style={{fontSize:28,fontWeight:700}}>{db.posts ?? 0}</div>
        </div>
        <div className="card">
          <h4>Comments</h4>
          <div style={{fontSize:28,fontWeight:700}}>{db.comments ?? 0}</div>
        </div>
      </div>

      <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
        <div style={{flex:1}}>
          <div className="card">
            <h3>Top posts by views</h3>
            {topPosts.length === 0 ? <div>No post view data yet</div> : (
              <ol>
                {topPosts.map(p=> (
                  <li key={p.id} style={{marginBottom:8}}>
                    <Link to={`/posts/${p.id}`}>Post #{p.id}</Link>
                    <div style={{display:'inline-block',marginLeft:8,color:'var(--muted)'}}>— {p.views} views</div>
                    <div style={{height:8,background:'rgba(0,0,0,0.06)',borderRadius:6,overflow:'hidden',marginTop:6}}> 
                      <div style={{width: `${Math.round((p.views / (topPosts[0].views || 1)) * 100)}%`,height:'100%',background:'var(--accent)',borderRadius:6}} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        <div style={{width:320}}>
          <div className="card">
            <h3>Quick insights</h3>
            <ul>
              <li>Unique page views tracked in file-based store.</li>
              <li>Top posts reflect only server-side post view increments.</li>
              <li>For more detailed analytics consider integrating Google Analytics or Matomo.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

