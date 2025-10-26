import React, { useState } from 'react';
import api from '../api';
import './reaction-picker.css';

const REACTIONS = [
  { key: 'like', label: 'Like', emoji: '👍' },
  { key: 'love', label: 'Love', emoji: '❤️' },
  { key: 'wow', label: 'Wow', emoji: '😮' },
  { key: 'laugh', label: 'Haha', emoji: '😂' },
  { key: 'sad', label: 'Sad', emoji: '😢' },
  { key: 'angry', label: 'Angry', emoji: '😡' },
  { key: 'dislike', label: 'Dislike', emoji: '👎' }
];

export default function ReactionPicker({ target='posts', id, onReact }){
  const [open, setOpen] = useState(false);

  async function react(type){
    try{
      await api.post(`/`+target+`/${id}/like`, { type });
      setOpen(false);
      if (onReact) onReact();
    }catch(e){
      console.error('Reaction failed', e);
      alert('Failed to send reaction');
    }
  }

  return (
    <div className="reaction-picker">
      <button className="btn" onClick={()=>setOpen(s=>!s)}>React</button>
      {open && (
        <div className="reaction-pop">
          {REACTIONS.map(r=> (
            <button key={r.key} className="reaction-btn" title={r.label} onClick={()=>react(r.key)}>
              <span className="emoji">{r.emoji}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
