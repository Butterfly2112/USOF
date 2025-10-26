import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer(){
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="brand-small">USOF Books</div>
        <div className="links">
          <Link to="/about">About</Link>
          {/* Privacy not implemented yet — removed per request */}
          {/* Contact links to the administrator's public profile (id=1) */}
          <Link to="/profile/1">Contact</Link>
        </div>
        <div className="copyright">© {new Date().getFullYear()} USOF Books — Book discussion forum</div>
      </div>
    </footer>
  );
}
