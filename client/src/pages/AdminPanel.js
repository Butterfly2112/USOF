import React, { useEffect, useState } from 'react';
import api from '../api';

export default function AdminPanel(){
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load(){
    setLoading(true);
    try{ const r = await api.get('/users'); setUsers(r.data.users || []); }catch(e){}
    setLoading(false);
  }
  useEffect(()=>{ load(); }, []);

  async function removeUser(id){
    if (!confirm('Delete user?')) return;
    try{ await api.delete(`/users/${id}`); load(); }catch(e){ alert('Delete failed'); }
  }

  async function toggleRole(user){
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try{ await api.patch(`/users/${user.id}`, { role: newRole }); load(); }catch(e){ alert('Update failed'); }
  }
  return (
    <div>
      <h2>Admin Panel</h2>
      {loading ? <div>Loading...</div> : (
      <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr><th>ID</th><th>Login</th><th>Email</th><th>Role</th></tr></thead>
        <tbody>
          {users.map(u=> (
            <tr key={u.id} style={{borderTop:'1px solid #eee'}}>
              <td>{u.id}</td>
              <td>{u.login}</td>
              <td>{u.email}</td>
              <td>
                {u.role}
                <button onClick={()=>toggleRole(u)} style={{marginLeft:8}}>Toggle</button>
                <button onClick={()=>removeUser(u.id)} style={{marginLeft:8,color:'#fff',background:'#f33'}}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>)}
    </div>
  );
}
