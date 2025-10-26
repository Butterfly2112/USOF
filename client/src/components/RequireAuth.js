import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { hydrateAuth } from '../store/actions/authActions';

export default function RequireAuth({ children }){
  const auth = useSelector(s => s.auth);
  const dispatch = useDispatch();

  // If Redux doesn't have the user but a token/user exist in localStorage,
  // hydrate the store (so UI components get user info) and allow access.
  if (!auth.user) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('usof_token') : null;
    const user = typeof window !== 'undefined' ? localStorage.getItem('usof_user') : null;
    if (token && user) {
      // hydrate asynchronously but allow the route immediately to avoid redirect on full reload
      dispatch(hydrateAuth());
      return children;
    }
    return <Navigate to="/login" replace />;
  }
  return children;
}
