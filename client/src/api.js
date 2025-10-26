import axios from 'axios';
import { pushToast } from './components/Toast';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE || 'http://localhost:4000/api'
});

export function setAuthToken(token) {
  if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete api.defaults.headers.common['Authorization'];
}

export default api;

// Initialize token from localStorage if available
const savedToken = typeof window !== 'undefined' ? localStorage.getItem('usof_token') : null;
if (savedToken) setAuthToken(savedToken);

// Basic response interceptor: on 401 clear auth state
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response && err.response.status === 401) {
      try { localStorage.removeItem('usof_token'); localStorage.removeItem('usof_user'); } catch(e){}
      delete api.defaults.headers.common['Authorization'];
    }
    // Show error toast if available
    try{ const msg = err.response?.data?.error || err.message; pushToast({ message: msg }); }catch(e){}
    return Promise.reject(err);
  }
);
