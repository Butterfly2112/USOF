import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate, useLocation } from 'react-router-dom';

function useQuery(){
  return new URLSearchParams(useLocation().search);
}

export default function ResetPassword(){
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const query = useQuery();
  const navigate = useNavigate();
  const token = query.get('token') || '';

  useEffect(()=>{
    // if no token present, redirect to forgot page
    if (!token) {
      // leave a short delay so user sees something
      const t = setTimeout(()=> navigate('/password-reset'), 500);
      return ()=>clearTimeout(t);
    }
  }, [token, navigate]);

  async function onSubmit(e){
    e.preventDefault();
    if (password.length < 6) return alert('Password must be at least 6 characters');
    if (password !== confirm) return alert('Password and confirmation do not match');
    try{
      setBusy(true);
      await api.post('/auth/reset-password', { token, newPassword: password });
      setDone(true);
      setTimeout(()=> navigate('/login'), 1500);
    }catch(err){
      const msg = err.response?.data?.error || err.message || 'Failed';
      alert('Failed to reset password: ' + msg);
    }finally{ setBusy(false); }
  }

  return (
    <div className="page">
      <div className="card" style={{maxWidth:560,margin:'20px auto'}}>
        <h2 style={{marginTop:0}}>Set a new password</h2>
        {!token ? (
          <div>Missing reset token. Redirecting to request page...</div>
        ) : done ? (
          <div>
            <p>Password has been reset. Redirecting to login...</p>
          </div>
        ) : (
          <form className="form" onSubmit={onSubmit}>
            <label htmlFor="new-password">New password</label>
            <input id="new-password" name="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
            <label htmlFor="confirm-password">Confirm password</label>
            <input id="confirm-password" name="confirm" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required />
            <button type="submit" className="btn" disabled={busy}>{busy ? 'Saving...' : 'Set password'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
