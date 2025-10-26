import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login as loginAction } from '../store/actions/authActions';

export default function Login() {
  const [loginOrEmail, setLoginOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
  await dispatch(loginAction(loginOrEmail, password));
  // Redirect to home page after successful login
  navigate('/');
    } catch (err) {
      alert('Login failed');
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={onSubmit} className="form">
  <label htmlFor="login-identifier">Login or Email</label>
  <input id="login-identifier" name="loginOrEmail" value={loginOrEmail} onChange={e => setLoginOrEmail(e.target.value)} required />
  <label htmlFor="login-password">Password</label>
  <input id="login-password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
  <button type="submit" className="btn primary">Login</button>
        <div style={{marginTop:10}}><a href="/password-reset">Forgot password?</a></div>
      </form>
    </div>
  );
}
