import React, { useEffect, useState, useContext } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';
import Pagination from '../components/Pagination';
import { ThemeContext } from '../theme';

export default function Users(){
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [sort, setSort] = useState('rating');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ load(); }, [q, role, sort, page, pageSize]);

  async function load(){
    setLoading(true);
    try{
      const params = { q: q || undefined, role: role || undefined, sort, page, pageSize };
      const res = await api.get('/users', { params });
      if (res.data && res.data.success){
        setUsers(res.data.users || []);
        setTotal(res.data.total || 0);
      } else {
        setUsers([]); setTotal(0);
      }
    }catch(e){ console.error(e); setUsers([]); setTotal(0); }
    setLoading(false);
  }

  const { theme } = useContext(ThemeContext);
  const defaultAvatar = theme === 'light' ? '/default_avatar_pink.svg' : '/default_avatar_purple.svg';

  return (
    <div>
      <div className="page-header">
        <h2>Users</h2>
        <div className="filters-bar">
          <input id="users-q" name="q" className="form-input" placeholder="Search users..." value={q} onChange={e=>{ setQ(e.target.value); setPage(1); }} />
          <label>Role:</label>
          <select name="role" value={role} onChange={e=>{ setRole(e.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="user">Users</option>
            <option value="admin">Admins</option>
          </select>
          <label>Sort:</label>
          <select name="sort" value={sort} onChange={e=>{ setSort(e.target.value); setPage(1); }}>
            <option value="rating">By rating</option>
            <option value="new">Newest</option>
          </select>
          <label>Per page:</label>
          <select name="pageSize" value={pageSize} onChange={e=>{ setPageSize(Number(e.target.value)); setPage(1); }}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {loading ? <div>Loading...</div> : (
        <div>
          <div className="users-grid">
            {users.map(u => (
              <div key={u.id} className="user-card">
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <img src={u.profilePicture || defaultAvatar} alt="avatar" />
                  <div>
                    <Link to={`/profile/${u.id}`}><strong>{u.login}</strong></Link>
                    <div className="meta">{u.fullName}</div>
                  </div>
                </div>
                <div style={{marginTop:8,fontSize:13}}>
                  <strong>Rating:</strong> {u.rating || 0}
                </div>
                  <div style={{marginTop:6,fontSize:12,color:'var(--muted)'}}>Role: {u.role || 'user'}</div>
                  {u.role === 'admin' && u.email && (
                    <div style={{marginTop:6,fontSize:13}}><strong>Email:</strong> {u.email}</div>
                  )}
              </div>
            ))}
          </div>

          <div style={{marginTop:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>Showing {users.length} of {total}</div>
              <Pagination page={page} pageSize={pageSize} total={total} onChange={(p)=> setPage(p)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
