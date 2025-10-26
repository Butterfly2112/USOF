import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api, { setAuthToken } from '../api';

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [data, setData] = useState({ login:'', fullName:'', email:'', password:'', passwordConfirmation:'' });

  const onChange = (k) => (e) => setData(prev => ({ ...prev, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (data.password !== data.passwordConfirmation) return alert('Password and confirmation do not match');
    try {
      const res = await api.post('/auth/register', data);
      if (res.data && res.data.success) {
        // If server returned token, auto-login: persist token and user in localStorage and update api defaults
        const token = res.data.token;
        const user = res.data.user;
        if (token) {
          setAuthToken(token);
          try { localStorage.setItem('usof_token', token); localStorage.setItem('usof_user', JSON.stringify(user)); } catch(e){}
          // update redux auth state
          dispatch({ type: 'LOGIN_SUCCESS', payload: { token, user } });
        }
        // Navigate to profile after registration/login
        navigate(token ? `/profile/${user.id}` : '/login');
      }
    } catch (err) {
      // Prefer detailed server validation messages when available
      const server = err.response?.data;
      if (server) {
        if (server.errors && Array.isArray(server.errors)) {
          // validation errors from express-validator
          const msgs = server.errors.map(x => x.msg || (x.param ? `${x.param} invalid` : JSON.stringify(x))).join('\n');
          return alert('Registration failed:\n' + msgs);
        }
        if (server.error) return alert('Registration failed: ' + server.error);
      }
      alert('Registration failed: ' + (err.message || 'Unknown error'));
    }
  };

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={onSubmit} className="form">
  <label htmlFor="reg-login">Login</label>
  <input id="reg-login" name="login" value={data.login} onChange={onChange('login')} required />
  <label htmlFor="reg-fullname">Full name</label>
  <input id="reg-fullname" name="fullName" value={data.fullName} onChange={onChange('fullName')} required />
    <label htmlFor="reg-email">Email</label>
    <input id="reg-email" name="email" value={data.email} onChange={onChange('email')} required />
    <label htmlFor="reg-password">Password</label>
    <input id="reg-password" name="password" type="password" value={data.password} onChange={onChange('password')} required />
    <label htmlFor="reg-password-confirm">Confirm Password</label>
    <input id="reg-password-confirm" name="passwordConfirmation" type="password" value={data.passwordConfirmation} onChange={onChange('passwordConfirmation')} required />
        <button type="submit" className="btn primary">Register</button>
      </form>
    </div>
  );
}
