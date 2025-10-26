import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function About(){
  const auth = useSelector(s => s.auth);
  return (
    <div className="page about-page" style={{maxWidth:800,margin:'24px auto',padding:16}}>
      <h2>About USOF Books</h2>
      <p>
        USOF Books is a friendly forum for discussing books and reading-related topics. Here you can start
        conversations about novels, share book reviews, recommend reading lists, organize informal reading
        challenges and talk about authors and genres with fellow readers.
      </p>

      <h3>What you can do</h3>
      <ul>
        <li>Start discussions about specific books, chapters or scenes.</li>
        <li>Share reviews, reading notes and recommendations.</li>
        <li>Organize or join reading challenges and subscribe to posts for updates.</li>
        <li>Follow authors, create lists of favorites and discuss themes and interpretations.</li>
      </ul>

      <h3>Registration and login</h3>
      {auth.user ? (
        <div>
          <p>You are logged in as <strong>{auth.user.login}</strong>. Go to your <Link to={`/profile/${auth.user.id}`}>profile</Link>.</p>
        </div>
      ) : (
        <div>
          <p>To take full advantage of the site, please register or log in:</p>
          <div style={{display:'flex',gap:12}}>
            <Link to="/register" className="btn">Register</Link>
            <Link to="/login" className="btn">Log in</Link>
          </div>
        </div>
      )}

      <h3>Code of conduct</h3>
      <p>Be polite, post useful content, and respect copyrights. Moderators may remove offensive or inappropriate material.</p>

  <h3>Administrator</h3>
  <p>If you have questions or need help, contact the site administrator: <Link to="/profile/1">admin</Link>.</p>
    </div>
  );
}
