import React, { useEffect, useState, useContext, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import api from '../api';
import CategoryFilter from '../components/CategoryFilter';
import { ThemeContext } from '../theme';

export default function Profile() {
  const { userId } = useParams();
  const auth = useSelector(s => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // controls for listing user's posts
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('date');
  const [pageSize, setPageSize] = useState(10);

  // profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editLogin, setEditLogin] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await api.get(`/users/${userId}`);
      setUser(res.data.user);
      const params = { page: 1, pageSize, sort };
      // If viewing own profile, allow fetching inactive posts too and request server-side author filter
      if (auth.user && Number(auth.user.id) === Number(userId)) {
        params.includeInactive = 'true';
        params.authorId = userId;
      } else {
        params.status = 'active';
        params.authorId = userId; // prefer server-side filter for author
      }
      if (category) params.categories = category;
      const p = await api.get('/posts', { params });
      setPosts(p.data.posts || []);
      setLoading(false);
    }
    load();
  }, [userId, category, sort, pageSize]);

  // Refresh profile/posts when tab becomes visible
  useEffect(()=>{
    function onVis(){
      if (document.visibilityState === 'visible'){
        (async ()=>{
          setLoading(true);
          try{
            const res = await api.get(`/users/${userId}`);
            setUser(res.data.user);
            const params = { page: 1, pageSize, sort };
            if (auth.user && Number(auth.user.id) === Number(userId)) {
              params.includeInactive = 'true';
              params.authorId = userId;
            } else {
              params.status = 'active';
              params.authorId = userId;
            }
            if (category) params.categories = category;
            const p = await api.get('/posts', { params });
            setPosts(p.data.posts || []);
          }catch(e){ console.error(e); }
          setLoading(false);
        })();
      }
    }
    document.addEventListener('visibilitychange', onVis);
    return ()=> document.removeEventListener('visibilitychange', onVis);
  }, [userId, category, sort, pageSize]);

  async function refreshPosts() {
    setLoading(true);
    try{
      const params = { page: 1, pageSize, sort };
      if (auth.user && Number(auth.user.id) === Number(userId)) {
        params.includeInactive = 'true';
        params.authorId = userId;
      } else {
        params.status = 'active';
        params.authorId = userId;
      }
      if (category) params.categories = category;
      const p = await api.get('/posts', { params });
      setPosts(p.data.posts || []);
    }catch(e){ console.error(e); }
    setLoading(false);
  }

  async function togglePostStatus(post) {
    try {
      const newStatus = post.status === 'active' ? 'inactive' : 'active';
      await api.patch(`/posts/${post.id}`, { status: newStatus });
      // refresh posts list
      await refreshPosts();
    } catch (e) {
      console.error(e);
      alert('Failed to change status');
    }
  }

  useEffect(() => {
    if (user && auth.user && Number(auth.user.id) === Number(userId)){
      setEditFullName(user.fullName || '');
      setEditLogin(user.login || '');
    }
  }, [user, auth.user, userId]);

  const { theme } = useContext(ThemeContext);
  const defaultAvatar = theme === 'light' ? '/default_avatar_pink.svg' : '/default_avatar_purple.svg';

  if (loading || !user) return <div>Loading...</div>;

  const isOwn = auth.user && Number(auth.user.id) === Number(userId);

  async function onSaveProfile(e){
    e.preventDefault();
    try{
      const fd = new FormData();
      fd.append('fullName', editFullName);
      fd.append('login', editLogin);
      if (avatarFile) fd.append('profilePicture', avatarFile);
      await api.patch(`/users/${userId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const res = await api.get(`/users/${userId}`);
      setUser(res.data.user);
      // If the current logged-in user updated their own profile, update the auth state + localStorage
      if (auth.user && Number(auth.user.id) === Number(userId)) {
        try {
          const updatedUser = res.data.user;
          // preserve token
          const token = auth.token;
          // persist to localStorage and update redux
          localStorage.setItem('usof_user', JSON.stringify(updatedUser));
          dispatch({ type: 'LOGIN_SUCCESS', payload: { token, user: updatedUser } });
        } catch(e) { console.error('Failed to update local auth state', e); }
      }
      setEditingProfile(false);
    }catch(err){
      console.error(err);
      const message = err?.response?.data?.error || 'Failed to save profile';
      alert(message);
    }
  }

  function onAvatarChange(e){ setAvatarFile(e.target.files && e.target.files[0]); }

  return (
    <div>
      <h2>{user.login} — Profile</h2>
      <div className="profile">
  <img src={user.profilePicture || defaultAvatar} alt="avatar" className="profile-avatar" />
        <div className="profile-info">
          <div><strong>Full name:</strong> {user.fullName}</div>
          <div><strong>Rating:</strong> {user.rating}</div>
          {user.role === 'admin' && (
            <div><strong>Email:</strong> {user.email}</div>
          )}
        </div>
      </div>

      {isOwn && (
        <div style={{marginTop:12}}>
          <button onClick={()=>setEditingProfile(s=>!s)} className="btn">{editingProfile ? 'Cancel' : 'Edit profile'}</button>
          {editingProfile && (
            <form onSubmit={onSaveProfile} className="form" style={{marginTop:12}}>
              <div>
                <label htmlFor="profile-fullname">Full name</label>
                <input id="profile-fullname" name="fullName" className="form-input" value={editFullName} onChange={e=>setEditFullName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="profile-login">Login</label>
                <input id="profile-login" name="login" className="form-input" value={editLogin} onChange={e=>setEditLogin(e.target.value)} />
              </div>
              {/* Email is hidden in profile edit for privacy; only admins can view emails on profiles */}
              <div>
                <label>Avatar (optional)</label>
                <div className="file-input-row">
                  {/* hidden native file input; use custom button so browser's default 'No file chosen' text isn't shown twice */}
                  <input ref={fileInputRef} id="avatar" type="file" accept="image/*" onChange={onAvatarChange} style={{display:'none'}} />
                  <button type="button" className="btn" onClick={()=>fileInputRef.current && fileInputRef.current.click()}>Choose file</button>
                  <div className="file-input-meta">{avatarFile ? avatarFile.name : 'Файл не вибрано'}</div>
                </div>
              </div>
              <div style={{marginTop:8}} className="card">
                <button type="submit" className="btn primary">Save changes</button>
              </div>
            </form>
          )}
        </div>
      )}

      <h3 style={{marginTop:20}}>User posts</h3>
        <div className="filters-bar" style={{marginBottom:12}}>
        <CategoryFilter value={category} onChange={setCategory} />
        <label htmlFor="profile-sort">Sort:</label>
        <select id="profile-sort" name="sort" value={sort} onChange={e=>setSort(e.target.value)}>
          <option value="date">Newest</option>
          <option value="likes">Most liked</option>
        </select>
        <label htmlFor="profile-perpage">Per page:</label>
        <select id="profile-perpage" name="pageSize" value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}>
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
        </select>
      </div>

      <div className="posts-grid">
        {posts.map(p => (
          <div key={p.id} className="post-card">
            <h4><Link to={`/posts/${p.id}`}>{p.title}</Link></h4>
            <div className="meta">{new Date(p.publish_date).toLocaleString()}</div>
            <p className="preview">{(p.content || '').replace(/<[^>]+>/g, '').substring(0, 200)}{(p.content||'').length > 200 ? '...' : ''}</p>
            <div style={{marginTop:8, display: 'flex', gap: 8}}>
              {isOwn && (
                <>
                  {/* Use a button for navigation so anchor/button styles match exactly */}
                  <button className="btn" onClick={()=>navigate(`/posts/${p.id}/edit`)}>Edit post</button>
                  <button className="btn" onClick={()=>togglePostStatus(p)}>
                    {p.status === 'active' ? 'Make inactive' : 'Make active'}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
