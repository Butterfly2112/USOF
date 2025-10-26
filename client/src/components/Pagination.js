import React from 'react';

export default function Pagination({ page=1, pageSize=10, total=0, onChange }){
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pages = [];
  for (let i=1;i<=totalPages;i++) pages.push(i);
  return (
    <div className="pagination">
      {pages.map(p=> (
        <button key={p} disabled={p===page} onClick={()=>onChange(p)}>{p}</button>
      ))}
    </div>
  );
}
