import React, { useState, useContext } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import { ThemeContext } from '../theme';
import { logout } from '../store/actions/authActions';

export default function Header() {
  const auth = useSelector(s => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const { theme } = useContext(ThemeContext);

  const onLogout = () => {
    dispatch(logout());
    navigate('/');
  };
  return (
    <>
      <header className="top-header">
        <div className="brand"><Link to="/">USOF Books</Link></div>
        <div className="search">
            <form onSubmit={(e)=>{ e.preventDefault(); if((q||'').trim().length>=2) navigate(`/search?q=${encodeURIComponent(q.trim())}`); }}>
            <input id="search-q" name="q" placeholder="Search posts or users..." value={q} onChange={e=>setQ(e.target.value)} />
          </form>
        </div>
        <div className="user-area top-user">
          <ThemeToggle />
          <div className="auth-links">
            {auth.user ? (
              <>
                <Link to={`/profile/${auth.user.id}`} className="user-link">
                  {
                    (() => {
                      const defaultAvatar = theme === 'light' ? '/default_avatar_pink.svg' : '/default_avatar_purple.svg';
                      return <img className="avatar-small" src={auth.user.profilePicture || defaultAvatar} alt="avatar" />;
                    })()
                  }
                  <div style={{display:'flex',flexDirection:'column',lineHeight:1}}>
                    <span style={{fontWeight:700,color:'var(--muted)'}}>{auth.user.login}</span>
                    <small style={{color:'var(--muted)'}}>{auth.user.role || 'user'}</small>
                  </div>
                </Link>
                <button onClick={onLogout} className="btn">Logout</button>
              </>
            ) : (
              <div className="auth-guest">
                <Link to="/login" className="btn ghost" style={{marginRight:8}}>Login</Link>
                <Link to="/register" className="btn primary">Register</Link>
                <span className="role-badge" style={{marginLeft:8}}>guest</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <aside className="site-sidebar compact">
        <nav className="main-nav vertical">
          <NavLink to="/" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Home</NavLink>
          {auth.user && <NavLink to="/posts/new" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Create</NavLink>}
          {/* Search is available in the top header input, remove duplicate sidebar link */}
          <NavLink to="/users" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Users</NavLink>
          <NavLink to="/about" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>About</NavLink>
          {/* Categories link removed from sidebar — categories are manageable from Create Post */}
          <NavLink to="/favorites" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Favorites</NavLink>
          {auth.user && auth.user.role === 'admin' && (
            <NavLink to="/stats" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Stats</NavLink>
          )}
        </nav>
      </aside>
    </>
  );
}
