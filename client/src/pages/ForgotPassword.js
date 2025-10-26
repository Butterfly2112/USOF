import React, { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword(){
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e){
    e.preventDefault();
    try{
      await api.post('/auth/password-reset', { email });
      setSent(true);
    }catch(err){
      const msg = err.response?.data?.error || err.message || 'Failed';
      alert('Failed to request password reset: ' + msg);
    }
  }

  return (
    <div className="page">
      <div className="card" style={{maxWidth:560,margin:'20px auto'}}>
        <h2 style={{marginTop:0}}>Reset password</h2>
        {sent ? (
          <div>
            <p>If the email exists in our system, a reset link has been sent. Please check your inbox.</p>
            <p>If you didn't receive an email, try again or contact the administrator.</p>
            <button className="btn" onClick={()=>navigate('/')}>Back to home</button>
          </div>
        ) : (
          <form className="form" onSubmit={onSubmit}>
            <label htmlFor="forgot-email">Email</label>
            <input id="forgot-email" name="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
            <button type="submit" className="btn">Send reset link</button>
          </form>
        )}
      </div>
    </div>
  );
}
