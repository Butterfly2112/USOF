import React, { useContext } from 'react';
import { ThemeContext } from '../theme';

export default function ThemeToggle(){
  const { theme, toggle } = useContext(ThemeContext);
  return (
    <button onClick={toggle} aria-label="Toggle theme" title="Toggle theme" className="btn theme-toggle">
      {theme === 'dark' ? '🌙' : '🌸'}
    </button>
  );
}
