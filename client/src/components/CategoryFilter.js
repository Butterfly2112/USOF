import React, { useEffect, useState } from 'react';
import api from '../api';

export default function CategoryFilter({ onChange, value='' }){
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(value || '');

  useEffect(()=>{ api.get('/categories').then(r=>setCategories(r.data.categories)).catch(()=>{}); }, []);

  // keep local selected in sync when parent changes value
  useEffect(()=>{ setSelected(value || ''); }, [value]);

  function change(v){ setSelected(v); if (typeof onChange === 'function') onChange(v); }

  return (
    <div className="category-filter">
      <label htmlFor="category-filter-select">Category:&nbsp;</label>
      <select id="category-filter-select" name="category" value={selected} onChange={e=>change(e.target.value)}>
        <option value="">All</option>
        {categories.map(c=> (<option value={c.id} key={c.id}>{c.title}</option>))}
      </select>
    </div>
  );
}
