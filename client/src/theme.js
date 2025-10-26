import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext({ theme: 'dark', toggle: () => {} });

export function ThemeProvider({ children }){
  const [theme, setTheme] = useState(() => {
    try{ return localStorage.getItem('usof_theme') || 'dark' }catch(e){ return 'dark' }
  });

  useEffect(()=>{
    document.documentElement.setAttribute('data-theme', theme);
    try{ localStorage.setItem('usof_theme', theme); }catch(e){}
  }, [theme]);

  function toggle(){ setTheme(t => t === 'dark' ? 'light' : 'dark'); }

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export default ThemeProvider;
