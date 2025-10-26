import React, { useEffect, useState } from 'react';

let pushFn = null;
export function pushToast(t){ if (pushFn) pushFn(t); }

export default function Toast(){
  const [toasts, setToasts] = useState([]);
  useEffect(()=>{ pushFn = (t) => setToasts(prev => [...prev, { id: Date.now(), ...t }]); return ()=> pushFn = null; }, []);
  useEffect(()=>{ if (toasts.length){ const to = setTimeout(()=> setToasts(t=> t.slice(1)), 4000); return ()=>clearTimeout(to); } }, [toasts]);
  return (
    <div style={{position:'fixed',right:16,top:16,zIndex:9999}}>
      {toasts.map(t=> (<div key={t.id} style={{background:'#222',color:'#fff',padding:8,borderRadius:6,marginBottom:8}}>{t.message}</div>))}
    </div>
  );
}
